import { apiRequest } from "@/lib/api"

/** A model + per-million token prices as returned by the Fluiq pricing API. */
export interface PricedModel {
  id: number | string
  provider: string
  model: string
  input_per_million: number
  output_per_million: number
  cached_input_per_million: number | null
}

export interface ModelsResponse {
  models: PricedModel[]
  count: number
}

export function fetchModels(signal?: AbortSignal) {
  return apiRequest<ModelsResponse>("/api/v1/models", { signal })
}

export interface ModelRequestInput {
  provider?: string
  model: string
  email?: string
  note?: string
}

export function requestModel(body: ModelRequestInput) {
  return apiRequest<{ ok: true }>("/api/v1/models/request", { method: "POST", body })
}

export interface PriceReportInput {
  model_price_id?: number | string | null
  provider?: string
  model: string
  reported_input?: number | null
  reported_output?: number | null
  source_url?: string
  email?: string
  note?: string
}

export function reportPrice(body: PriceReportInput) {
  return apiRequest<{ ok: true }>("/api/v1/models/report", { method: "POST", body })
}
