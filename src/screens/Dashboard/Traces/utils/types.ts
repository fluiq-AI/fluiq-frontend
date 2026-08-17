export type DrawerTab = "ui" | "json" | "evaluation" | "security"

// Precomputed per-run rollup returned by POST /traces/rollups, keyed by a
// root_trace_id. Lets the Traces list show a run's cost / quality / security /
// span-count headline numbers straight from the server-side AggregatingMergeTree
// rollups, instead of pulling every child span to sum them in the browser.
export interface RootRollup {
  run_cost: number
  run_tokens: number
  span_count: number
  quality_min: number | null
  quality_avg: number | null
  quality_count: number
  security_risk_max: number
  security_should_block: boolean
  security_detections: number
}
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

// ── Agentic evaluation detail shapes (evaluator = "fluiq.agent_eval") ──────────
export interface EvaluationPerCall {
  index?: number
  tool?: string
  appropriate?: boolean
  reason?: string
}

export interface DeterministicFinding {
  call_index?: number
  tool?: string
  code?: string
  severity?: string // "error" | "warning"
  message?: string
}

export interface DeterministicReport {
  score?: number
  passed?: boolean
  total_calls?: number
  error_calls?: number
  findings?: DeterministicFinding[]
}

export interface TrajectorySubgoal {
  subgoal?: string
  achieved?: boolean
}

export interface PanelMember {
  role?: string // "primary" | "juror"
  provider?: string
  model?: string
  score?: number
  reason?: string | null
}

export interface EvaluationPanel {
  mode?: string
  convened?: boolean
  agreement?: number
  votes_pass?: number
  votes_total?: number
  members?: PanelMember[]
}

export interface AgentSummary {
  agent: string
  steps: number
  tool_calls: number
  errors: number
}

export interface CoordinationJoin {
  join: string
  reason?: string
  branches: { agent: string; incorporated: boolean; reason?: string }[]
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
    // Agentic fields
    per_call?: EvaluationPerCall[]
    deterministic?: DeterministicReport
    subgoals?: TrajectorySubgoal[]
    goal_completion?: number | null
    efficiency?: number | null
    panel?: EvaluationPanel
    // L5 coordination (agentic.coordination)
    agents?: AgentSummary[]
    joins?: CoordinationJoin[]
    num_agents?: number
    num_joins?: number
    run_score?: number
    run_passed?: boolean
    // Prompt provenance: the exact judge prompt(s) that produced this score
    judge_prompts?: JudgePromptUsage[]
    [key: string]: unknown
  } | null
}

// One judge prompt as rendered for an evaluation. `source` says which template
// won: the org's override, an admin-edited platform template, the built-in
// default, or a client-authored custom judge.
export interface JudgePromptUsage {
  name: string
  source: "org" | "platform" | "default" | "custom"
  version: number | null
  calls?: number
  truncated?: boolean
  rendered?: string
}

export interface TraceRecord {
  api_key_prefix: string
  event: Record<string, unknown>
  ingested_at: string
  cost?: number | null
  currency?: string | null
  evaluations?: EvaluationScore[]
  /** Labels from the SDK or applied in the dashboard. */
  tags?: string[]
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
  /** Tags a trace must carry (all of them, not any). Empty = no tag filter. */
  tags:        string[]
}

export const DEFAULT_TRACE_FILTERS: TraceFilters = {
  sort:        "newest",
  security:    "all",
  integration: "all",
  quality:     "all",
  status:      "all",
  tags:        [],
}
