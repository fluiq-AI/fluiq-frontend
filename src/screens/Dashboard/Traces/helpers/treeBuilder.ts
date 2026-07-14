import type { TraceGroup, TraceNode, TraceRecord } from "../utils/types"
import { getEventTimestamp, getStr, isBlocked, isFailed } from "../utils"

export function countSubtree(n: TraceNode): number {
  let total = 1
  for (const c of n.children) total += countSubtree(c)
  return total
}

// Sum a node's own cost with every descendant's cost. Returns null when the
// entire subtree has no priced traces (so the caller can render an em-dash
// instead of "$0.00", which would falsely imply a free run).
export function sumSubtreeCost(n: TraceNode): number | null {
  let total = 0
  let hasAny = false
  const own = n.trace.cost
  if (typeof own === "number" && Number.isFinite(own)) {
    total += own
    hasAny = true
  }
  for (const c of n.children) {
    const child = sumSubtreeCost(c)
    if (child !== null) {
      total += child
      hasAny = true
    }
  }
  return hasAny ? total : null
}

// Pick the lowest evaluation score on a trace — quality is summarized by its
// weakest signal so a single failing metric isn't masked by passing ones.
export function minTraceScore(t: TraceRecord): number | null {
  const evals = t.evaluations
  if (!evals || evals.length === 0) return null
  let lo: number | null = null
  for (const e of evals) {
    if (e.evaluator === "fluiq.security") continue
    if (typeof e.score !== "number" || !Number.isFinite(e.score)) continue
    if (lo === null || e.score < lo) lo = e.score
  }
  return lo
}

// Walk the subtree and pick the lowest evaluation score across any node.
// Returns null when no descendant has any evaluation.
export function minSubtreeScore(n: TraceNode): number | null {
  let lo = minTraceScore(n.trace)
  for (const c of n.children) {
    const child = minSubtreeScore(c)
    if (child === null) continue
    if (lo === null || child < lo) lo = child
  }
  return lo
}

export function hasFailedDescendant(n: TraceNode): boolean {
  for (const c of n.children) {
    if (isFailed(c.trace.event)) return true
    if (hasFailedDescendant(c)) return true
  }
  return false
}

export function hasBlockedDescendant(n: TraceNode): boolean {
  for (const c of n.children) {
    if (isBlocked(c.trace.event)) return true
    if (hasBlockedDescendant(c)) return true
  }
  return false
}

export function findGroupForTrace(
  groups: TraceGroup[],
  trace: TraceRecord,
): TraceGroup | null {
  const tid = getStr(trace.event, "trace_id")
  for (const g of groups) {
    if (nodeContains(g.root, tid, trace)) return g
  }
  return null
}

export function nodeContains(
  node: TraceNode,
  tid: string | null,
  trace: TraceRecord,
): boolean {
  if (tid && node.id === tid) return true
  if (node.trace === trace) return true
  for (const c of node.children) {
    if (nodeContains(c, tid, trace)) return true
  }
  return false
}

export function findTraceNodeInTree(
  node: TraceNode,
  trace: TraceRecord,
): TraceNode | null {
  if (node.trace === trace) return node
  for (const c of node.children) {
    const found = findTraceNodeInTree(c, trace)
    if (found) return found
  }
  return null
}

// A GoogleADK `agent` trace. Every ADK agent — LlmAgent, LoopAgent,
// SequentialAgent, ParallelAgent, … — emits one of these via the plugin's
// before_/after_agent_callback. The `function` field carries the stable
// agent name (e.g. "writer", "critic", "revision_loop").
export function isGoogleAdkAgent(event: Record<string, unknown>): boolean {
  return (
    getStr(event, "integration") === "GOOGLEADK" &&
    getStr(event, "type") === "agent"
  )
}

// Distinguishes a leaf LlmAgent from a wrapper agent (LoopAgent /
// SequentialAgent / ParallelAgent). A wrapper has child agent traces; a
// leaf's children are llm/tool spans. Only leaves are collapsed into a
// single visual box per name — wrappers must still be recursed into so
// their sub-agents render.
export function isGoogleAdkLeafAgent(node: TraceNode): boolean {
  if (!isGoogleAdkAgent(node.trace.event)) return false
  for (const c of node.children) {
    if (isGoogleAdkAgent(c.trace.event)) return false
  }
  return true
}

