import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity01Icon,
  Alert02Icon,
  Cancel01Icon,
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
import { RealtimeStatusBanner } from "@/components/RealtimeStatusBanner"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { useRealtimeStream } from "@/lib/useRealtimeStream"
import { useAppSelector } from "@/store/hooks"

import { ALL_KEYS, TRACES_PAGE_SIZE } from "./constants"
import type {
  DrawerTab,
  EvaluationScore,
  TraceListResponse,
  TraceRecord,
} from "./types"
import { buildTraceTree, findGroupForTrace } from "./treeBuilder"
import { synthesizeAggregatedEvent } from "./aggregation"
import {
  formatCost,
  formatDate,
  formatLatency,
  getStr,
  isFailed,
  isRunning,
} from "./utils"
import { TraceTreeRows } from "./TraceTable"
import { JsonView } from "./JsonView"
import { DrawerTabButton } from "./DrawerPrimitives"
import { TraceUiView } from "./TraceUiView"
import { ArchitectureView } from "./ArchitectureView"
import { EvaluationsSection } from "./EvaluationsSection"
import { SecurityPanel } from "./SecurityPanel"

function Traces() {
  const { organization } = useAppSelector((s) => s.auth)

  const [traces, setTraces] = useState<TraceRecord[]>([])
  const [keyId, setKeyId] = useState<string>(ALL_KEYS)
  const [loading, setLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadOffset, setLoadOffset] = useState(TRACES_PAGE_SIZE)
  const [error, setError] = useState<string | null>(null)
  const [selectedTrace, setSelectedTrace] = useState<TraceRecord | null>(null)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("ui")
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  // fetchedSpanRoots: root trace IDs whose child spans have been loaded into state.
  // loadingSpanRoots: root trace IDs currently being fetched.
  const [fetchedSpanRoots, setFetchedSpanRoots] = useState<Set<string>>(new Set())
  const [loadingSpanRoots, setLoadingSpanRoots] = useState<Set<string>>(new Set())

  const apiKeys = useMemo(() => organization?.api_keys ?? [], [organization])
  const groups = useMemo(() => buildTraceTree(traces), [traces])
  // Derive the displayed selected trace from the latest `traces` list so
  // SSE enrichments (cost / evaluations) land in the open drawer without
  // an effect-driven setState. If the trace has scrolled off the current
  // page we fall back to the original selection rather than clearing it.
  const effectiveSelectedTrace = useMemo(() => {
    if (!selectedTrace) return null
    const tid = getStr(selectedTrace.event, "trace_id")
    if (!tid) return selectedTrace
    return traces.find((t) => getStr(t.event, "trace_id") === tid) ?? selectedTrace
  }, [traces, selectedTrace])
  const selectedGroup = useMemo(
    () =>
      effectiveSelectedTrace
        ? findGroupForTrace(groups, effectiveSelectedTrace)
        : null,
    [groups, effectiveSelectedTrace],
  )
  const selectedNodeId = useMemo(
    () =>
      effectiveSelectedTrace
        ? getStr(effectiveSelectedTrace.event, "trace_id")
        : null,
    [effectiveSelectedTrace],
  )

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  // fetchTraces: initial load (or refresh). Replaces the whole list with
  // root-only traces and resets span-fetch tracking.
  const fetchTraces = useCallback(async (selectedKeyId: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (selectedKeyId !== ALL_KEYS) params.set("key_id", selectedKeyId)
      params.set("limit", String(TRACES_PAGE_SIZE))
      params.set("offset", "0")
      params.set("roots_only", "true")
      const data = await authFetch<TraceListResponse>(
        `/api/v1/traces?${params.toString()}`,
      )
      setTraces(data.traces)
      setLoadOffset(TRACES_PAGE_SIZE)
      setHasMore(data.traces.length >= TRACES_PAGE_SIZE)
      setFetchedSpanRoots(new Set())
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load traces")
      setTraces([])
    } finally {
      setLoading(false)
    }
  }, [])

  // loadMore: appends the next page of root traces (no replace).
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const params = new URLSearchParams()
      if (keyId !== ALL_KEYS) params.set("key_id", keyId)
      params.set("limit", String(TRACES_PAGE_SIZE))
      params.set("offset", String(loadOffset))
      params.set("roots_only", "true")
      const data = await authFetch<TraceListResponse>(
        `/api/v1/traces?${params.toString()}`,
      )
      setTraces((prev) => {
        const seen = new Set(prev.map((t) => getStr(t.event, "trace_id")).filter(Boolean))
        const fresh = data.traces.filter((t) => {
          const tid = getStr(t.event, "trace_id")
          return tid && !seen.has(tid)
        })
        return fresh.length > 0 ? [...prev, ...fresh] : prev
      })
      setLoadOffset((o) => o + TRACES_PAGE_SIZE)
      setHasMore(data.traces.length >= TRACES_PAGE_SIZE)
    } catch {
      // silently fail — "Load more" button stays visible so user can retry
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, keyId, loadOffset])

  // expandRoot: fetches child spans for a root trace on first expand.
  // Safe to call repeatedly — deduplicates by fetchedSpanRoots.
  const expandRoot = useCallback(async (rootTraceId: string) => {
    if (fetchedSpanRoots.has(rootTraceId) || loadingSpanRoots.has(rootTraceId)) return
    setLoadingSpanRoots((prev) => new Set(prev).add(rootTraceId))
    try {
      const params = new URLSearchParams()
      params.set("root_trace_id", rootTraceId)
      params.set("limit", "500")
      const data = await authFetch<TraceListResponse>(
        `/api/v1/traces?${params.toString()}`,
      )
      setTraces((prev) => {
        const seen = new Set(prev.map((t) => getStr(t.event, "trace_id")).filter(Boolean))
        const spans = data.traces.filter((t) => {
          const tid = getStr(t.event, "trace_id")
          return tid && !seen.has(tid)
        })
        return spans.length > 0 ? [...prev, ...spans] : prev
      })
      setFetchedSpanRoots((prev) => new Set(prev).add(rootTraceId))
    } catch {
      // silently fail — user can retry by collapsing and re-expanding
    } finally {
      setLoadingSpanRoots((prev) => {
        const next = new Set(prev)
        next.delete(rootTraceId)
        return next
      })
    }
  }, [fetchedSpanRoots, loadingSpanRoots])

  const openTrace = useCallback((t: TraceRecord) => {
    setDrawerTab("ui")
    setSelectedTrace(t)
    // Pre-load spans so the architecture view is populated when the drawer opens.
    const tid = getStr(t.event, "trace_id")
    if (tid) void expandRoot(tid)
  }, [expandRoot])

  const focusTrace = useCallback((t: TraceRecord) => {
    setSelectedTrace(t)
  }, [])

  // keyId change: reset and reload from scratch.
  const handleKeyChange = useCallback((next: string) => {
    setKeyId(next)
    setLoading(true)
    setFetchedSpanRoots(new Set())
    setLoadingSpanRoots(new Set())
  }, [])

  // Auto-fetch on keyId change. Inlined as an async IIFE so every setState
  // happens after `await`, satisfying react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const params = new URLSearchParams()
        if (keyId !== ALL_KEYS) params.set("key_id", keyId)
        params.set("limit", String(TRACES_PAGE_SIZE))
        params.set("offset", "0")
        params.set("roots_only", "true")
        const data = await authFetch<TraceListResponse>(
          `/api/v1/traces?${params.toString()}`,
        )
        if (cancelled) return
        setTraces(data.traces)
        setLoadOffset(TRACES_PAGE_SIZE)
        setHasMore(data.traces.length >= TRACES_PAGE_SIZE)
        setFetchedSpanRoots(new Set())
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.detail : "Failed to load traces")
        setTraces([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [keyId])

  // Live stream: open one SSE connection per (keyId) filter and route new
  // traces into state. When the user is on page 0 we prepend in-place
  // (capped at TRACES_PAGE_SIZE so memory stays bounded); when paginated
  // back in time we just bump a counter so the user can opt in by clicking
  // the indicator. The Refresh button stays as a manual fallback.
  const streamPath = useMemo(() => {
    const params = new URLSearchParams()
    if (keyId !== ALL_KEYS) params.set("key_id", keyId)
    const qs = params.toString()
    return `/api/v1/traces/stream${qs ? `?${qs}` : ""}`
  }, [keyId])

  const { error: realtimeError } = useRealtimeStream({
    path: streamPath,
    events: ["trace", "trace.enriched", "trace.started"],
    onEvent: (data, msg) => {
      if (!data || typeof data !== "object") return

      if (msg.event === "trace.started") {
        const payload = data as {
          api_key_prefix?: string
          trace_id?: string
          ingested_at_ms?: number
          event?: Record<string, unknown>
        }
        if (!payload.event || typeof payload.event !== "object") return
        // Only prepend root-level placeholders; child spans are loaded lazily.
        const evtRoot = payload.event["root_trace_id"]
        const evtTid = payload.trace_id ?? payload.event["trace_id"]
        if (evtRoot && evtRoot !== evtTid) return
        const placeholder: TraceRecord = {
          api_key_prefix: payload.api_key_prefix ?? "",
          event: { ...payload.event, status: "running" },
          ingested_at: payload.ingested_at_ms
            ? new Date(payload.ingested_at_ms).toISOString()
            : new Date().toISOString(),
          cost: null,
          currency: null,
          evaluations: [],
        }
        setTraces((prev) => {
          const tid = payload.trace_id ?? getStr(placeholder.event, "trace_id")
          if (tid && prev.some((t) => getStr(t.event, "trace_id") === tid)) return prev
          return [placeholder, ...prev].slice(0, TRACES_PAGE_SIZE * 4)
        })
        return
      }

      if (msg.event === "trace.enriched") {
        const payload = data as {
          trace_id?: string
          cost?: number
          currency?: string
          evaluation?: EvaluationScore
        }
        const tid = payload.trace_id
        if (!tid) return
        setTraces((prev) => {
          let changed = false
          const next = prev.map((t) => {
            if (getStr(t.event, "trace_id") !== tid) return t
            changed = true
            const merged: TraceRecord = { ...t }
            if (typeof payload.cost === "number") {
              merged.cost = payload.cost
              merged.currency = payload.currency ?? t.currency ?? "USD"
            }
            if (payload.evaluation) {
              const incoming = payload.evaluation
              const existing = t.evaluations ?? []
              const idx = existing.findIndex(
                (e) => e.evaluator === incoming.evaluator && e.metric === incoming.metric,
              )
              merged.evaluations =
                idx >= 0
                  ? existing.map((e, i) => (i === idx ? incoming : e))
                  : [...existing, incoming]
            }
            return merged
          })
          return changed ? next : prev
        })
        return
      }

      // "trace" event \u2014 completed trace record.
      const payload = data as {
        api_key_prefix?: string
        trace_id?: string
        ingested_at_ms?: number
        event?: Record<string, unknown>
      }
      if (!payload.event || typeof payload.event !== "object") return
      // Only prepend root traces; child spans are loaded lazily on expand.
      const evtRoot = payload.event["root_trace_id"]
      const evtTid = payload.trace_id ?? payload.event["trace_id"]
      if (evtRoot && evtRoot !== evtTid) return
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
        if (newId) {
          const idx = prev.findIndex((t) => getStr(t.event, "trace_id") === newId)
          if (idx >= 0) {
            if (!isRunning(prev[idx].event)) return prev
            const next = prev.slice()
            next[idx] = newRecord
            return next
          }
        }
        return [newRecord, ...prev].slice(0, TRACES_PAGE_SIZE * 4)
      })
    },
  })

  // Catch up after the tab has been hidden: re-fetch root traces so cost /
  // evaluations that landed while hidden surface immediately.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") void fetchTraces(keyId)
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
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
        <div className="flex items-center gap-2">
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
      </div>

      <RealtimeStatusBanner
        error={realtimeError}
        fallbackHint="The Refresh button still works for historical traces."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Activity01Icon} size={16} />
                <CardTitle className="text-base">Recent traces</CardTitle>
              </div>
              <CardDescription>
                {traces.length === 0
                  ? "No traces yet"
                  : `${groups.length} root trace${groups.length === 1 ? "" : "s"} loaded`}
              </CardDescription>
            </div>
            <select
              value={keyId}
              onChange={(e) => handleKeyChange(e.target.value)}
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
                    <th className="px-6 py-2 font-medium">Cost</th>
                    <th className="px-6 py-2 font-medium">Quality</th>
                    <th className="px-6 py-2 font-medium">Integration</th>
                    <th className="px-6 py-2 font-medium">Security</th>
                    <th className="px-6 py-2 font-medium">Traces</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <TraceTreeRows
                      key={g.group_id}
                      node={g.root}
                      depth={0}
                      subtreeCount={g.count}
                      expandedNodes={expandedNodes}
                      toggleNode={toggleNode}
                      openTrace={openTrace}
                      fetchedSpanRoots={fetchedSpanRoots}
                      loadingSpanRoots={loadingSpanRoots}
                      onExpandRoot={expandRoot}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!error && hasMore ? (
            <div className="flex justify-center border-t border-border/60 px-6 py-3">
              <Button
                variant="outline"
                size="sm"
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
        </CardContent>
      </Card>

      {effectiveSelectedTrace ? (
        <TraceDrawer
          trace={effectiveSelectedTrace}
          group={selectedGroup}
          selectedNodeId={selectedNodeId}
          tab={drawerTab}
          onChangeTab={setDrawerTab}
          onClose={() => setSelectedTrace(null)}
          onFocusTrace={focusTrace}
        />
      ) : null}
    </>
  )
}

