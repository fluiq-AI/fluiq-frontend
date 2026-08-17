import { useEffect, useState } from "react"

import { authFetch } from "@/lib/authFetch"

/** A chat-capable model as returned by GET /api/v1/evaluate/models. */
export interface ModelOption {
  id:       string
  label:    string
  provider: string
}

/** A `provider:model` judge/jury spec plus its display label. */
export interface ModelSpec {
  spec:  string
  label: string
}

// Mirrors fluiq-api/shared/providers.py.
const PROVIDER_DISPLAY: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google (Gemini)",
  mistral: "Mistral",
  groq: "Groq",
  together: "Together AI",
  fireworks: "Fireworks",
  perplexity: "Perplexity",
  xai: "xAI (Grok)",
  cerebras: "Cerebras",
  deepseek: "DeepSeek",
  moonshot: "Moonshot (Kimi)",
  zai: "Z.AI (GLM)",
  openrouter: "OpenRouter",
  vercel: "Vercel AI Gateway",
  baseten: "Baseten",
  deepinfra: "DeepInfra",
  sambanova: "SambaNova",
  nebius: "Nebius AI Studio",
  novita: "Novita AI",
  hyperbolic: "Hyperbolic",
  vertex: "Google Vertex AI",
  databricks: "Databricks",
  cloudflare: "Cloudflare Workers AI",
  azure_openai: "Azure OpenAI",
  bedrock: "AWS Bedrock",
}

// The model list is identical for every picker and rarely changes within a
// session, so fetch it once and share the result across all callers rather than
// hitting the endpoint from every dropdown that mounts.
let _cache: ModelOption[] | null = null
let _inflight: Promise<ModelOption[]> | null = null

function load(): Promise<ModelOption[]> {
  if (_cache) return Promise.resolve(_cache)
  if (!_inflight) {
    _inflight = authFetch<{ models: ModelOption[] }>("/api/v1/evaluate/models")
      .then((r) => {
        _cache = r.models
        return r.models
      })
      .catch(() => {
        _inflight = null // let a later mount retry
        return []
      })
  }
  return _inflight
}

/** Chat-capable models drawn from the price table (shared, cached). */
export function useModels(): ModelOption[] {
  const [models, setModels] = useState<ModelOption[]>(_cache ?? [])
  useEffect(() => {
    let alive = true
    load().then((m) => {
      if (alive) setModels(m)
    })
    return () => {
      alive = false
    }
  }, [])
  return models
}

/** `provider:model` specs for the judge/jury pickers that speak that format. */
export function toSpecs(models: ModelOption[]): ModelSpec[] {
  return models.map((m) => ({
    spec: `${m.provider}:${m.id}`,
    label: `${PROVIDER_DISPLAY[m.provider] ?? m.provider} · ${m.id}`,
  }))
}

/**
 * The bare model id inside a `provider:model` spec.
 *
 * Judge and jury selection speak specs because a judge is chosen per provider;
 * a task's model is just a model, so the task API takes the id alone and infers
 * the provider from it.
 */
export function specModel(spec: string): string {
  if (!spec) return ""
  const [, ...rest] = spec.split(":")
  return rest.length ? rest.join(":") : spec
}

/** Human label for a `provider:model` spec, falling back to the raw spec. */
export function specLabel(models: ModelOption[], spec: string): string {
  if (!spec) return spec
  const [provider, ...rest] = spec.split(":")
  const model = rest.join(":")
  const match = models.find((m) => m.provider === provider && m.id === model)
  if (match) return `${PROVIDER_DISPLAY[provider] ?? provider} · ${model}`
  return spec
}
