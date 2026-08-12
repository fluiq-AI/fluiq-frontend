import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Cancel01Icon,
  Download04Icon,
  FilterIcon,
  Loading03Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Pagination } from "@/components/Pagination"

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditEvent {
  event_id:        string
  organization_id: string
  actor:           string
  event_type:      string
  http_method:     string
  http_path:       string
  http_status:     number
  ip_address:      string
  latency_ms:      number
  metadata:        Record<string, unknown>
  row_hash:        string
  created_at:      string | null
}

interface AuditLogResponse {
  events: AuditEvent[]
  limit:  number
  offset: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100

const EVENT_TYPE_LABELS: Record<string, string> = {
  auth_login:      "Login",
  auth_register:   "Register",
  auth_logout:     "Logout",
  auth_refresh:    "Token Refresh",
  api_key_created: "Key Created",
  api_key_deleted: "Key Deleted",
  security_check:  "Security Check",
  eval_run:        "Eval Run",
  llm_call:        "LLM Call",
  optimize_call:   "Optimize",
  admin_action:    "Admin Action",
  api_request:     "API Request",
}

const EVENT_TYPE_STYLES: Record<string, string> = {
  auth_login:      "bg-blue-500/12 text-blue-600",
  auth_register:   "bg-blue-500/12 text-blue-600",
  auth_logout:     "bg-blue-500/12 text-blue-600",
  auth_refresh:    "bg-blue-500/12 text-blue-600",
  api_key_created: "bg-violet-500/12 text-violet-600",
  api_key_deleted: "bg-violet-500/12 text-violet-600",
  security_check:  "bg-orange-500/12 text-orange-600",
  eval_run:        "bg-emerald-500/12 text-emerald-600",
  llm_call:        "bg-indigo-500/12 text-indigo-600",
  optimize_call:   "bg-yellow-500/12 text-yellow-700",
  admin_action:    "bg-red-500/12 text-red-600",
  api_request:     "bg-muted text-muted-foreground",
}

// optimize_call is no longer emitted, but historic rows still carry it, so it
// keeps its label and style above and is only dropped from the filter list.
const ALL_EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS).filter((t) => t !== "optimize_call")

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

function statusColor(code: number): string {
  if (code >= 500) return "text-red-600"
  if (code >= 400) return "text-orange-600"
  return "text-emerald-600"
}

