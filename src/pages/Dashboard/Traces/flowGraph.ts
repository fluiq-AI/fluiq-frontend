import dagre from "@dagrejs/dagre"
import {
  Brain01Icon,
  CloudServerIcon,
  CodeIcon,
  Database01Icon,
  File01Icon,
  Folder01Icon,
  SortByDown01Icon,
  Wrench01Icon,
  WorkflowSquare01Icon,
} from "@hugeicons/core-free-icons"
import { Position, type Edge as RFEdge, type Node as RFNode } from "@xyflow/react"

import { FLOW_NODE_HEIGHT, FLOW_NODE_WIDTH } from "./constants"
import { extractMcpServers, extractTokens } from "./extractors"
import type { TokenUsage, TraceGroup, TraceNode, TraceRecord } from "./types"
import { isGoogleAdkAgent, isGoogleAdkLeafAgent } from "./treeBuilder"
import {
  extractTooltipIO,
  getLanggraphNode,
  getStr,
  isFailed,
  isRunning,
} from "./utils"

export type FlowNodeData = {
  label: string
  sublabel: string | null
  icon: typeof Folder01Icon
  failed: boolean
  running: boolean
  selected: boolean
  count: number
  request: string | null
  response: string | null
  tokens: TokenUsage | null
  suppressTooltip: boolean
  onSelect: () => void
}

export type TraceFlowNode = RFNode<FlowNodeData, "trace">

export function layoutFlowNodes(
  nodes: TraceFlowNode[],
  edges: RFEdge[],
): TraceFlowNode[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "TB", nodesep: 24, ranksep: 56 })
  for (const n of nodes) {
    g.setNode(n.id, { width: FLOW_NODE_WIDTH, height: FLOW_NODE_HEIGHT })
  }
  for (const e of edges) {
    // Skip loop-back edges so dagre's top-down ranking is driven purely by
    // forward execution flow; the loop-back edge is purely visual.
    if (e.sourceHandle === "loop-source") continue
    g.setEdge(e.source, e.target)
  }
  dagre.layout(g)
  return nodes.map((n) => {
    const pos = g.node(n.id)
    return {
      ...n,
      position: {
        x: pos.x - FLOW_NODE_WIDTH / 2,
        y: pos.y - FLOW_NODE_HEIGHT / 2,
      },
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
    }
  })
}

function shouldSequenceChildren(node: TraceNode): boolean {
  if (node.children.length < 2) return false
  const ev = node.trace.event
  const type = getStr(ev, "type")
  if (type !== "chain" && type !== "agent") return false
  const fn = getStr(ev, "function") ?? ""
  // Don't auto-sequence runnables that explicitly fan out children in parallel.
  if (/parallel|map|branch/i.test(fn)) return false
  return true
}

function anyDescendantIsLanggraphNode(node: TraceNode): boolean {
  for (const c of node.children) {
    if (getLanggraphNode(c.trace.event)) return true
    if (anyDescendantIsLanggraphNode(c)) return true
  }
  return false
}

function collectTopmostLanggraphNodes(
  node: TraceNode,
  out: TraceNode[],
): void {
  for (const c of node.children) {
    if (getLanggraphNode(c.trace.event)) {
      out.push(c)
    } else {
      collectTopmostLanggraphNodes(c, out)
    }
  }
}

function summarizeLgInner(node: TraceNode): string | null {
  // The LG-tagged span (e.g. the `answer` chain wrapper) is opaque in the
  // graph, but we want to surface what runs inside it (the model name for an
  // LLM-backed node, the tool names for a `tools` node) as a sublabel so the
  // box conveys "what happens here" without expanding it.
  let model: string | null = null
  const tools: string[] = []
  const seen = new Set<string>()
  const walk = (n: TraceNode) => {
    for (const c of n.children) {
      const ev = c.trace.event
      const t = getStr(ev, "type")
      if (t === "llm" && model === null) {
        model = getStr(ev, "model")
      } else if (t === "tool") {
        const fn = getStr(ev, "function")
        if (fn && !seen.has(fn)) {
          seen.add(fn)
          tools.push(fn)
        }
      }
      walk(c)
    }
  }
  walk(node)
  if (model && tools.length > 0) return `${model} \u00B7 ${tools.join(", ")}`
  if (model) return model
  if (tools.length > 0) return tools.join(", ")
  return null
}

