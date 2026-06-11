import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity01Icon,
  Alert02Icon,
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
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { RealtimeStatusBanner } from "@/components/RealtimeStatusBanner"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { useAppSelector } from "@/store/hooks"

import { ALL_KEYS, TRACES_PAGE_SIZE } from "@/pages/Dashboard/Traces/utils/constants"
import type { DrawerTab, SelectedTool, TraceFilters, TraceListResponse, TraceRecord } from "@/pages/Dashboard/Traces/utils/types"
import { buildTraceTree, findGroupForTrace } from "@/pages/Dashboard/Traces/helpers/treeBuilder"
import { getStr, toolSelectionKey } from "@/pages/Dashboard/Traces/utils"
import { TraceTreeRows } from "@/pages/Dashboard/Traces/components/TraceTable"
import { TraceDrawer } from "@/pages/Dashboard/Traces/components/TraceDrawer"
import { FilterBar } from "@/pages/Dashboard/Traces/components/FilterBar"
import { useTraceStream } from "@/pages/Dashboard/Traces/hooks/useTraceStream"
import { useTraceFilters } from "@/pages/Dashboard/Traces/hooks/useTraceFilters"

function buildParams(keyId: string, offset: number, filters: TraceFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (keyId !== ALL_KEYS) p.set("key_id", keyId)
  p.set("limit", String(TRACES_PAGE_SIZE))
  p.set("offset", String(offset))
  p.set("roots_only", "true")
  if (filters.sort        !== "newest") p.set("sort",        filters.sort)
  if (filters.status      !== "all")    p.set("status",      filters.status)
  if (filters.security    !== "all")    p.set("security",    filters.security)
  if (filters.integration !== "all")    p.set("integration", filters.integration)
  if (filters.quality     !== "all")    p.set("quality",     filters.quality)
  return p
}

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
  const [selectedTool, setSelectedTool] = useState<SelectedTool | null>(null)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("ui")
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [fetchedSpanRoots, setFetchedSpanRoots] = useState<Set<string>>(new Set())
  const [loadingSpanRoots, setLoadingSpanRoots] = useState<Set<string>>(new Set())

  const { filters, setFilter, clearFilters, activeFilterCount } = useTraceFilters()

  const apiKeys = useMemo(() => organization?.api_keys ?? [], [organization])
  const groups = useMemo(() => buildTraceTree(traces), [traces])

  const effectiveSelectedTrace = useMemo(() => {
    if (!selectedTrace) return null
    const tid = getStr(selectedTrace.event, "trace_id")
    if (!tid) return selectedTrace
    return traces.find((t) => getStr(t.event, "trace_id") === tid) ?? selectedTrace
  }, [traces, selectedTrace])

  const selectedGroup = useMemo(
    () => (effectiveSelectedTrace ? findGroupForTrace(groups, effectiveSelectedTrace) : null),
    [groups, effectiveSelectedTrace],
  )

  const selectedNodeId = useMemo(
    () => (effectiveSelectedTrace ? getStr(effectiveSelectedTrace.event, "trace_id") : null),
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
  // silent=true: no loading spinner, keep existing traces on API failure
  // (used by the SSE reconnect path so a transient error doesn't wipe the table).
  // prefetchRootSpans: silently fetches child spans for a set of root traces
  // immediately after load so sumSubtreeCost has data before the user expands.
  // Uses functional setTraces updaters and guards against stale results by
  // checking that the root trace is still in the list before merging children.
  const prefetchRootSpans = useCallback((rootTraces: TraceRecord[]) => {
    for (const t of rootTraces) {
      const rootId = getStr(t.event, "trace_id")
      if (!rootId) continue
      ;(async () => {
        try {
          const params = new URLSearchParams({ root_trace_id: rootId, limit: "500" })
          const data = await authFetch<TraceListResponse>(`/api/v1/traces?${params.toString()}`)
          setTraces((prev) => {
            if (!prev.some((r) => getStr(r.event, "trace_id") === rootId)) return prev
            const seen = new Set(prev.map((r) => getStr(r.event, "trace_id")).filter(Boolean))
            const fresh = data.traces.filter((r) => {
              const tid = getStr(r.event, "trace_id")
              return tid && !seen.has(tid)
            })
            return fresh.length > 0 ? [...prev, ...fresh] : prev
          })
          setFetchedSpanRoots((prev) => new Set(prev).add(rootId))
        } catch {
          // silently ignore — cost column falls back to root's own cost
        }
      })()
    }
  }, [])

  const fetchTraces = useCallback(async (currentKeyId: string, currentFilters: TraceFilters, silent = false) => {
    if (!silent) setLoading(true)
    if (!silent) setError(null)
    try {
      const data = await authFetch<TraceListResponse>(
        `/api/v1/traces?${buildParams(currentKeyId, 0, currentFilters).toString()}`,
      )
      setTraces(data.traces)
      setLoadOffset(TRACES_PAGE_SIZE)
      setHasMore(data.traces.length >= TRACES_PAGE_SIZE)
      setFetchedSpanRoots(new Set())
      prefetchRootSpans(data.traces)
    } catch (err) {
      if (!silent) {
        setError(err instanceof ApiError ? err.detail : "Failed to load traces")
        setTraces([])
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [prefetchRootSpans])

  // loadMore: appends the next page of root traces (no replace).
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const data = await authFetch<TraceListResponse>(
        `/api/v1/traces?${buildParams(keyId, loadOffset, filters).toString()}`,
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
  }, [isLoadingMore, hasMore, keyId, loadOffset, filters])

  // expandRoot: fetches child spans for a root trace on first expand.
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
    setSelectedTool(null)
    const tid = getStr(t.event, "trace_id")
    if (tid) void expandRoot(tid)
  }, [expandRoot])

  const focusTrace = useCallback((t: TraceRecord) => {
    setSelectedTrace(t)
    setSelectedTool(null)
  }, [])

  // Select an embedded tool call: keep the parent LLM as the focused trace (so
  // the flow graph and tree stay intact) and overlay the tool so the detail
  // panel shows its input/output. Reset to the UI tab so the switch is visible.
  const focusTool = useCallback<
    (parentTrace: TraceRecord, name: string, input: unknown, output: unknown, server?: string) => void
  >((parentTrace, name, input, output, server) => {
    const fallbackId = getStr(parentTrace.event, "trace_id") ?? ""
    setSelectedTrace(parentTrace)
    setSelectedTool({
      key: toolSelectionKey(parentTrace.event, fallbackId, name),
      name,
      input,
      output,
      server,
    })
    setDrawerTab("ui")
  }, [])

  const handleKeyChange = useCallback((next: string) => {
    setKeyId(next)
    setLoading(true)
    setFetchedSpanRoots(new Set())
    setLoadingSpanRoots(new Set())
  }, [])

  // Auto-fetch whenever keyId or filters change.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!cancelled) { setLoading(true); setError(null) }
      try {
        const data = await authFetch<TraceListResponse>(
          `/api/v1/traces?${buildParams(keyId, 0, filters).toString()}`,
        )
        if (cancelled) return
        setTraces(data.traces)
        setLoadOffset(TRACES_PAGE_SIZE)
        setHasMore(data.traces.length >= TRACES_PAGE_SIZE)
        setFetchedSpanRoots(new Set())
        prefetchRootSpans(data.traces)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.detail : "Failed to load traces")
        setTraces([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [keyId, filters, prefetchRootSpans])

  const { realtimeError } = useTraceStream({
    keyId,
    setTraces,
    onReopen: () => { void fetchTraces(keyId, filters, true) },
  })

  // Catch up after the tab has been hidden.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") void fetchTraces(keyId, filters)
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [fetchTraces, keyId, filters])

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
      <DashboardPageHeader
        title="Traces"
        description="Live request and span timeline from your instrumented pipelines."
      />
      <div className="px-6 py-6">
      
      <RealtimeStatusBanner
        error={realtimeError}
        fallbackHint="The Refresh button still works for historical traces."
      />

      <Card>
        <CardHeader>
          <div className="flex justify-between">
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
            <div>
              <Button variant="outline" size="sm" onClick={() => fetchTraces(keyId, filters)} disabled={loading}>
                <HugeiconsIcon
                  icon={loading ? Loading03Icon : RefreshIcon}
                  className={loading ? "animate-spin" : undefined}
                />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <FilterBar
            filters={filters}
            setFilter={setFilter}
            clearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
            apiKeys={apiKeys}
            keyId={keyId}
            onKeyChange={handleKeyChange}
            loading={loading}
          />
          
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
      </div>

      {effectiveSelectedTrace ? (
        <TraceDrawer
          trace={effectiveSelectedTrace}
          group={selectedGroup}
          selectedNodeId={selectedNodeId}
          selectedTool={selectedTool}
          tab={drawerTab}
          onChangeTab={setDrawerTab}
          onClose={() => { setSelectedTrace(null); setSelectedTool(null) }}
          onFocusTrace={focusTrace}
          onFocusTool={focusTool}
          onClearTool={() => setSelectedTool(null)}
        />
      ) : null}
    </>
  )
}

export default Traces
