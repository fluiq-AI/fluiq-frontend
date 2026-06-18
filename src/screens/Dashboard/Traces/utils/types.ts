export type DrawerTab = "ui" | "json" | "evaluation" | "security"
// A tool/function call carried directly on a chat message (OpenAI shape:
// message.tool_calls[*].function.{name, arguments}). `arguments` is usually a
// JSON-encoded string from the provider; the renderer parses it best-effort.
export type MessageToolCall = { id?: string; name: string; arguments: unknown }
// A tool's returned output, harvested from a later turn's message history.
export type ToolResult = { id?: string; name?: string; content: unknown }
// Aggregated inputs/outputs for a single tool name across a whole trace group.
export type ToolIO = { inputs: unknown[]; outputs: unknown[] }
// A resolved MCP tool invocation: OpenAI `mcp_call` items are self-contained;
// Anthropic `mcp_tool_use` blocks have their output correlated by id from
// `mcp_tool_result` blocks elsewhere in the conversation.
export type McpCall = {
  id?: string
  name: string
  server?: string
  input: unknown
  output: unknown
}

// An embedded tool call promoted to a selectable entity. Embedded tool calls
// aren't trace spans, so the drawer keeps `selectedTrace` on the parent LLM
// (preserving the flow graph / tree) and overlays the selected tool here to
// drive the right-hand detail panel. `key` (parentTraceId::name) drives the
// node/row highlight. This is the seam tool-level evals/security will attach to.
export type SelectedTool = {
  key: string
  name: string
  input: unknown
  output: unknown
  // For MCP calls: the server the call was routed through (shown in the detail).
  server?: string
}

// Promote an embedded tool/MCP call to a selection. Implemented by the Traces
// page; threaded through the drawer to the Architecture and Trace Tree views.
export type ToolSelectFn = (
  parentTrace: TraceRecord,
  name: string,
  input: unknown,
  output: unknown,
  server?: string,
) => void
export type RequestMessage = {
  role: string
  content: unknown
  // tool-role messages: which tool produced this result, and the call it answers
  name?: string
  toolCallId?: string
  // assistant messages: provider-native reasoning trace and outgoing tool calls
  reasoningContent?: string
  toolCalls?: MessageToolCall[]
}
export type TokenUsage = { prompt?: number; completion?: number; total?: number }
export type FunctionView = { name: string; input: string; output: string }
export type ToolDef = { name: string; description?: string; input_schema?: unknown }
export type ToolLatencyMap = Record<string, number>
export type McpServer = {
  name: string
  type?: string
  url?: string
  version?: string
  tools?: ToolDef[]
}

export interface EvaluationPerChunk {
  id?: string | null
  score?: number | null
  useful?: boolean | null
}

export interface EvaluationScore {
  metric: string
  score: number | null
  evaluator: string
  judge_model: string
  // `details` is opaque JSON from the worker; the drawer renders the
  // reason/per-chunk fields when present and falls back to raw JSON otherwise.
  details?: {
    reason?: string | null
    per_chunk?: EvaluationPerChunk[]
    question?: string | null
    [key: string]: unknown
  } | null
}

export interface TraceRecord {
  api_key_prefix: string
  event: Record<string, unknown>
  ingested_at: string
  cost?: number | null
  currency?: string | null
  evaluations?: EvaluationScore[]
}

// Phase of a trace as observed by the live SSE stream. ``running`` rows are
// placeholders pushed on ``trace.started``; the eventual ``trace`` event
// replaces them with the durable record. Absence (the typical case for
// rows fetched from /traces) means "completed", same as in ClickHouse.
export type TraceStatus = "running" | "complete"

export interface TraceListResponse {
  traces: TraceRecord[]
  limit: number
  offset: number
}

export interface TraceNode {
  id: string
  trace: TraceRecord
  children: TraceNode[]
}

export interface TraceGroup {
  group_id: string
  root: TraceNode
  count: number
}

// ── Filter types ──────────────────────────────────────────────────────────────

export type TraceSortKey =
  | "newest"
  | "oldest"
  | "latency_desc"
  | "latency_asc"
  | "cost_desc"
  | "cost_asc"

export type TraceSecurityFilter = "all" | "clean" | "low" | "medium" | "high"
export type TraceQualityFilter  = "all" | "high" | "medium" | "low" | "none"
export type TraceStatusFilter   = "all" | "completed" | "running" | "blocked" | "failed"

export interface TraceFilters {
  sort:        TraceSortKey
  security:    TraceSecurityFilter
  integration: string             // "all" or a raw integration string e.g. "OPENAI"
  quality:     TraceQualityFilter
  status:      TraceStatusFilter
}

export const DEFAULT_TRACE_FILTERS: TraceFilters = {
  sort:        "newest",
  security:    "all",
  integration: "all",
  quality:     "all",
  status:      "all",
}