function describeNode(node: TraceNode): {
  label: string
  sublabel: string | null
  icon: typeof Folder01Icon
} {
  const ev = node.trace.event
  const type = getStr(ev, "type")
  const fn = getStr(ev, "function")
  const model = getStr(ev, "model")
  const integration = getStr(ev, "integration")
  const lgNode = getLanggraphNode(ev)
  const hasChildren = node.children.length > 0

  if (lgNode) {
    const inner = summarizeLgInner(node)
    return {
      label: lgNode,
      sublabel: inner ?? model ?? fn ?? integration,
      icon: WorkflowSquare01Icon,
    }
  }
  if (type === "agent" || type === "chain") {
    return {
      label: fn ?? (type === "agent" ? "Agent" : "Chain"),
      sublabel: model ?? integration,
      icon: hasChildren ? Folder01Icon : Brain01Icon,
    }
  }
  if (type === "tool") {
    return {
      label: fn ?? "Tool",
      sublabel: integration,
      icon: Wrench01Icon,
    }
  }
  if (type === "llm") {
    return {
      label: model ?? fn ?? "LLM call",
      sublabel: integration,
      icon: Brain01Icon,
    }
  }
  if (type === "cache") {
    // Cache spans emitted by EmbeddingCache / PromptCache / DocumentCache /
    // ToolCache via auto_optimize(). Surface the kind ("embedding",
    // "prompt", "document", "tool") and a hit/miss summary so the box
    // conveys the cache outcome at a glance without expanding it.
    const kind = getStr(ev, "cache_kind")
    const hits = ev["cache_hits"]
    const misses = ev["cache_misses"]
    const size = ev["cache_size"]
    let outcome: string | null = null
    if (typeof hits === "number" && typeof misses === "number") {
      const total =
        typeof size === "number" && Number.isFinite(size) ? size : hits + misses
      if (total > 0) {
        if (misses === 0) outcome = `hit (${hits}/${total})`
        else if (hits === 0) outcome = `miss (${misses}/${total})`
        else outcome = `${hits}/${total} hit`
      }
    }
    const label = kind ? `${kind} cache` : "Cache"
    const sublabel = outcome ?? (model ?? null)
    return { label, sublabel, icon: Database01Icon }
  }
  if (type === "rerank") {
    // Rerank spans emitted by TracedReranker around BM25 / cross-encoder /
    // hybrid / MMR. Surface reranker name and the candidate count change
    // (e.g. "20 -> 5") so the box reads as the reranking step it is.
    const reranker = getStr(ev, "reranker") ?? fn ?? "rerank"
    const inN = ev["input_count"]
    const outN = ev["output_count"]
    let sublabel: string | null = null
    if (typeof inN === "number" && typeof outN === "number") {
      sublabel = `${inN} \u2192 ${outN}`
    }
    return { label: reranker, sublabel, icon: SortByDown01Icon }
  }
  if (type === "function" || fn) {
    return {
      label: fn ?? "Function",
      sublabel: integration,
      icon: hasChildren ? Folder01Icon : CodeIcon,
    }
  }
  return {
    label: integration ?? "Trace",
    sublabel: model,
    icon: hasChildren ? Folder01Icon : File01Icon,
  }
}

