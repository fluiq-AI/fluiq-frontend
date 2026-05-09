import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert02Icon,
  Cancel01Icon,
  Loading03Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
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
import { buildTraceTree, findGroupForTrace } from "@/pages/Dashboard/Traces/treeBuilder"
import { synthesizeAggregatedEvent } from "@/pages/Dashboard/Traces/aggregation"
import type {
  DrawerTab,
  TraceListResponse,
  TraceRecord,
} from "@/pages/Dashboard/Traces/types"
import {
  formatCost,
  formatDate,
  formatLatency,
  getStr,
  isFailed,
  isRunning,
} from "@/pages/Dashboard/Traces/utils"
import { ArchitectureView } from "@/pages/Dashboard/Traces/ArchitectureView"
import { DrawerTabButton } from "@/pages/Dashboard/Traces/DrawerPrimitives"
import { EvaluationsSection } from "@/pages/Dashboard/Traces/EvaluationsSection"
import { JsonView } from "@/pages/Dashboard/Traces/JsonView"
import { TraceUiView } from "@/pages/Dashboard/Traces/TraceUiView"

import type { AgentRow, AgentSummaryResponse, SortKey } from "./types"
import { AgentTable, KIND_CLASS, KIND_LABEL } from "./AgentTable"

function Agents() {
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("last_run")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [selectedAgent, setSelectedAgent] = useState<AgentRow | null>(null)

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await authFetch<AgentSummaryResponse>(
        "/api/v1/agents/summary?limit=200",
      )
      setAgents(data.agents)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load agents")
      setAgents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  useEffect(() => {
    if (!selectedAgent) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedAgent(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedAgent])

  const sortedAgents = useMemo(() => {
    const arr = [...agents]
    const dir = sortDir === "asc" ? 1 : -1
    arr.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
    return arr
  }, [agents, sortKey, sortDir])

  const totals = useMemo(() => {
    let cost = 0
    let runs = 0
    let tokens = 0
    for (const a of agents) {
      cost += a.total_cost ?? 0
      runs += a.runs ?? 0
      tokens += a.total_tokens ?? 0
    }
    return { cost, runs, tokens }
  }, [agents])

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const selectedKey = selectedAgent
    ? `${selectedAgent.agent_key}__${selectedAgent.agent_kind}__${selectedAgent.integration}`
    : undefined

  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Agents
          </h1>
          <p className="mt-2 text-muted-foreground">
            Cost and usage rolled up across every run of each traced function,
            chain, or LangGraph node.
          </p>
        </div>
        <Button variant="outline" onClick={fetchAgents} disabled={loading}>
          <HugeiconsIcon
            icon={loading ? Loading03Icon : RefreshIcon}
            className={loading ? "animate-spin" : undefined}
          />
          Refresh
        </Button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryStat label="Agents" value={String(agents.length)} />
        <SummaryStat label="Total runs" value={totals.runs.toLocaleString()} />
        <SummaryStat label="Total cost" value={formatCost(totals.cost, "USD")} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-agent breakdown</CardTitle>
          <CardDescription>
            Click a row to inspect recent runs. Click a column header to sort.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="px-6 py-10 text-center text-sm text-destructive">
              {error}
            </div>
          ) : loading && agents.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Loading agents…
            </div>
          ) : agents.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No agent activity yet. Once your SDK starts emitting priced traces,
              roll-ups will appear here.
            </div>
          ) : (
            <AgentTable
              agents={sortedAgents}
              sortKey={sortKey}
              sortDir={sortDir}
              onToggleSort={toggleSort}
              selectedKey={selectedKey}
              onSelectAgent={setSelectedAgent}
            />
          )}
        </CardContent>
      </Card>

      {selectedAgent ? (
        <AgentDrawer
          key={selectedKey}
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      ) : null}
    </>
  )
}

