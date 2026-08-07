import { apiRequest } from "@/lib/api"

export type Finding = { kind: "canary" | "secret" | "pii"; label: string; excerpt: string }

export type Gate = {
  blocked: boolean
  blocked_at: "input" | "output" | null
  input_scan: { allowed: boolean; risk_level: string; attack_types: string[] }
  output_scan: { blocked: boolean; kinds: string[]; findings: Finding[] }
  reason: string | null
  timing_ms: { input_scan: number; output_scan: number }
}

export type Scenario = {
  key: string
  label: string
  blurb: string
  prompt: string
  response: string
  captured: {
    model: string
    at: string
    input_tokens: number
    output_tokens: number
    note?: string
    runs_sampled?: number
  }
  /** True when the model itself kept the planted secret out of its answer. */
  model_withheld: boolean
  gate: Gate
}

export async function fetchScenarios() {
  return apiRequest<{ scenarios: Scenario[]; mode: string }>("/api/v1/demo/scenarios")
}

export async function scanText(prompt: string, response: string) {
  return apiRequest<{ mode: string; gate: Gate }>("/api/v1/demo/scan", {
    method: "POST",
    body: { prompt, response },
  })
}