// Aggregate every `llm` event in the subtree into a single START NODE summary:
// concatenate per-call inputs/outputs (tagged when there is more than one) so
// the hover tooltip shows the full conversation across iterations and child
// agents, and sum prompt/completion/total token counts so the START NODE can
// surface the trace's total cost without the user having to click into each
// LLM box. Returns nulls when the subtree contains no LLM events.
function aggregateLlmStats(node: TraceNode): {
  request: string | null
  response: string | null
  tokens: TokenUsage | null
} {
  const reqs: string[] = []
  const ress: string[] = []
  let prompt = 0
  let completion = 0
  let total = 0
  let any = false
  let count = 0
  const walk = (n: TraceNode) => {
    if (getStr(n.trace.event, "type") === "llm") {
      count += 1
      const io = extractTooltipIO(n.trace.event)
      if (io.request !== null) reqs.push(io.request)
      if (io.response !== null) ress.push(io.response)
      const tk = extractTokens(n.trace.event)
      if (tk) {
        if (typeof tk.prompt === "number") {
          prompt += tk.prompt
          any = true
        }
        if (typeof tk.completion === "number") {
          completion += tk.completion
          any = true
        }
        if (typeof tk.total === "number") {
          total += tk.total
          any = true
        }
      }
    }
    for (const c of n.children) walk(c)
  }
  walk(node)
  const tag = (i: number): string => (count > 1 ? `#${i + 1}\n` : "")
  const request =
    reqs.length > 0 ? reqs.map((r, i) => `${tag(i)}${r}`).join("\n\n") : null
  const response =
    ress.length > 0 ? ress.map((r, i) => `${tag(i)}${r}`).join("\n\n") : null
  let tokens: TokenUsage | null = null
  if (any) {
    const fallbackTotal = prompt + completion
    tokens = {
      prompt: prompt > 0 ? prompt : undefined,
      completion: completion > 0 ? completion : undefined,
      total:
        total > 0 ? total : fallbackTotal > 0 ? fallbackTotal : undefined,
    }
  }
  return { request, response, tokens }
}

