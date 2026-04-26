import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity01Icon,
  Alert02Icon,
  Cancel01Icon,
  InformationCircleIcon,
  Loading03Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { useAppSelector } from "@/store/hooks"

interface TraceRecord {
  api_key_prefix: string
  event: Record<string, unknown>
  ingested_at: string
}

interface TraceListResponse {
  traces: TraceRecord[]
  limit: number
  offset: number
}

const ALL_KEYS = "all"

function Traces() {
  const { organization } = useAppSelector((s) => s.auth)

  const [traces, setTraces] = useState<TraceRecord[]>([])
  const [keyId, setKeyId] = useState<string>(ALL_KEYS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTrace, setSelectedTrace] = useState<TraceRecord | null>(null)

  const apiKeys = useMemo(() => organization?.api_keys ?? [], [organization])

  const fetchTraces = useCallback(async (selectedKeyId: string) => {
    setLoading(true)
    setError(null)
    try {
      const qs = selectedKeyId === ALL_KEYS ? "" : `?key_id=${selectedKeyId}`
      const data = await authFetch<TraceListResponse>(`/api/v1/traces${qs}`)
      setTraces(data.traces)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load traces")
      setTraces([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTraces(keyId)
  }, [fetchTraces, keyId])

  useEffect(() => {
    if (!selectedTrace) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedTrace(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedTrace])

  if (!organization) return null

  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Traces
          </h1>
          <p className="mt-2 text-muted-foreground">
            Live request and span timeline from your instrumented pipelines.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchTraces(keyId)}
          disabled={loading}
        >
          <HugeiconsIcon
            icon={loading ? Loading03Icon : RefreshIcon}
            className={loading ? "animate-spin" : undefined}
          />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Activity01Icon} size={16} />
                <CardTitle className="text-base">Recent traces</CardTitle>
              </div>
              <CardDescription>
                {traces.length} {traces.length === 1 ? "trace" : "traces"} loaded
              </CardDescription>
            </div>
            <select
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              disabled={loading || apiKeys.length === 0}
              className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value={ALL_KEYS}>All API keys</option>
              {apiKeys.map((k) => (
                <option key={k.key_id} value={k.key_id}>
                  {k.name} ({k.prefix})
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="mx-6 mb-6 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <HugeiconsIcon icon={Alert02Icon} size={14} />
              {error}
            </div>
          ) : loading && traces.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Loading traces…
            </div>
          ) : traces.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              {apiKeys.length === 0
                ? "No API keys yet. Create one in API Management to start ingesting traces."
                : "No traces yet. Once your SDK starts emitting, sessions will land here."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2 font-medium">Ingested</th>
                    <th className="px-6 py-2 font-medium">Key</th>
                    <th className="px-6 py-2 font-medium">Model</th>
                    <th className="px-6 py-2 font-medium">Latency</th>
                    <th className="px-6 py-2 font-medium">Integration</th>
                    <th className="w-12 px-6 py-2 font-medium" aria-label="Details" />
                  </tr>
                </thead>
                <tbody>
                  {traces.map((t, i) => (
                    <tr
                      key={`${t.ingested_at}-${i}`}
                      className="border-b border-border/60 last:border-b-0 align-middle"
                    >
                      <td className="whitespace-nowrap px-6 py-3 text-muted-foreground">
                        {formatDate(t.ingested_at)}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                        {t.api_key_prefix}
                        <span className="text-muted-foreground/60">{"\u2026"}</span>
                      </td>
                      <td className="px-6 py-3 font-mono text-xs">
                        {getStr(t.event, "model") ?? (
                          <span className="text-muted-foreground/60">{"\u2014"}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-muted-foreground">
                        {formatLatency(t.event["latency"])}
                      </td>
                      <td className="px-6 py-3">
                        {getStr(t.event, "integration") ?? (
                          <span className="text-muted-foreground/60">{"\u2014"}</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedTrace(t)}
                          aria-label="View trace details"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <HugeiconsIcon icon={InformationCircleIcon} size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTrace ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Trace details"
          className="fixed inset-0 z-50 flex"
        >
          <div
            className="flex-1 bg-black/40"
            onClick={() => setSelectedTrace(null)}
          />
          <div className="flex h-full w-full max-w-xl flex-col border-l border-border/60 bg-background shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-4">
              <div>
                <h2 className="font-heading text-lg font-semibold">Trace details</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(selectedTrace.ingested_at)}
                  <span className="px-2 text-muted-foreground/60">{"\u00b7"}</span>
                  <span className="font-mono">{selectedTrace.api_key_prefix}{"\u2026"}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrace(null)}
                aria-label="Close"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b border-border/60 px-6 py-3 text-xs">
              <div>
                <div className="text-muted-foreground">Model</div>
                <div className="mt-0.5 font-mono">
                  {getStr(selectedTrace.event, "model") ?? "\u2014"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Latency</div>
                <div className="mt-0.5">{formatLatency(selectedTrace.event["latency"])}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Integration</div>
                <div className="mt-0.5">
                  {getStr(selectedTrace.event, "integration") ?? "\u2014"}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto px-6 py-4">
              <pre className="rounded-md border border-border/60 bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                {summarize(selectedTrace.event)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
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

function summarize(event: Record<string, unknown>): string {
  try {
    return JSON.stringify(event, null, 2)
  } catch {
    return String(event)
  }
}

function getStr(event: Record<string, unknown>, key: string): string | null {
  const v = event[key]
  if (typeof v === "string" && v.length > 0) return v
  return null
}

function formatLatency(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "\u2014"
  if (value < 1) return `${Math.round(value * 1000)}ms`
  return `${value.toFixed(2)}s`
}

export default Traces