// Build a forest of trace trees. A trace becomes a child of another when its
// parent_id resolves to a trace_id present in the loaded set; otherwise it is
// a root. Roots that share an unloaded parent_id (the common "agent run was
// not @trace-decorated, but the integration emitted a shared parent_id" case)
// are merged into a single group keyed by that parent_id, with the earliest
// sibling promoted as the visible root row and the others nested under it.
export function buildTraceTree(traces: TraceRecord[]): TraceGroup[] {
  const tidOf = (t: TraceRecord): string | null =>
    typeof t.event["trace_id"] === "string"
      ? (t.event["trace_id"] as string)
      : null
  const pidOf = (t: TraceRecord): string | null =>
    typeof t.event["parent_id"] === "string"
      ? (t.event["parent_id"] as string)
      : null

  const byTid = new Map<string, TraceRecord>()
  for (const t of traces) {
    const tid = tidOf(t)
    if (tid) byTid.set(tid, t)
  }

  const childrenOf = new Map<string, TraceRecord[]>()
  const orphanByPid = new Map<string, TraceRecord[]>()
  const standaloneRoots: TraceRecord[] = []

  for (const t of traces) {
    const tid = tidOf(t)
    const pid = pidOf(t)
    // A self-referential parent_id (parent_id == trace_id, e.g. CrewAI's crew
    // span) is not a real parent. Treat it as no parent so the span becomes a
    // group root — otherwise it's filed as a child of itself, never forms a
    // group, and the drawer shows "Architecture is unavailable".
    const hasParent = pid !== null && pid !== tid
    if (hasParent && byTid.has(pid)) {
      const list = childrenOf.get(pid) ?? []
      list.push(t)
      childrenOf.set(pid, list)
    } else if (hasParent) {
      const list = orphanByPid.get(pid) ?? []
      list.push(t)
      orphanByPid.set(pid, list)
    } else {
      standaloneRoots.push(t)
    }
  }

  let solo = 0
  function buildNode(t: TraceRecord, seen: Set<string> = new Set()): TraceNode {
    const tid = tidOf(t)
    if (tid) seen.add(tid)
    // Guard against parent-chain cycles (self-parent or A→B→A): never recurse
    // into a trace already on the current path, so a bad parent_id can't cause
    // an infinite loop / stack overflow.
    const childTraces = (tid ? (childrenOf.get(tid) ?? []) : []).filter((c) => {
      const ctid = tidOf(c)
      return ctid === null || !seen.has(ctid)
    })
    childTraces.sort((a, b) => getEventTimestamp(a) - getEventTimestamp(b))
    return {
      id: tid ?? `__node_${solo++}__`,
      trace: t,
      children: childTraces.map((c) => buildNode(c, seen)),
    }
  }

  function countNodes(n: TraceNode): number {
    let total = 1
    for (const c of n.children) total += countNodes(c)
    return total
  }

  function maxTimestamp(n: TraceNode): number {
    // Use ingested_at for the root (reflects when this group became visible to
    // the client) and event timestamp for descendants so real LLM timing wins.
    const rootMs = Date.parse(n.trace.ingested_at)
    let m = Number.isNaN(rootMs) ? getEventTimestamp(n.trace) : rootMs / 1000
    for (const c of n.children) {
      const cm = getEventTimestamp(c.trace)
      if (cm > m) m = cm
    }
    return m
  }

  const groups: TraceGroup[] = []

  for (const t of standaloneRoots) {
    const root = buildNode(t)
    groups.push({ group_id: root.id, root, count: countNodes(root) })
  }

  for (const [pid, list] of orphanByPid) {
    list.sort((a, b) => getEventTimestamp(a) - getEventTimestamp(b))
    const primary = list[0]
    const primaryNode = buildNode(primary)
    if (list.length === 1) {
      groups.push({
        group_id: pid,
        root: primaryNode,
        count: countNodes(primaryNode),
      })
      continue
    }
    // Multiple siblings sharing an unloaded parent_id: nest the rest under the
    // primary so the user sees a single grouped row, then expandable siblings.
    const siblingNodes = list.slice(1).map((t) => buildNode(t))
    const merged: TraceNode = {
      id: pid,
      trace: primary,
      children: [...primaryNode.children, ...siblingNodes],
    }
    groups.push({ group_id: pid, root: merged, count: countNodes(merged) })
  }

  groups.sort((a, b) => maxTimestamp(b.root) - maxTimestamp(a.root))
  return groups
}
