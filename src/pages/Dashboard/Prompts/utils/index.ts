import {
  extractRequestMessages,
  extractSystemInstruction,
  extractTokens,
} from "@/pages/Dashboard/Traces/helpers/extractors"
import type { TraceRecord } from "@/pages/Dashboard/Traces/types"
import type { PromptRow, TraceMetadata } from "./types"
import { VAR_RE } from "./types"

export function truncate(s: string, max = 120): string {
  if (s.length <= max) return s
  return s.slice(0, max) + "…"
}

function extractTextFromValue(v: unknown): string {
  if (typeof v === "string") return v
  if (Array.isArray(v)) {
    return v.flatMap((item) => {
      if (typeof item === "string") return [item]
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const rec = item as Record<string, unknown>
        if (typeof rec["text"] === "string") return [rec["text"] as string]
      }
      return []
    }).join("\n")
  }
  if (v && typeof v === "object") {
    try { return JSON.stringify(v, null, 2) } catch { return "" }
  }
  return ""
}

export function extractOutput(event: Record<string, unknown>): string {
  // LLM calls store the model's reply in "response"
  const resp = event["response"]
  if (resp !== undefined && resp !== null) {
    const text = extractTextFromValue(resp)
    if (text) return text
  }
  // Function/agent spans use "output"
  return extractTextFromValue(event["output"])
}

export function buildFullInput(event: Record<string, unknown>): string {
  const lines: string[] = []
  const sys = extractSystemInstruction(event)
  if (sys) lines.push(`[System]\n${sys}`)
  const msgs = extractRequestMessages(event)
  for (const m of msgs) {
    const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content)
    lines.push(`[${m.role}]\n${content}`)
  }
  return lines.join("\n\n")
}

export function buildUserPrompt(event: Record<string, unknown>): string {
  const msgs = extractRequestMessages(event)
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "user") {
      const c = msgs[i].content
      return typeof c === "string" ? c : JSON.stringify(c, null, 2)
    }
  }
  if (msgs.length > 0) {
    const c = msgs[msgs.length - 1].content
    return typeof c === "string" ? c : JSON.stringify(c, null, 2)
  }
  return ""
}

export function buildInputPreview(event: Record<string, unknown>): string {
  const msgs = extractRequestMessages(event)
  if (msgs.length > 0) {
    const last = msgs[msgs.length - 1]
    const c = typeof last.content === "string" ? last.content : JSON.stringify(last.content)
    return truncate(c)
  }
  const sys = extractSystemInstruction(event)
  if (sys) return truncate(sys)
  return "—"
}

export function extractMetadata(trace: TraceRecord): TraceMetadata {
  const e = trace.event
  const tokens = extractTokens(e)
  const rawSuccess = e["success"]
  const success =
    rawSuccess === true || rawSuccess === 1 ? true
    : rawSuccess === false || rawSuccess === 0 ? false
    : null
  return {
    traceId:         typeof e["trace_id"] === "string" ? e["trace_id"] as string : null,
    apiKeyPrefix:    trace.api_key_prefix,
    latency:         typeof e["latency"] === "number" ? e["latency"] as number : null,
    tokenPrompt:     tokens?.prompt ?? null,
    tokenCompletion: tokens?.completion ?? null,
    tokenTotal:      tokens?.total ?? null,
    cost:            trace.cost ?? null,
    currency:        trace.currency ?? null,
    success,
  }
}

export function toPromptRow(trace: TraceRecord): PromptRow {
  const e = trace.event
  const name =
    (typeof e["function"] === "string" && e["function"]) ? e["function"] as string
    : (typeof e["name"] === "string" && e["name"]) ? e["name"] as string
    : trace.api_key_prefix ? `${trace.api_key_prefix}…`
    : "—"
  const model = (typeof e["model"] === "string" && e["model"]) ? e["model"] as string : "—"
  const fullOutput = extractOutput(e)
  const fullInput  = buildFullInput(e)
  return {
    trace,
    name,
    model,
    inputPreview:  buildInputPreview(e),
    outputPreview: truncate(fullOutput),
    userPrompt:    buildUserPrompt(e),
    fullInput,
    fullOutput,
    metadata: extractMetadata(trace),
  }
}

export function detectVars(text: string): string[] {
  const seen = new Set<string>()
  for (const m of text.matchAll(VAR_RE)) seen.add(m[1])
  return Array.from(seen)
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(VAR_RE, (_, name) => vars[name] ?? `{{${name}}}`)
}

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
}
