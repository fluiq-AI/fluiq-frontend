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
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { useAppSelector } from "@/store/hooks"

import { ALL_KEYS, TRACES_PAGE_SIZE } from "./constants"
import type {
  DrawerTab,
  TraceListResponse,
  TraceRecord,
} from "./types"
import { buildTraceTree, findGroupForTrace } from "./treeBuilder"
import { synthesizeAggregatedEvent } from "./aggregation"
import { formatDate, formatLatency, getStr, isFailed } from "./utils"
import { TraceTreeRows } from "./TraceTable"
import { JsonView } from "./JsonView"
import { DrawerTabButton } from "./DrawerPrimitives"
import { TraceUiView } from "./TraceUiView"
import { ArchitectureView } from "./ArchitectureView"
import { EvaluationsSection } from "./EvaluationsSection"

function Traces() {
  const { organization } = useAppSelector((s) => s.auth)

  const [traces, setTraces] = useState<TraceRecord[]>([])
  const [keyId, setKeyId] = useState<string>(ALL_KEYS)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTrace, setSelectedTrace] = useState<TraceRecord | null>(null)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("ui")
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const apiKeys = useMemo(() => organization?.api_keys ?? [], [organization])
  const groups = useMemo(() => buildTraceTree(traces), [traces])
  const selectedGroup = useMemo(
    () => (selectedTrace ? findGroupForTrace(groups, selectedTrace) : null),
    [groups, selectedTrace],
  )
  const selectedNodeId = useMemo(
    () => (selectedTrace ? getStr(selectedTrace.event, "trace_id") : null),
    [selectedTrace],
  )

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  const openTrace = useCallback((t: TraceRecord) => {
    setDrawerTab("ui")
    setSelectedTrace(t)
  }, [])

  const focusTrace = useCallback((t: TraceRecord) => {
    setSelectedTrace(t)
  }, [])

  const fetchTraces = useCallback(
    async (selectedKeyId: string, pageIndex: number) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (selectedKeyId !== ALL_KEYS) params.set("key_id", selectedKeyId)
        params.set("limit", String(TRACES_PAGE_SIZE))
        params.set("offset", String(pageIndex * TRACES_PAGE_SIZE))
        const data = await authFetch<TraceListResponse>(
          `/api/v1/traces?${params.toString()}`,
        )
        setTraces(data.traces)
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Failed to load traces")
        setTraces([])
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    setPage(0)
  }, [keyId])

  useEffect(() => {
    void fetchTraces(keyId, page)
  }, [fetchTraces, keyId, page])

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
          onClick={() => fetchTraces(keyId, page)}
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
                {traces.length === 0
                  ? "No traces on this page"
                  : `Showing ${page * TRACES_PAGE_SIZE + 1}–${
                      page * TRACES_PAGE_SIZE + traces.length
                    } · page ${page + 1}`}
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
                    <th className="px-6 py-2 font-medium">Cost</th>
                    <th className="px-6 py-2 font-medium">Quality</th>
                    <th className="px-6 py-2 font-medium">Integration</th>
                    <th className="px-6 py-2 font-medium">Traces</th>
                    <th className="w-12 px-6 py-2 font-medium" aria-label="Details" />
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
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!error && (page > 0 || traces.length > 0) ? (
            <div className="flex items-center justify-between gap-4 border-t border-border/60 px-6 py-3 text-sm">
              <div className="text-muted-foreground">
                Page {page + 1}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={loading || page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading || traces.length < TRACES_PAGE_SIZE}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selectedTrace ? (
        <TraceDrawer
          trace={selectedTrace}
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
      <div className="flex h-full w-full max-w-[88rem] flex-col border-l border-border/60 bg-background shadow-xl">
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
        <div className="grid grid-cols-3 gap-4 border-b border-border/60 px-6 py-3 text-xs">
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
            <div className="text-muted-foreground">Integration</div>
            <div className="mt-0.5">
              {getStr(trace.event, "integration") ?? "\u2014"}
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-[3] flex-col px-6 py-4">
            <ArchitectureView
              group={group}
              selectedNodeId={selectedNodeId}
              onSelectTrace={onFocusTrace}
            />
          </div>
          <div className="flex min-w-[280px] flex-1 flex-col border-l border-border/60">
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
            </div>
            <div className="flex-1 overflow-auto px-4 py-4">
              {tab === "json" ? (
                <JsonView value={trace.event} />
              ) : (
                <TraceUiView event={synthesizeAggregatedEvent(trace, group)} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Traces
