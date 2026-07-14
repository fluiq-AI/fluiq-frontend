import type { TraceRecord } from "./types"

export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function summarize(event: Record<string, unknown>): string {
  try {
    return JSON.stringify(event, null, 2)
  } catch {
    return String(event)
  }
}

export function getStr(event: Record<string, unknown>, key: string): string | null {
  const v = event[key]
  if (typeof v === "string" && v.length > 0) return v
  return null
}

// Strip Vertex AI resource-path prefixes down to the bare model id, e.g.
// "publishers/google/models/gemini-2.5-flash" → "gemini-2.5-flash" (and the
// fully-qualified "projects/<p>/locations/<l>/publishers/google/models/..."
// form). New traces are normalised at ingest, but already-stored traces still
// carry the prefixed name, so the UI normalises on read. No real model id
// contains "/models/" or a leading "models/", so this is safe for all
// providers; non-prefixed names pass through unchanged.
export function normalizeModelName<T>(model: T): T | string {
  if (typeof model !== "string") return model
  if (model.includes("/models/")) return model.slice(model.lastIndexOf("/models/") + "/models/".length)
  if (model.startsWith("models/")) return model.slice("models/".length)
  return model
}

// Convenience: read a trace event's model already normalised for display.
export function getModel(event: Record<string, unknown>): string | null {
  const m = getStr(event, "model")
  return m === null ? null : (normalizeModelName(m) as string)
}

// Stable identity for a selected embedded tool: the parent LLM's trace_id (or
// its tree-node id as a fallback) plus the tool name. Built identically at the
// click site and the highlight site so selection state lines up across views.
export function toolSelectionKey(
  parentEvent: Record<string, unknown>,
  fallbackId: string,
  name: string,
): string {
  const tid = getStr(parentEvent, "trace_id") ?? fallbackId
  return `${tid}::${name}`
}

export function getLanggraphNode(event: Record<string, unknown>): string | null {
  const lg = event["langgraph"]
  if (!lg || typeof lg !== "object") return null
  const node = (lg as Record<string, unknown>)["langgraph_node"]
  if (typeof node === "string" && node.length > 0) return node
  return null
}

// Static predecessor node names (the graph's declared edges into this node),
// stamped by the SDK at compile time. Drives the real DAG in the flow graph —
// both fan-in (join) and fan-out edges. Empty when the only predecessor is the
// graph START.
export function getLanggraphPredecessors(event: Record<string, unknown>): string[] {
  const lg = event["langgraph"]
  if (!lg || typeof lg !== "object") return []
  const preds = (lg as Record<string, unknown>)["predecessors"]
  if (!Array.isArray(preds)) return []
  return preds.filter((p): p is string => typeof p === "string" && p.length > 0)
}

// Declared predecessor run_ids (trace_ids of upstream nodes), stamped by the
// SDK on CrewAI tasks (task.context) and GoogleADK agents (instruction state
// keys). Unlike LangGraph's name-based predecessors, these are run_ids resolved
// against a trace_id -> flow-node map, so they draw the DAG (fan-in joins AND
// single-dependency fan-out edges) for those frameworks.
export function getPredecessors(event: Record<string, unknown>): string[] {
  const preds = event["predecessors"]
  if (!Array.isArray(preds)) return []
  return preds.filter((p): p is string => typeof p === "string" && p.length > 0)
}

export function isFailed(event: Record<string, unknown>): boolean {
  // ClickHouse's JSON type normalises boolean false → 0, so accept both.
  const notSuccessful = event["success"] === false || event["success"] === 0
  return notSuccessful && event["status"] !== "blocked"
}

export function isBlocked(event: Record<string, unknown>): boolean {
  return event["status"] === "blocked"
}

// True while the trace is in-flight (placeholder pushed by trace.started SSE).
// The completion event will replace the row in state, dropping ``status`` so
// any later read returns false.
export function isRunning(event: Record<string, unknown>): boolean {
  return event["status"] === "running"
}

export function isContentEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === "string") return value.length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

