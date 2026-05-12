export type DrawerTab = "ui" | "json" | "security"
export type RequestMessage = { role: string; content: unknown }
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
