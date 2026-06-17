import { useCallback, useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, Cancel01Icon, Loading03Icon, RefreshIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { useRealtimeStream } from "@/lib/useRealtimeStream"

import type { TraceListResponse, TraceRecord } from "../Traces/utils/types"
import { SecurityBadge, SecurityPanel } from "../Traces/components/SecurityPanel"
import { extractRequestMessages } from "../Traces/helpers/extractors"
import { formatDate, getModel, getStr } from "../Traces/utils"
import { TRACES_PAGE_SIZE } from "../Traces/utils/constants"

const SECURITY_PAGE_SIZE = TRACES_PAGE_SIZE * 2

type RiskFlag = "Blocked" | "PII" | "Injection" | "Jailbreak" | "Skeleton Key" | "Secrets" | "Crescendo" | "Response Gate"

const FLAG_STYLES: Record<RiskFlag, string> = {
  Blocked: "bg-red-500/15 text-red-600",
  PII: "bg-orange-500/15 text-orange-600",
  Injection: "bg-purple-500/15 text-purple-700",
  Jailbreak: "bg-yellow-500/15 text-yellow-700",
  "Skeleton Key": "bg-blue-500/15 text-blue-700",
  Secrets: "bg-rose-500/15 text-rose-600",
  Crescendo: "bg-orange-500/15 text-orange-700",
  "Response Gate": "bg-red-500/15 text-red-700",
}

function hasSecurityData(event: Record<string, unknown>): boolean {
  return "security_risk_level" in event || event["status"] === "blocked"
}

function isSecurityRisk(event: Record<string, unknown>): boolean {
  if (event["status"] === "blocked") return true
  const level = event["security_risk_level"]
  return level === "low" || level === "medium" || level === "high"
}

function extractFirstUserPrompt(event: Record<string, unknown>): string | null {
  const msgs = extractRequestMessages(event)
  const userMsg = msgs.find((m) => m.role === "user")
  if (!userMsg) return null
  const { content } = userMsg
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part && typeof part === "object") {
        const p = part as Record<string, unknown>
        if (p["type"] === "text" && typeof p["text"] === "string") return p["text"]
      }
      if (typeof part === "string") return part
    }
  }
  return null
}

function truncate(text: string, max = 140): string {
  return text.length <= max ? text : text.slice(0, max) + "…"
}

function getRiskFlags(event: Record<string, unknown>): RiskFlag[] {
  const flags: RiskFlag[] = []
  if (event["status"] === "blocked") flags.push("Blocked")
  if (Array.isArray(event["pii_entities_prompt"]) && (event["pii_entities_prompt"] as unknown[]).length > 0)
    flags.push("PII")
  if (event["injection_detected"]) flags.push("Injection")
  if (event["jailbreak_detected"]) flags.push("Jailbreak")
  if (event["skeleton_key_detected"]) flags.push("Skeleton Key")
  if (event["secrets_detected"]) flags.push("Secrets")
  if (event["crescendo_detected"]) flags.push("Crescendo")
  if (event["response_gate_blocked"]) flags.push("Response Gate")
  return flags
}