export function formatDate(iso: string): string {
  // All server timestamps are UTC. Append Z if no timezone offset is present
  // so browsers parse them as UTC rather than local time before converting.
  const src = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z"
  const d = new Date(src)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function formatLatency(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "\u2014"
  if (value < 1) return `${Math.round(value * 1000)}ms`
  return `${value.toFixed(2)}s`
}

// Render a USD-denominated cost compactly: sub-cent values are shown with up
// to 6 decimals so token-level pricing stays visible, larger amounts collapse
// to standard 2-decimal currency formatting.
export function formatCost(
  value: unknown,
  currency: string | null | undefined = "USD",
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "\u2014"
  const code = (currency || "USD").toUpperCase()
  const symbol = code === "USD" ? "$" : ""
  if (value === 0) return `${symbol}0.00`
  if (value < 0.01) return `${symbol}${value.toFixed(6)}`
  if (value < 1) return `${symbol}${value.toFixed(4)}`
  return `${symbol}${value.toFixed(2)}`
}

// Score-band styling shared by the table cell and the drawer pills. Returns
// tailwind classes for the bg/text combo plus a textual band label.
export function scoreBandClass(score: number | null | undefined): string {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "bg-muted text-muted-foreground"
  }
  if (score >= 0.8) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
  if (score >= 0.5) return "bg-amber-500/15 text-amber-600 dark:text-amber-400"
  return "bg-destructive/15 text-destructive"
}

export function formatScore(score: number | null | undefined): string {
  if (typeof score !== "number" || !Number.isFinite(score)) return "\u2014"
  return score.toFixed(2)
}

// Compact stringification used by the node tooltip overlay; the drawer still
// renders the full structured view.
export function summarizeForTooltip(value: unknown, max = 600): string | null {
  if (value === undefined || value === null) return null
  let s: string
  if (typeof value === "string") s = value
  else s = safeStringify(value)
  if (s.length === 0) return null
  if (s.length > max) s = s.slice(0, max) + "\u2026"
  return s
}

export function extractTooltipIO(
  event: Record<string, unknown>,
): { request: string | null; response: string | null } {
  const requestSource =
    event["input"] ?? event["messages"] ?? event["prompts"] ?? null
  return {
    request: summarizeForTooltip(requestSource),
    response: summarizeForTooltip(event["output"]),
  }
}

// Build a dataset example from a trace/span. The request messages become the
// example input (full JSON so system/tool turns are preserved), the response
// becomes the expected output, and a few provenance fields ride along in
// metadata. Consumed by the "Add to Dataset" control in the trace/agent drawers.
export function traceToDatasetExample(t: TraceRecord): {
  input: string
  expected_output: string | null
  metadata: Record<string, unknown>
} {
  const event = t.event
  const requestSource =
    event["messages"] ?? event["input"] ?? event["contents"] ?? event["prompts"] ?? null
  const input =
    typeof requestSource === "string"
      ? requestSource
      : requestSource != null
        ? safeStringify(requestSource)
        : ""

  const responseSource = event["output"] ?? event["response"] ?? null
  const expected_output =
    responseSource == null
      ? null
      : typeof responseSource === "string"
        ? responseSource
        : safeStringify(responseSource)

  const metadata: Record<string, unknown> = {}
  const model = getModel(event)
  if (model) metadata["model"] = model
  if (typeof t.cost === "number") metadata["cost"] = t.cost
  const tid = getStr(event, "trace_id")
  if (tid) metadata["source_trace_id"] = tid
  const integration = getStr(event, "integration")
  if (integration) metadata["integration"] = integration

  return { input, expected_output, metadata }
}

export function getEventTimestamp(t: TraceRecord): number {
  const ts = t.event["timestamp"]
  if (typeof ts === "number" && Number.isFinite(ts)) return ts
  const parsed = Date.parse(t.ingested_at)
  return Number.isNaN(parsed) ? 0 : parsed / 1000
}

// LangChain message types use `type` instead of `role`: human/ai/system/tool/function.
// Normalize them to OpenAI-style roles so the rest of the UI can stay role-driven.
export function normalizeMessageRole(rec: Record<string, unknown>): string {
  if (typeof rec["role"] === "string") return rec["role"] as string
  const t = rec["type"]
  if (typeof t !== "string") return "user"
  switch (t) {
    case "human":
      return "user"
    case "ai":
      return "assistant"
    case "system":
      return "system"
    case "tool":
    case "function":
      return "tool"
    default:
      return t
  }
}

// LangChain wraps `messages` as a list of generations: [[msg, msg, ...], ...].
// Flatten one level of nesting so the rest of the extractors stay shape-agnostic.
export function flattenMessageList(raw: unknown[]): unknown[] {
  const out: unknown[] = []
  for (const item of raw) {
    if (Array.isArray(item)) {
      for (const inner of item) out.push(inner)
    } else {
      out.push(item)
    }
  }
  return out
}