function AgentDrawer({
  agent,
  onClose,
}: {
  agent: AgentRow
  onClose: () => void
}) {
  const [traces, setTraces] = useState<TraceRecord[]>([])
  const [loadingTraces, setLoadingTraces] = useState(true)
  const [traceError, setTraceError] = useState<string | null>(null)
  const [selectedTrace, setSelectedTrace] = useState<TraceRecord | null>(null)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("ui")
  const [traceSpans, setTraceSpans] = useState<TraceRecord[]>([])

  // Fetch the recent runs list (root traces only) for the left panel.
  useEffect(() => {
    setLoadingTraces(true)
    setTraceError(null)
    setSelectedTrace(null)
    const params = new URLSearchParams()
    params.set("agent_key", agent.agent_key)
    params.set("agent_kind", agent.agent_kind)
    params.set("limit", "20")
    authFetch<TraceListResponse>(`/api/v1/traces?${params.toString()}`)
      .then((data) => {
        setTraces(data.traces)
        if (data.traces.length > 0) setSelectedTrace(data.traces[0])
      })
      .catch((err) => {
        setTraceError(err instanceof ApiError ? err.detail : "Failed to load traces")
        setTraces([])
      })
      .finally(() => setLoadingTraces(false))
  }, [agent.agent_key, agent.agent_kind])

  // When a run is selected, fetch all its spans so the architecture view
  // can render the full trace tree rather than just the root node.
  useEffect(() => {
    if (!selectedTrace) {
      setTraceSpans([])
      return
    }
    const traceId = getStr(selectedTrace.event, "trace_id")
    if (!traceId) {
      setTraceSpans([selectedTrace])
      return
    }
    const params = new URLSearchParams()
    params.set("root_trace_id", traceId)
    params.set("limit", "500")
    authFetch<TraceListResponse>(`/api/v1/traces?${params.toString()}`)
      .then((data) => setTraceSpans(data.traces))
      .catch(() => setTraceSpans([selectedTrace]))
  }, [selectedTrace])

  const groups = useMemo(() => buildTraceTree(traceSpans), [traceSpans])

  const selectedGroup = useMemo(
    () => (selectedTrace ? findGroupForTrace(groups, selectedTrace) : null),
    [groups, selectedTrace],
  )

  const selectedNodeId = useMemo(
    () => (selectedTrace ? getStr(selectedTrace.event, "trace_id") : null),
    [selectedTrace],
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Agent details"
      className="fixed inset-0 z-50 flex"
    >
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="flex h-full w-full max-w-352 flex-col border-l border-border/60 bg-background shadow-xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-mono text-lg font-semibold">
                {agent.agent_key}
              </h2>
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                  KIND_CLASS[agent.agent_kind] ?? KIND_CLASS.llm,
                )}
              >
                {KIND_LABEL[agent.agent_kind] ?? agent.agent_kind}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {agent.integration === "OTHERFUNCTION"
                ? "FUNCTION"
                : agent.integration || "—"}
              <span className="px-2 text-muted-foreground/60">{"·"}</span>
              {agent.runs.toLocaleString()} runs
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

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 border-b border-border/60 px-6 py-3 text-xs">
          <div>
            <div className="text-muted-foreground">Total cost</div>
            <div className="mt-0.5 font-mono font-medium">
              {formatCost(agent.total_cost, "USD")}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Avg / run</div>
            <div className="mt-0.5 font-mono text-muted-foreground">
              {formatCost(agent.avg_cost_per_run, "USD")}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Tokens</div>
            <div className="mt-0.5 font-mono text-muted-foreground">
              {agent.total_tokens.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Avg latency</div>
            <div className="mt-0.5 text-muted-foreground">
              {formatLatency(agent.avg_latency)}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">

          {/* Recent runs list */}
          <div className="flex w-52 shrink-0 flex-col overflow-y-auto border-r border-border/60">
            <div className="border-b border-border/40 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Recent runs
            </div>
            {loadingTraces ? (
              <div className="flex flex-1 items-center justify-center py-8">
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={16}
                  className="animate-spin text-muted-foreground"
                />
              </div>
            ) : traceError ? (
              <div className="px-3 py-4 text-xs text-destructive">
                {traceError}
              </div>
            ) : traces.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                No traces found
              </div>
            ) : (
              traces.map((t) => {
                const tid = getStr(t.event, "trace_id")
                const selTid = selectedTrace
                  ? getStr(selectedTrace.event, "trace_id")
                  : null
                const isSelected = !!tid && tid === selTid
                const failed = isFailed(t.event)
                const running = isRunning(t.event)
                return (
                  <button
                    key={tid ?? t.ingested_at}
                    type="button"
                    onClick={() => {
                      setSelectedTrace(t)
                      setDrawerTab("ui")
                    }}
                    className={cn(
                      "w-full border-b border-border/40 px-3 py-2.5 text-left text-xs transition-colors hover:bg-muted/20",
                      isSelected
                        ? "border-l-2 border-l-primary bg-primary/5"
                        : "border-l-2 border-l-transparent",
                    )}
                  >
                    <div
                      className={cn(
                        "font-medium",
                        failed ? "text-destructive" : "text-foreground",
                      )}
                    >
                      {formatDate(t.ingested_at)}
                    </div>
                    <div className="mt-0.5 font-mono text-muted-foreground">
                      {formatLatency(t.event["latency"])}
                      {typeof t.cost === "number" && t.cost > 0
                        ? ` · ${formatCost(t.cost, t.currency)}`
                        : ""}
                    </div>
                    {running ? (
                      <span className="mt-0.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    ) : failed ? (
                      <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-destructive">
                        <HugeiconsIcon icon={Alert02Icon} size={10} />
                        failed
                      </span>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>

          {/* Architecture View */}
          <div className="flex min-w-0 flex-3 flex-col px-6 py-4">
            <ArchitectureView
              group={selectedGroup}
              selectedNodeId={selectedNodeId}
              onSelectTrace={setSelectedTrace}
            />
          </div>

          {/* Details panel */}
          <div className="flex min-w-70 flex-1 flex-col border-l border-border/60">
            {selectedTrace ? (
              <>
                <EvaluationsSection evaluations={selectedTrace.evaluations} />
                <div className="flex items-center gap-1 border-b border-border/60 px-4 pt-3">
                  <DrawerTabButton
                    active={drawerTab === "ui"}
                    onClick={() => setDrawerTab("ui")}
                  >
                    UI
                  </DrawerTabButton>
                  <DrawerTabButton
                    active={drawerTab === "json"}
                    onClick={() => setDrawerTab("json")}
                  >
                    JSON
                  </DrawerTabButton>
                </div>
                <div className="flex-1 overflow-auto px-4 py-4">
                  {drawerTab === "json" ? (
                    <JsonView value={selectedTrace.event} />
                  ) : (
                    <TraceUiView
                      event={synthesizeAggregatedEvent(selectedTrace, selectedGroup)}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
                Select a run to see details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

export default Agents
