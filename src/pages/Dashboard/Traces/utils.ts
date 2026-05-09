import type { TraceRecord } from "./types"

export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function summarize(event: Record<string, unknown>): string {
  try {
    return JSON.stringify(event, null, 2)
  } catch {
    return String(event)
  }
}

export function getStr(event: Record<string, unknown>, key: string): string | null {
  const v = event[key]
  if (typeof v === "string" && v.length > 0) return v
  return null
}

export function getLanggraphNode(event: Record<string, unknown>): string | null {
  const lg = event["langgraph"]
  if (!lg || typeof lg !== "object") return null
  const node = (lg as Record<string, unknown>)["langgraph_node"]
  if (typeof node === "string" && node.length > 0) return node
  return null
}

export function isFailed(event: Record<string, unknown>): boolean {
  return event["success"] === false
}

// True while the trace is in-flight (placeholder pushed by trace.started SSE).
// The completion event will replace the row in state, dropping ``status`` so
// any later read returns false.
export function isRunning(event: Record<string, unknown>): boolean {
  return event["status"] === "running"
}

export function isContentEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === "string") return value.length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

export function formatDate(iso: string): string {
  // All server timestamps are UTC. Append Z if no timezone offset is present
  // so browsers parse them as UTC rather than local time before converting.
  const src = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z"
  const d = new Date(src)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function formatLatency(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "\u2014"
  if (value < 1) return `${Math.round(value * 1000)}ms`
  return `${value.toFixed(2)}s`
}

// Render a USD-denominated cost compactly: sub-cent values are shown with up
// to 6 decimals so token-level pricing stays visible, larger amounts collapse
// to standard 2-decimal currency formatting.
export function formatCost(
  value: unknown,
  currency: string | null | undefined = "USD",
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "\u2014"
  const code = (currency || "USD").toUpperCase()
  const symbol = code === "USD" ? "$" : ""
  if (value === 0) return `${symbol}0.00`
  if (value < 0.01) return `${symbol}${value.toFixed(6)}`
  if (value < 1) return `${symbol}${value.toFixed(4)}`
  return `${symbol}${value.toFixed(2)}`
}

// Score-band styling shared by the table cell and the drawer pills. Returns
// tailwind classes for the bg/text combo plus a textual band label.
export function scoreBandClass(score: number | null | undefined): string {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "bg-muted text-muted-foreground"
  }
  if (score >= 0.8) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
  if (score >= 0.5) return "bg-amber-500/15 text-amber-600 dark:text-amber-400"
  return "bg-destructive/15 text-destructive"
}

export function formatScore(score: number | null | undefined): string {
  if (typeof score !== "number" || !Number.isFinite(score)) return "\u2014"
  return score.toFixed(2)
}

// Compact stringification used by the node tooltip overlay; the drawer still
// renders the full structured view.
export function summarizeForTooltip(value: unknown, max = 600): string | null {
  if (value === undefined || value === null) return null
  let s: string
  if (typeof value === "string") s = value
  else s = safeStringify(value)
  if (s.length === 0) return null
  if (s.length > max) s = s.slice(0, max) + "\u2026"
  return s
}

export function extractTooltipIO(
  event: Record<string, unknown>,
): { request: string | null; response: string | null } {
  const requestSource =
    event["input"] ?? event["messages"] ?? event["prompts"] ?? null
  return {
    request: summarizeForTooltip(requestSource),
    response: summarizeForTooltip(event["output"]),
  }
}

export function getEventTimestamp(t: TraceRecord): number {
  const ts = t.event["timestamp"]
  if (typeof ts === "number" && Number.isFinite(ts)) return ts
  const parsed = Date.parse(t.ingested_at)
  return Number.isNaN(parsed) ? 0 : parsed / 1000
}

// LangChain message types use `type` instead of `role`: human/ai/system/tool/function.
// Normalize them to OpenAI-style roles so the rest of the UI can stay role-driven.
export function normalizeMessageRole(rec: Record<string, unknown>): string {
  if (typeof rec["role"] === "string") return rec["role"] as string
  const t = rec["type"]
  if (typeof t !== "string") return "user"
  switch (t) {
    case "human":
      return "user"
    case "ai":
      return "assistant"
    case "system":
      return "system"
    case "tool":
    case "function":
      return "tool"
    default:
      return t
  }
}

// LangChain wraps `messages` as a list of generations: [[msg, msg, ...], ...].
// Flatten one level of nesting so the rest of the extractors stay shape-agnostic.
export function flattenMessageList(raw: unknown[]): unknown[] {
  const out: unknown[] = []
  for (const item of raw) {
    if (Array.isArray(item)) {
      for (const inner of item) out.push(inner)
    } else {
      out.push(item)
    }
  }
  return out
}
