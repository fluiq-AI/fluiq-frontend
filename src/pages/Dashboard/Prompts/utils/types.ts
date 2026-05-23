import type { TraceRecord } from "@/pages/Dashboard/Traces/utils/types"

// ── Constants ─────────────────────────────────────────────────────────────────

export const ALL_METRICS = [
  "hallucination",
  "faithfulness",
  "relevance",
  "toxicity",
  "coherence",
  "completeness",
] as const

export const JUDGE_MODELS = [
  { label: "Haiku 4.5 (fast)", value: "claude-haiku-4-5-20251001" },
  { label: "Sonnet 4.6 (accurate)", value: "claude-sonnet-4-6" },
]

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

export interface SavedPrompt {
  prompt_id: string
  org_id: string
  name: string
  slug: string
  template: string
  model: string | null
  variables: { name: string }[]
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

export interface DatasetRef {
  dataset_id:    string
  name:          string
  example_count: number
}
