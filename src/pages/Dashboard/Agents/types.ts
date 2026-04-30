export interface AgentRow {
  agent_key: string
  agent_kind: string
  integration: string
  runs: number
  total_cost: number
  avg_cost_per_run: number
  total_tokens: number
  avg_latency: number | null
  last_run: string | null
}

export interface AgentSummaryResponse {
  agents: AgentRow[]
  limit: number
}

export type SortKey =
  | "agent_key"
  | "integration"
  | "runs"
  | "total_cost"
  | "avg_cost_per_run"
  | "total_tokens"
  | "avg_latency"
  | "last_run"