export function buildFlowElements(
  group: TraceGroup,
  selectedNodeId: string | null,
  onSelectTrace: (t: TraceRecord) => void,
): { nodes: TraceFlowNode[]; edges: RFEdge[] } {
  type ViewOverride = {
    label: string
    sublabel: string | null
    icon: typeof Folder01Icon
  }
  type StartStats = {
    request: string | null
    response: string | null
    tokens: TokenUsage | null
  }
  type Bucket = {
    first: TraceNode
    latest: TraceNode
    failed: boolean
    running: boolean
    count: number
    traceIds: Set<string>
    iterations: TraceNode[]
    view?: ViewOverride
    startStats?: StartStats
  }
  const buckets = new Map<string, Bucket>()
  const order: string[] = []
  const orderIndex = new Map<string, number>()
  const edgeKeys = new Set<string>()
  const edges: RFEdge[] = []

  const recordNode = (
    flowId: string,
    t: TraceNode,
    view?: ViewOverride,
  ) => {
    let b = buckets.get(flowId)
    if (!b) {
      b = {
        first: t,
        latest: t,
        failed: false,
        running: false,
        count: 0,
        traceIds: new Set(),
        iterations: [],
        view,
      }
      buckets.set(flowId, b)
      orderIndex.set(flowId, order.length)
      order.push(flowId)
    }
    if (b.traceIds.has(t.id)) return
    b.latest = t
    b.count += 1
    b.traceIds.add(t.id)
    b.iterations.push(t)
    if (isFailed(t.trace.event)) b.failed = true
    // The latest iteration's status drives the visual: a node that retried
    // after a failure and is running again should show the spinner, not the
    // red border. Failed remains sticky (set above) so a fully-failed node
    // still surfaces its error indicator after the run completes.
    b.running = isRunning(b.latest.trace.event)
  }

  const recordEdge = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    const key = `${sourceId}->${targetId}`
    if (edgeKeys.has(key)) return
    edgeKeys.add(key)
    const sIdx = orderIndex.get(sourceId) ?? -1
    const tIdx = orderIndex.get(targetId) ?? -1
    const isLoopback = tIdx >= 0 && sIdx >= 0 && tIdx < sIdx
    edges.push({
      id: key,
      source: sourceId,
      target: targetId,
      // Loop-back edges route through right-side handles so they don't
      // overlap the forward edge between the same two nodes.
      sourceHandle: isLoopback ? "loop-source" : undefined,
      targetHandle: isLoopback ? "loop-target" : undefined,
      type: "smoothstep",
      animated: isLoopback,
      style: isLoopback
        ? { strokeDasharray: "5 4", stroke: "var(--color-primary)" }
        : undefined,
    })
  }

  // A flow node id collapses repeated executions of the same logical step
  // into one visual box so iterations become loop-back edges instead of
  // duplicate boxes. LangGraph keys by `langgraph_node`; GoogleADK keys by
  // the agent's stable `function` name (so each iteration of writer/critic
  // inside a LoopAgent merges).
  const flowIdFor = (node: TraceNode, scope: string): string => {
    const ev = node.trace.event
    const lg = getLanggraphNode(ev)
    if (lg) return `lg:${scope}:${lg}`
    if (isGoogleAdkAgent(ev)) {
      const fn = getStr(ev, "function")
      if (fn) return `gadk:${scope}:${fn}`
    }
    return node.id
  }

  // A LangGraph `tools` node runs one or more concrete tool calls per
  // invocation; merging every invocation under a single `tools` box hides
  // the fact that different tools were used. When an LG node contains tool
  // descendants we surface the tools themselves as the visual nodes,
  // bucketed by tool function name so two `get_weather` calls still merge
  // but `get_weather` and `get_population` render as separate boxes.
  const expandLgForFlow = (
    lgNode: TraceNode,
    scope: string,
  ): { node: TraceNode; flowId: string }[] => {
    const tools: TraceNode[] = []
    const walk = (n: TraceNode) => {
      for (const c of n.children) {
        if (getStr(c.trace.event, "type") === "tool") tools.push(c)
        else walk(c)
      }
    }
    walk(lgNode)
    if (tools.length === 0) {
      return [{ node: lgNode, flowId: flowIdFor(lgNode, scope) }]
    }
    return tools.map((t) => {
      const fn = getStr(t.trace.event, "function") ?? t.id
      return { node: t, flowId: `tool:${scope}:${fn}` }
    })
  }

  // A GoogleADK leaf LlmAgent is rendered as a single opaque box (so that
  // LoopAgent iterations collapse into one), but its tool calls are still
  // meaningful and should appear as their own flow nodes. Walk the agent's
  // tool descendants and emit one flow node per unique tool function,
  // bucketed under the agent's flow id so iterations across a LoopAgent
  // merge into one tool box per name rather than spawning duplicates.
  const expandGadkLeafTools = (
    agentNode: TraceNode,
    agentFlowId: string,
  ): void => {
    const walk = (n: TraceNode) => {
      for (const c of n.children) {
        if (getStr(c.trace.event, "type") === "tool") {
          const fn = getStr(c.trace.event, "function") ?? c.id
          const toolFlowId = `gadktool:${agentFlowId}:${fn}`
          recordNode(toolFlowId, c)
          recordEdge(agentFlowId, toolFlowId)
        } else {
          walk(c)
        }
      }
    }
    walk(agentNode)
  }

  // MCP servers used by an LLM call live as metadata on the LLM event itself
  // (Anthropic `mcp_servers=`, OpenAI Responses `tools=[{type:"mcp",...}]`,
  // Gemini sessions). They are not separate trace events, so they would be
  // invisible in the architecture view despite being meaningful integration
  // points. Surface each unique MCP server (by name) as its own flow node
  // attached to the visible parent — mirroring how tools are rendered. For
  // opaque containers (LangGraph node, GoogleADK leaf agent) we walk the
  // entire subtree so MCP servers used inside the opaque box still surface;
  // for transparent nodes we only inspect the node itself since descendants
  // get their own visit and would otherwise double-emit.
  const expandMcpServers = (
    node: TraceNode,
    parentFlowId: string,
    includeSubtree: boolean,
  ): void => {
    const seen = new Set<string>()
    const visitForMcp = (n: TraceNode) => {
      for (const s of extractMcpServers(n.trace.event)) {
        if (seen.has(s.name)) continue
        seen.add(s.name)
        const flowId = `mcp:${parentFlowId}:${s.name}`
        const synthetic: TraceNode = {
          id: `${n.id}__mcp__${s.name}`,
          trace: n.trace,
          children: [],
        }
        const sublabelParts: string[] = []
        if (s.url) sublabelParts.push(s.url)
        else if (s.type) sublabelParts.push(s.type)
        if (s.tools && s.tools.length > 0) {
          sublabelParts.push(`${s.tools.length} tool${s.tools.length === 1 ? "" : "s"}`)
        }
        recordNode(flowId, synthetic, {
          label: s.name,
          sublabel: sublabelParts.length > 0 ? sublabelParts.join(" \u2022 ") : "MCP",
          icon: CloudServerIcon as typeof Folder01Icon,
        })
        recordEdge(parentFlowId, flowId)
      }
      if (includeSubtree) {
        for (const c of n.children) visitForMcp(c)
      }
    }
    visitForMcp(node)
  }

  const visit = (
    node: TraceNode,
    parentFlowId: string | null,
    parentScope: string,
  ) => {
    const ev = node.trace.event
    const isLg = getLanggraphNode(ev) !== null
    const isGadkLeaf = isGoogleAdkLeafAgent(node)
    const type = getStr(ev, "type")
    const myFlowId = flowIdFor(node, parentScope)
    recordNode(myFlowId, node)
    if (parentFlowId !== null) recordEdge(parentFlowId, myFlowId)

    // A LangGraph node is opaque: its descendants (the LLM call inside an
    // `agent` node, the tool span inside a `tools` node) inherit the same
    // langgraph_node metadata and would otherwise spawn duplicate boxes.
    // Render the LG span itself and stop — its IO/latency are already on the
    // span, surfaced via the drawer when the user clicks the box.
    if (isLg) {
      expandMcpServers(node, myFlowId, true)
      return
    }

    // A GoogleADK LlmAgent is opaque for the same reason: each iteration of
    // a LoopAgent emits a fresh LLM (and possibly tool) child trace. Without
    // this short-circuit, a 3-iteration writer/critic loop would spawn three
    // distinct LLM boxes per agent instead of merging them into the writer
    // and critic boxes themselves. Per-iteration LLM IO is rolled up into
    // the agent box's tooltip and the drawer; tool descendants are surfaced
    // as their own flow nodes (bucketed by tool function name) so users can
    // see which tools the agent invoked.
    if (isGadkLeaf) {
      expandGadkLeafTools(node, myFlowId)
      expandMcpServers(node, myFlowId, true)
      return
    }

    // MCP servers attached directly to this node's event (e.g. a standalone
    // Anthropic/OpenAI Responses LLM call). Descendants will be visited
    // separately and surface their own MCP servers under their own boxes.
    expandMcpServers(node, myFlowId, false)

    // LangGraph wrapper: a chain/agent whose descendants carry langgraph_node
    // tags. Pregel inserts one RunnableSequence wrapper per iteration between
    // the compiled graph and the actual nodes; we skip those wrappers and
    // pull every topmost langgraph_node descendant directly under this box,
    // sequencing them in execution order so repeated iterations collapse
    // into loop-back edges instead of stacking sibling boxes.
    if (
      (type === "chain" || type === "agent") &&
      anyDescendantIsLanggraphNode(node)
    ) {
      const lgChildren: TraceNode[] = []
      collectTopmostLanggraphNodes(node, lgChildren)
      let prevFlowId = myFlowId
      for (const c of lgChildren) {
        for (const exp of expandLgForFlow(c, myFlowId)) {
          recordNode(exp.flowId, exp.node)
          recordEdge(prevFlowId, exp.flowId)
          prevFlowId = exp.flowId
        }
      }
      return
    }

    const children = node.children
    if (children.length === 0) return
    const childScope = myFlowId

    if (shouldSequenceChildren(node)) {
      // Sequence children in execution order; repeated logical ids dedupe
      // into loop-back edges. Children are already timestamp-sorted in
      // buildTraceTree so iteration order matches execution order.
      let prevFlowId = myFlowId
      for (const c of children) {
        const cFlowId = flowIdFor(c, childScope)
        recordNode(cFlowId, c)
        recordEdge(prevFlowId, cFlowId)
        prevFlowId = cFlowId
        if (getLanggraphNode(c.trace.event)) {
          expandMcpServers(c, cFlowId, true)
          continue
        }
        if (isGoogleAdkLeafAgent(c)) {
          expandGadkLeafTools(c, cFlowId)
          expandMcpServers(c, cFlowId, true)
          continue
        }
        for (const gc of c.children) visit(gc, cFlowId, cFlowId)
      }
      return
    }

    for (const c of children) visit(c, myFlowId, childScope)
  }
  visit(group.root, null, group.root.id)

  // Surface a "START NODE" at the top of the flow that aggregates the trace's
  // cross-cutting summary (every LLM call's request/response and the total
  // token usage). LangGraph and chain/agent-rooted integrations (GoogleADK,
  // CrewAI, LlamaIndex, ...) already have a wrapper at the top of the tree,
  // so we attach the start metadata to that bucket and relabel it. Standalone
  // LLM integrations (Anthropic, OpenAI, Gemini called directly without a
  // chain/agent wrapper) have an `llm` event as the root; for those we
  // synthesize a START NODE flow node and parent the real root under it so
  // the visual treatment matches across integrations.
  if (order.length > 0) {
    const rootEv = group.root.trace.event
    const rootType = getStr(rootEv, "type")
    const rootIntegration = getStr(rootEv, "integration")
    const stats = aggregateLlmStats(group.root)
    if (rootType === "chain" || rootType === "agent") {
      const rootBucket = buckets.get(order[0])
      if (rootBucket) rootBucket.startStats = stats
    } else {
      const startFlowId = "__start__"
      const startBucket: Bucket = {
        first: group.root,
        latest: group.root,
        failed: false,
        running: isRunning(group.root.trace.event),
        count: 1,
        traceIds: new Set([group.root.id]),
        iterations: [group.root],
        view: {
          label: "START NODE",
          sublabel: rootIntegration,
          icon: WorkflowSquare01Icon,
        },
        startStats: stats,
      }
      buckets.set(startFlowId, startBucket)
      // Prepend so the START NODE renders at the top of the flow; shift every
      // existing entry's order index by one and link to the previous root.
      order.unshift(startFlowId)
      orderIndex.clear()
      order.forEach((id, i) => orderIndex.set(id, i))
      const firstRealId = order[1]
      const edgeKey = `${startFlowId}->${firstRealId}`
      if (!edgeKeys.has(edgeKey)) {
        edgeKeys.add(edgeKey)
        edges.push({
          id: edgeKey,
          source: startFlowId,
          target: firstRealId,
          type: "smoothstep",
        })
      }
    }
  }

  const nodes: TraceFlowNode[] = order.map((flowId) => {
    const b = buckets.get(flowId)!
    const view = b.view ?? describeNode(b.first)
    // START NODE buckets carry pre-aggregated stats (every LLM call's IO
    // concatenated, total tokens summed) so the tooltip shows the trace's
    // overall summary instead of just the wrapper span's own IO.
    const isStart = b.startStats !== undefined
    const reqParts: string[] = []
    const resParts: string[] = []
    let tokens: TokenUsage | null = null
    if (isStart && b.startStats) {
      if (b.startStats.request !== null) reqParts.push(b.startStats.request)
      if (b.startStats.response !== null) resParts.push(b.startStats.response)
      tokens = b.startStats.tokens
    } else if (b.view === undefined) {
      // Append every iteration's IO so loops surface each call instead of
      // hiding all but the latest behind the merged box. Synthetic nodes
      // (e.g. MCP servers) suppress this since their iterations all wrap the
      // same underlying LLM trace and would just duplicate that trace's IO.
      const multi = b.iterations.length > 1
      b.iterations.forEach((it, iIdx) => {
        const io = extractTooltipIO(it.trace.event)
        const tag = multi ? `#${iIdx + 1}\n` : ""
        if (io.request !== null) reqParts.push(`${tag}${io.request}`)
        if (io.response !== null) resParts.push(`${tag}${io.response}`)
      })
    }
    const request = reqParts.length > 0 ? reqParts.join("\n\n") : null
    const response = resParts.length > 0 ? resParts.join("\n\n") : null
    const label = isStart ? "START NODE" : view.label
    return {
      id: flowId,
      type: "trace",
      position: { x: 0, y: 0 },
      width: FLOW_NODE_WIDTH,
      height: FLOW_NODE_HEIGHT,
      data: {
        label,
        sublabel: view.sublabel,
        icon: view.icon,
        failed: b.failed,
        running: b.running && !b.failed,
        count: b.count,
        selected:
          selectedNodeId !== null && b.traceIds.has(selectedNodeId),
        request,
        response,
        tokens,
        suppressTooltip: false,
        onSelect: () => onSelectTrace(b.latest.trace),
      },
    }
  })
  return { nodes, edges }
}
