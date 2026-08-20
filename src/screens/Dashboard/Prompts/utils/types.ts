import type { TraceRecord } from "@/pages/Dashboard/Traces/utils/types"

// ── Constants ─────────────────────────────────────────────────────────────────

export const ALL_METRICS = [
  "hallucination",
  "faithfulness",
  "relevance",
  "toxicity",
  "coherence",
  "completeness",
  // RAG retrieval quality — needs the retrieved context pasted in the drawer.
  "context_precision",
] as const

// The compare/judge model list is NOT hardcoded here — it is fetched from
// GET /api/v1/evaluate/models, which derives it live from the model_prices
// table. These are only the initial selections a fresh playground tab opens
// with; if an id is absent from the fetched list it simply stays unselected.
export const DEFAULT_COMPARE_MODELS = ["claude-haiku-4-5", "claude-sonnet-4-6"]
export const DEFAULT_JUDGE_MODEL = "claude-haiku-4-5"

/** A chat-capable model as returned by GET /api/v1/evaluate/models. */
export interface ModelOption {
  id:       string
  label:    string
  provider: string
}

export const PROMPTS_PAGE_SIZE = 100
export const VAR_RE = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MetricResult {
  metric: string
  score: number
  reason: string
  passed: boolean
}

export interface PlaygroundResponse {
  trace_id: string
  scores: Record<string, number>
  results: MetricResult[]
  passed: boolean
  failures: string[]
}

export interface TraceMetadata {
  traceId: string | null
  apiKeyPrefix: string
  latency: number | null
  tokenPrompt: number | null
  tokenCompletion: number | null
  tokenTotal: number | null
  cost: number | null
  currency: string | null
  success: boolean | null
}

export interface PromptRow {
  trace: TraceRecord
  name: string
  model: string
  inputPreview: string
  outputPreview: string
  userPrompt: string
  fullInput: string
  fullOutput: string
  metadata: TraceMetadata
}

export type PromptEnv = "development" | "staging" | "production"

export interface EnvDeployment {
  env_id: string
  version: number
  deployed_at: string
}

export type PromptKind = "completion" | "judge"

export interface SavedPrompt {
  prompt_id: string
  org_id: string
  name: string
  slug: string
  template: string
  model: string | null
  variables: { name: string }[]
  kind: PromptKind
  /** Which slice of a run a judge grades. 'output' for everything else. */
  target?: string
  /** Agentic toolset carried on the prompt; empty for a plain completion. */
  tools?: { name: string; description: string; parameters: Record<string, unknown> }[]
  mcp_servers?: {
    label: string
    url: string | null
    description: string
    tools: { name: string; description: string; parameters: Record<string, unknown> }[]
  }[]
  is_deployed: boolean
  deployed_at: string | null
  version: number
  environments: Record<PromptEnv, EnvDeployment | null>
  created_at: string | null
  updated_at: string | null
}

export interface PromptVersion {
  version_id: string
  prompt_id: string
  version: number
  name: string
  template: string
  model: string | null
  variables: string[]
  created_at: string | null
}

export interface CompareResult {
  model:         string
  output:        string | null
  latency_ms:    number | null
  input_tokens:  number | null
  output_tokens: number | null
  cost_usd:      number | null
  error:         string | null
  metrics?:      MetricResult[] | null
}

export interface DatasetRef {
  dataset_id:    string
  name:          string
  example_count: number
}