function EventTypeBadge({ type }: { type: string }) {
  const style = EVENT_TYPE_STYLES[type] ?? "bg-muted text-muted-foreground"
  const label = EVENT_TYPE_LABELS[type] ?? type
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${style}`}>
      {label}
    </span>
  )
}

function exportCsv(events: AuditEvent[]) {
  const header = ["event_id", "created_at", "event_type", "actor", "http_method", "http_path", "http_status", "ip_address", "latency_ms", "row_hash"]
  const rows = events.map((e) => [
    e.event_id, e.created_at ?? "", e.event_type, e.actor,
    e.http_method, e.http_path, String(e.http_status), e.ip_address,
    String(e.latency_ms), e.row_hash,
  ])
  const csv = [header, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function AuditDetailDrawer({ event, onClose }: { event: AuditEvent; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" aria-label="Audit event detail" className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="flex h-full w-full max-w-lg flex-col border-l border-border/60 bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div>
            <h2 className="font-heading text-base font-semibold">Audit Event</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(event.created_at)}</p>
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

        <div className="flex-1 overflow-y-auto">
          {/* Summary grid */}
          <div className="grid grid-cols-2 gap-px border-b border-border/60 bg-border/40">
            {[
              { label: "Event Type",   value: <EventTypeBadge type={event.event_type} /> },
              { label: "Actor",        value: <span className="font-mono text-xs">{event.actor}</span> },
              { label: "Request",      value: <span className="font-mono text-xs">{event.http_method} {event.http_path}</span> },
              { label: "HTTP Status",  value: <span className={`font-mono text-xs font-semibold ${statusColor(event.http_status)}`}>{event.http_status}</span> },
              { label: "IP Address",   value: <span className="font-mono text-xs">{event.ip_address || "—"}</span> },
              { label: "Latency",      value: <span className="font-mono text-xs">{event.latency_ms} ms</span> },
            ].map(({ label, value }) => (
              <div key={label} className="bg-background px-4 py-3">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                {value}
              </div>
            ))}
          </div>

          {/* Metadata */}
          {Object.keys(event.metadata ?? {}).length > 0 && (
            <div className="border-b border-border/60 px-6 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Metadata</p>
              <pre className="overflow-auto rounded-md bg-muted/60 p-3 text-xs leading-relaxed">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Integrity */}
          <div className="px-6 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Integrity (HMAC-SHA256)
            </p>
            <p className="mb-1 text-[10px] text-muted-foreground">
              Computed over: event_id · organization_id · event_type · actor · created_at
            </p>
            <pre className="overflow-auto rounded-md bg-muted/60 p-3 font-mono text-[10px] leading-relaxed break-all">
              {event.row_hash}
            </pre>
          </div>

          {/* Event ID */}
          <div className="px-6 pb-6">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Event ID</p>
            <p className="font-mono text-xs text-muted-foreground">{event.event_id}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AuditLog() {
  const [events, setEvents]           = useState<AuditEvent[]>([])
  const [loading, setLoading]         = useState(true)
  const [hasMore, setHasMore]         = useState(false)
  const [page, setPage]               = useState(0)
  const [error, setError]             = useState<string | null>(null)
  const [selected, setSelected]       = useState<AuditEvent | null>(null)
  const [filterType, setFilterType]   = useState<string>("")
  const [refreshTick, setRefreshTick] = useState(0)

  // Changing the filter resets to the first page; refresh reloads it.
  const handleFilterChange = (type: string) => {
    setError(null)
    setPage(0)
    setFilterType(type)
  }

  const handleRefresh = () => {
    setError(null)
    setPage(0)
    setRefreshTick((t) => t + 1)
  }

  // Windowed pagination: fetch one page (replacing the list) on page / filter /
  // refresh change. `hasMore` = the page came back full.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const qs = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) })
    if (filterType) qs.set("event_type", filterType)
    authFetch<AuditLogResponse>(`/api/v1/audit?${qs}`)
      .then((data) => {
        if (cancelled) return
        setEvents(data.events)
        setHasMore(data.events.length >= PAGE_SIZE)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.detail : "Failed to load audit log")
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [filterType, refreshTick, page])

  return (
    <>
      <DashboardPageHeader
        title="Audit Log"
        description="Tamper-evident record of all API activity. EU AI Act · China AIGC · Colorado AI Act compliant."
      />

      <div className="px-6 py-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Activity log</CardTitle>
                <CardDescription>
                  {loading
                    ? "Loading…"
                    : `${events.length}${hasMore ? "+" : ""} event${events.length === 1 ? "" : "s"}${filterType ? ` · filtered by ${EVENT_TYPE_LABELS[filterType] ?? filterType}` : ""}`}
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                {/* Event type filter */}
                <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs text-muted-foreground">
                  <HugeiconsIcon icon={FilterIcon} size={12} />
                  <select
                    value={filterType}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="bg-transparent text-xs text-foreground outline-none"
                  >
                    <option value="">All events</option>
                    {ALL_EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>

                <Button variant="outline" size="sm" onClick={() => exportCsv(events)} disabled={events.length === 0}>
                  <HugeiconsIcon icon={Download04Icon} size={13} />
                  Export CSV
                </Button>

                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
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
            ) : events.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                No audit events found{filterType ? ` for "${EVENT_TYPE_LABELS[filterType] ?? filterType}"` : ""}.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-5 py-2 font-medium">Timestamp</th>
                        <th className="px-5 py-2 font-medium">Event</th>
                        <th className="px-5 py-2 font-medium">Actor</th>
                        <th className="px-5 py-2 font-medium">Request</th>
                        <th className="px-5 py-2 font-medium">Status</th>
                        <th className="px-5 py-2 font-medium">IP</th>
                        <th className="px-5 py-2 font-medium">Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((ev, i) => (
                        <tr
                          key={ev.event_id ?? i}
                          onClick={() => setSelected(ev)}
                          className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                        >
                          <td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">
                            {formatDate(ev.created_at)}
                          </td>
                          <td className="px-5 py-3">
                            <EventTypeBadge type={ev.event_type} />
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-foreground/80 max-w-[120px] truncate">
                            {ev.actor || "—"}
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-foreground/80 max-w-[200px] truncate">
                            <span className="font-semibold">{ev.http_method}</span>{" "}
                            {ev.http_path}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`font-mono text-xs font-semibold ${statusColor(ev.http_status)}`}>
                              {ev.http_status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted-foreground">
                            {ev.ip_address || "—"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted-foreground">
                            {ev.latency_ms} ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!error && (
                  <Pagination
                    page={page}
                    hasMore={hasMore}
                    loading={loading}
                    onPrev={() => setPage((p) => Math.max(0, p - 1))}
                    onNext={() => setPage((p) => p + 1)}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {selected && <AuditDetailDrawer event={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
