import { useEffect, useMemo, useState } from "react"
import {
  Alert02Icon,
  Cancel01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { buildTraceTree, findGroupForTrace } from "@/pages/Dashboard/Traces/helpers/treeBuilder"
import { synthesizeAggregatedEvent } from "@/pages/Dashboard/Traces/helpers/aggregation"
import type {
  DrawerTab,
  TraceListResponse,
  TraceRecord,
} from "@/pages/Dashboard/Traces/utils/types"
import {
  formatCost,
  formatDate,
  formatLatency,
  getStr,
  isFailed,
  isRunning,
} from "@/pages/Dashboard/Traces/utils"
import { ArchitectureView } from "@/pages/Dashboard/Traces/components/ArchitectureView"
import {
  DrawerTabButton,
  LeftViewToggle,
  type LeftView,
} from "@/pages/Dashboard/Traces/components/DrawerPrimitives"
import { EvaluationsSection } from "@/pages/Dashboard/Traces/components/EvaluationsSection"
import { JsonView } from "@/pages/Dashboard/Traces/components/JsonView"
import { SecurityPanel } from "@/pages/Dashboard/Traces/components/SecurityPanel"
import { TraceUiView } from "@/pages/Dashboard/Traces/components/TraceUiView"
import { SpanTimeline } from "@/pages/Dashboard/Prompts/components/SpanTimeline"

import type { AgentRow } from "../utils/types"
import { KIND_CLASS, KIND_LABEL } from "./AgentTable"

export function AgentDrawer({
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
  // Tracks the root run whose spans populate the architecture view. Updated
  // only when the user picks a run from the left list — NOT when they click a
  // node inside the diagram, so the tree never gets wiped mid-interaction.
  const [traceSpansRoot, setTraceSpansRoot] = useState<TraceRecord | null>(null)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("ui")
  const [traceSpans, setTraceSpans] = useState<TraceRecord[]>([])
  const [leftView, setLeftView] = useState<LeftView>("architecture")
  const isTree = leftView === "tree"

  // Fetch the recent runs list (root traces only) for the left panel.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const params = new URLSearchParams()
        params.set("agent_key", agent.agent_key)
        params.set("agent_kind", agent.agent_kind)
        params.set("limit", "20")
        const data = await authFetch<TraceListResponse>(`/api/v1/traces?${params.toString()}`)
        if (cancelled) return
        setTraces(data.traces)
        if (data.traces.length > 0) {
          setSelectedTrace(data.traces[0])
          setTraceSpansRoot(data.traces[0])
        }
      } catch (err) {
        if (cancelled) return
        setTraceError(err instanceof ApiError ? err.detail : "Failed to load traces")
        setTraces([])
      } finally {
        if (!cancelled) setLoadingTraces(false)
      }
    })()
    return () => { cancelled = true }
  }, [agent.agent_key, agent.agent_kind])

  // When the selected root run changes, fetch all its spans so the architecture
  // view can render the full trace tree. This is intentionally decoupled from
  // selectedTrace so that clicking a node in the diagram (which updates
  // selectedTrace) does not re-fetch and wipe the tree.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const traceId = traceSpansRoot ? getStr(traceSpansRoot.event, "trace_id") : null
      if (!traceSpansRoot || !traceId) {
        if (!cancelled) setTraceSpans(traceSpansRoot ? [traceSpansRoot] : [])
        return
      }
      const params = new URLSearchParams()
      params.set("root_trace_id", traceId)
      params.set("limit", "500")
      try {
        const data = await authFetch<TraceListResponse>(`/api/v1/traces?${params.toString()}`)
        if (!cancelled) setTraceSpans(data.traces)
      } catch {
        if (!cancelled) setTraceSpans([traceSpansRoot])
      }
    })()
    return () => { cancelled = true }
  }, [traceSpansRoot])

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
      <div
        className={cn(
          "flex h-full w-full flex-col border-l border-border/60 bg-background shadow-xl",
          // Responsive: nearly full width on small screens, tapering on larger
          // viewports, capped so the dark overlay stays visible on wide monitors.
          "sm:w-[96vw] lg:w-[92vw] xl:w-[88vw]",
          isTree ? "max-w-[120rem]" : "max-w-[110rem]",
        )}
      >

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
                      setTraceSpansRoot(t)
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

          {/* Architecture / Trace Tree */}
          <div
            className={cn(
              "flex min-w-0 flex-col",
              // Trace Tree is a compact list, so this panel stays narrow and the
              // details panel gets maximum width. Architecture needs room for
              // the flow graph, so it takes the larger share.
              isTree ? "w-72 shrink-0 lg:w-80" : "flex-3",
            )}
          >
            <div className="flex items-center justify-between gap-2 px-4 pt-3">
              <LeftViewToggle value={leftView} onChange={setLeftView} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col px-2 pb-4 pt-3">
              {isTree ? (
                selectedTrace ? (
                  <SpanTimeline
                    group={selectedGroup}
                    selectedTrace={selectedTrace}
                    onSelectTrace={setSelectedTrace}
                    bare
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
                    Select a run to see its trace tree
                  </div>
                )
              ) : (
                <div className="flex min-h-0 flex-1 flex-col px-4">
                  <ArchitectureView
                    group={selectedGroup}
                    selectedNodeId={selectedNodeId}
                    onSelectTrace={setSelectedTrace}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Details panel */}
          <div className="flex min-w-70 flex-1 flex-col border-l border-border/60">
            {selectedTrace ? (
              <>
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
                  <DrawerTabButton
                    active={drawerTab === "evaluation"}
                    onClick={() => setDrawerTab("evaluation")}
                  >
                    <span className="flex items-center gap-1">
                      EVALUATION
                      {(selectedTrace.evaluations?.filter(e => e.evaluator !== "fluiq.security").length ?? 0) > 0 ? (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground tabular-nums">
                          {selectedTrace.evaluations!.filter(e => e.evaluator !== "fluiq.security").length}
                        </span>
                      ) : null}
                    </span>
                  </DrawerTabButton>
                  <DrawerTabButton
                    active={drawerTab === "security"}
                    onClick={() => setDrawerTab("security")}
                  >
                    SECURITY
                  </DrawerTabButton>
                </div>
                <div className="flex-1 overflow-auto px-4 py-4">
                  {drawerTab === "json" ? (
                    <JsonView value={selectedTrace.event} />
                  ) : drawerTab === "evaluation" ? (
                    <EvaluationsSection evaluations={selectedTrace.evaluations?.filter(e => e.evaluator !== "fluiq.security")} />
                  ) : drawerTab === "security" ? (
                    <SecurityPanel trace={selectedTrace} />
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