function SecurityOverview() {
  const [traces, setTraces]           = useState<TraceRecord[]>([])
  const [loading, setLoading]         = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore]         = useState(false)
  const [rawOffset, setRawOffset]     = useState(SECURITY_PAGE_SIZE)
  const [error, setError]             = useState<string | null>(null)
  const [selected, setSelected]       = useState<TraceRecord | null>(null)

  const fetchRiskyTraces = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const data = await authFetch<TraceListResponse>(
        `/api/v1/traces?limit=${SECURITY_PAGE_SIZE}&offset=0&roots_only=true`,
      )
      setTraces(data.traces.filter((t) => hasSecurityData(t.event) && isSecurityRisk(t.event)))
      setRawOffset(SECURITY_PAGE_SIZE)
      setHasMore(data.traces.length >= SECURITY_PAGE_SIZE)
    } catch (err) {
      if (!silent) setError(err instanceof ApiError ? err.detail : "Failed to load traces")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useRealtimeStream({
    path: "/api/v1/traces/stream",
    events: ["trace", "trace.enriched"],
    onEvent: (data, msg) => {
      if (!data || typeof data !== "object") return

      if (msg.event === "trace.enriched") {
        const payload = data as {
          enrichment?: string
          security?: Record<string, unknown>
        }
        if (payload.enrichment !== "security" || !payload.security) return
        const level = payload.security["security_risk_level"]
        if (level === "low" || level === "medium" || level === "high") {
          void fetchRiskyTraces(true)
        }
        return
      }

      // "trace" event — add blocked traces immediately without waiting for a refresh
      const payload = data as {
        api_key_prefix?: string
        trace_id?: string
        ingested_at_ms?: number
        event?: Record<string, unknown>
      }
      if (!payload.event || typeof payload.event !== "object") return
      if (payload.event["status"] !== "blocked") return
      const newRecord: TraceRecord = {
        api_key_prefix: payload.api_key_prefix ?? "",
        event: payload.event,
        ingested_at: payload.ingested_at_ms
          ? new Date(payload.ingested_at_ms).toISOString()
          : new Date().toISOString(),
        cost: null,
        currency: null,
        evaluations: [],
      }
      setTraces((prev) => {
        const newId = payload.trace_id ?? getStr(newRecord.event, "trace_id")
        if (newId && prev.some((t) => getStr(t.event, "trace_id") === newId)) return prev
        return [newRecord, ...prev]
      })
    },
    onReopen: () => { void fetchRiskyTraces(true) },
  })

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const data = await authFetch<TraceListResponse>(
        `/api/v1/traces?limit=${SECURITY_PAGE_SIZE}&offset=${rawOffset}&roots_only=true`,
      )
      const fresh = data.traces.filter((t) => hasSecurityData(t.event) && isSecurityRisk(t.event))
      if (fresh.length > 0) {
        setTraces((prev) => {
          const seen = new Set(prev.map((t) => getStr(t.event, "trace_id")).filter(Boolean))
          return [...prev, ...fresh.filter((t) => {
            const tid = getStr(t.event, "trace_id")
            return tid && !seen.has(tid)
          })]
        })
      }
      setRawOffset((o) => o + SECURITY_PAGE_SIZE)
      setHasMore(data.traces.length >= SECURITY_PAGE_SIZE)
    } catch {
      // silently fail — button stays visible so user can retry
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, rawOffset])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await authFetch<TraceListResponse>(
          `/api/v1/traces?limit=${SECURITY_PAGE_SIZE}&offset=0&roots_only=true`,
        )
        if (cancelled) return
        setTraces(data.traces.filter((t) => hasSecurityData(t.event) && isSecurityRisk(t.event)))
        setRawOffset(SECURITY_PAGE_SIZE)
        setHasMore(data.traces.length >= SECURITY_PAGE_SIZE)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.detail : "Failed to load traces")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <DashboardPageHeader
        title="Security"
        description="Traces flagged with security risks — PII, injections, jailbreaks, and secrets."
      />
      <div className="px-6 py-6">

      {/* ── Metric cards ── */}
      {!loading && traces.length > 0 && (() => {
        const blocked      = traces.filter((t) => t.event["status"] === "blocked").length
        const gateBlocked  = traces.filter((t) => t.event["response_gate_blocked"]).length
        const highRisk     = traces.filter((t) => t.event["security_risk_level"] === "high").length
        const crescendo    = traces.filter((t) => t.event["crescendo_detected"]).length
        const stats = [
          { label: "Flagged traces",    value: traces.length,  color: "text-foreground" },
          { label: "Blocked (pre-call)",value: blocked,         color: "text-red-600" },
          { label: "Response gate",     value: gateBlocked,    color: "text-red-700" },
          { label: "High risk",         value: highRisk,        color: "text-yellow-600" },
          { label: "Crescendo alerts",  value: crescendo,       color: "text-orange-600" },
        ]
        return (
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {stats.map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border border-border/60 bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`mt-1 font-heading text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )
      })()}

      <Card>
        <CardHeader>

          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Flagged traces</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading…"
                  : `${traces.length} trace${traces.length === 1 ? "" : "s"} with security risks in recent history`}
              </CardDescription>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { fetchRiskyTraces() }} disabled={loading}>
                <HugeiconsIcon icon={loading ? Loading03Icon : RefreshIcon} className={loading ? "animate-spin" : undefined} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="mx-6 mb-6 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <HugeiconsIcon icon={Alert02Icon} size={14} />
              {error}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-muted-foreground">
              <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
              Loading…
            </div>
          ) : traces.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No security risks detected in recent traces. Enable{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
                fluiq.secure()
              </code>{" "}
              to start scanning.
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2 font-medium">Timestamp</th>
                    <th className="px-6 py-2 font-medium">Model</th>
                    <th className="px-6 py-2 font-medium">Risk</th>
                    <th className="px-6 py-2 font-medium">User Prompt</th>
                    <th className="px-6 py-2 font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {traces.map((trace, i) => {
                    const prompt = extractFirstUserPrompt(trace.event)
                    const flags = getRiskFlags(trace.event)
                    const riskScore =
                      typeof trace.event["security_risk_score"] === "number"
                        ? (trace.event["security_risk_score"] as number).toFixed(2)
                        : null
                    return (
                      <tr
                        key={getStr(trace.event, "trace_id") ?? i}
                        onClick={() => setSelected(trace)}
                        className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                      >
                        <td className="whitespace-nowrap px-6 py-3 text-xs text-muted-foreground">
                          {formatDate(trace.ingested_at)}
                        </td>
                        <td className="px-6 py-3 font-mono text-xs">
                          {getModel(trace.event) ?? "—"}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-col gap-1">
                            <SecurityBadge event={trace.event} />
                            {riskScore !== null && (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                score: {riskScore}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="max-w-sm px-6 py-3">
                          {prompt ? (
                            <span className="line-clamp-2 wrap-break-word text-xs text-foreground/80">
                              {truncate(prompt)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-wrap gap-1">
                            {flags.map((f) => (
                              <span
                                key={f}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${FLAG_STYLES[f]}`}
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {hasMore ? (
              <div className="flex justify-center border-t border-border/60 px-6 py-3">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  <HugeiconsIcon
                    icon={isLoadingMore ? Loading03Icon : RefreshIcon}
                    className={isLoadingMore ? "animate-spin" : undefined}
                  />
                  {isLoadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            ) : null}
            </>
          )}
        </CardContent>
      </Card>
      </div>

      {selected && (
        <SecurityDetailDrawer trace={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}

function SecurityDetailDrawer({
  trace,
  onClose,
}: {
  trace: TraceRecord
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const prompt = extractFirstUserPrompt(trace.event)
  const model = getModel(trace.event)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Security report"
      className="fixed inset-0 z-50 flex"
    >
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="flex h-full w-full max-w-xl flex-col border-l border-border/60 bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">Security Report</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(trace.ingested_at)}
              <span className="px-2 text-muted-foreground/40">·</span>
              <span className="font-mono">{trace.api_key_prefix}…</span>
              {model && (
                <>
                  <span className="px-2 text-muted-foreground/40">·</span>
                  <span className="font-mono">{model}</span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* User Prompt */}
        {prompt && (
          <div className="border-b border-border/60 px-6 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              User Prompt
            </p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/60 p-3 text-xs leading-relaxed">
              {prompt}
            </pre>
          </div>
        )}

        {/* Security detail */}
        <div className="flex-1 overflow-y-auto">
          <SecurityPanel trace={trace} />
        </div>
      </div>
    </div>
  )
}

export default SecurityOverview