function TraceDrawer({
  trace,
  group,
  selectedNodeId,
  tab,
  onChangeTab,
  onClose,
  onFocusTrace,
}: {
  trace: TraceRecord
  group: ReturnType<typeof findGroupForTrace>
  selectedNodeId: string | null
  tab: DrawerTab
  onChangeTab: (tab: DrawerTab) => void
  onClose: () => void
  onFocusTrace: (t: TraceRecord) => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Trace details"
      className="fixed inset-0 z-50 flex"
    >
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="flex h-full w-full max-w-352 flex-col border-l border-border/60 bg-background shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg font-semibold">Trace details</h2>
              {isFailed(trace.event) ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
                  <HugeiconsIcon icon={Alert02Icon} size={10} />
                  Failed
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(trace.ingested_at)}
              <span className="px-2 text-muted-foreground/60">{"\u00b7"}</span>
              <span className="font-mono">{trace.api_key_prefix}{"\u2026"}</span>
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
        <div className="grid grid-cols-4 gap-4 border-b border-border/60 px-6 py-3 text-xs">
          <div>
            <div className="text-muted-foreground">Model</div>
            <div className="mt-0.5 font-mono">
              {getStr(trace.event, "model") ?? "\u2014"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Latency</div>
            <div className="mt-0.5">{formatLatency(trace.event["latency"])}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Cost</div>
            <div className="mt-0.5 font-mono">
              {formatCost(trace.cost, trace.currency)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Integration</div>
            <div className="mt-0.5">
              {getStr(trace.event, "integration") == "OTHERFUNCTION" ? "FUNCTION" : getStr(trace.event, "integration") ?? "\u2014"}
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-3 flex-col px-6 py-4">
            <ArchitectureView
              group={group}
              selectedNodeId={selectedNodeId}
              onSelectTrace={onFocusTrace}
            />
          </div>
          <div className="flex min-w-70 flex-1 flex-col border-l border-border/60">
            <EvaluationsSection evaluations={trace.evaluations} />
            <div className="flex items-center gap-1 border-b border-border/60 px-4 pt-3">
              <DrawerTabButton
                active={tab === "ui"}
                onClick={() => onChangeTab("ui")}
              >
                UI
              </DrawerTabButton>
              <DrawerTabButton
                active={tab === "json"}
                onClick={() => onChangeTab("json")}
              >
                JSON
              </DrawerTabButton>
              <DrawerTabButton
                active={tab === "security"}
                onClick={() => onChangeTab("security")}
              >
                SECURITY
              </DrawerTabButton>
            </div>
            <div className="flex-1 overflow-auto px-4 py-4">
              {tab === "json" ? (
                <JsonView value={trace.event} />
              ) : tab === "ui" ? (
                <TraceUiView event={synthesizeAggregatedEvent(trace, group)} />
              ) :
                <SecurityPanel trace={trace}/>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Traces
