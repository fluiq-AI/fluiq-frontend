import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert02Icon,
  Cancel01Icon,
  Loading03Icon,
  WorkflowSquare01Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { buildTraceTree, findGroupForTrace } from "@/pages/Dashboard/Traces/helpers/treeBuilder"
import { synthesizeAggregatedEvent } from "@/pages/Dashboard/Traces/helpers/aggregation"
import { buildToolGrounding } from "@/pages/Dashboard/Traces/helpers/grounding"
import { buildUserPrompt, extractOutput } from "@/pages/Dashboard/Prompts/utils"
import type {
  DrawerTab,
  SelectedTool,
  ToolSelectFn,
  TraceListResponse,
  TraceRecord,
} from "@/pages/Dashboard/Traces/utils/types"
import {
  formatCost,
  formatDate,
  formatLatency,
  getModel,
  getStr,
  isFailed,
  isRunning,
  toolSelectionKey,
  traceToDatasetExample,
} from "@/pages/Dashboard/Traces/utils"
import { AddToDataset } from "@/components/AddToDataset"
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

// How many recent runs to pull for the left list. Smaller windows keep the
// (heavily joined) trace query snappy on agents with deep history; the user
// can widen it on demand.
type RunsLimit = 10 | 20 | 50 | 100
const RUNS_LIMITS: RunsLimit[] = [10, 20, 50, 100]

// "all" keeps the running placeholder at the top; "completed" hides in-flight
// runs (whose span tree is still empty) so the diagram never opens blank;
// "running" isolates live runs for debugging.
type RunsStatus = "all" | "completed" | "running"
const RUNS_STATUS: { id: RunsStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "completed", label: "Done" },
  { id: "running", label: "Live" },
]

// Compact toolbar for the Recent-runs list: a window-size dropdown plus a
// status segmented control. Mirrors the LeftViewToggle / index.tsx dropdown
// idiom so it reads as part of the same system.
function RunsFilter({
  limit,
  status,
  onLimitChange,
  onStatusChange,
}: {
  limit: RunsLimit
  status: RunsStatus
  onLimitChange: (v: RunsLimit) => void
  onStatusChange: (v: RunsStatus) => void
}) {
  return (
    <div className="space-y-2 border-b border-border/40 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Recent runs
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-6 items-center gap-1 rounded-md border border-border/60 bg-background px-2 font-mono text-[10px] tabular-nums shadow-xs transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:bg-muted/60">
            Last {limit}
            <span className="text-[9px] opacity-60">▾</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-28">
            <DropdownMenuRadioGroup
              value={String(limit)}
              onValueChange={(v) => onLimitChange(Number(v) as RunsLimit)}
            >
              {RUNS_LIMITS.map((n) => (
                <DropdownMenuRadioItem
                  key={n}
                  value={String(n)}
                  className="font-mono text-xs tabular-nums"
                >
                  Last {n}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="inline-flex w-full items-center rounded-md border border-border/60 bg-muted/30 p-0.5 text-[11px]">
        {RUNS_STATUS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onStatusChange(opt.id)}
            className={cn(
              "flex-1 rounded px-2 py-1 font-medium transition-colors",
              status === opt.id
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

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
  const [runsLimit, setRunsLimit] = useState<RunsLimit>(20)
  const [runsStatus, setRunsStatus] = useState<RunsStatus>("all")
  const [selectedTrace, setSelectedTrace] = useState<TraceRecord | null>(null)
  // Tracks the root run whose spans populate the architecture view. Updated
  // only when the user picks a run from the left list — NOT when they click a
  // node inside the diagram, so the tree never gets wiped mid-interaction.
  const [traceSpansRoot, setTraceSpansRoot] = useState<TraceRecord | null>(null)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("ui")
  const [traceSpans, setTraceSpans] = useState<TraceRecord[]>([])
  const [loadingSpans, setLoadingSpans] = useState(false)
  const [leftView, setLeftView] = useState<LeftView>("architecture")
  const [selectedTool, setSelectedTool] = useState<SelectedTool | null>(null)
  const isTree = leftView === "tree"

  // Selecting a node clears any selected tool so the detail returns to the
  // trace; selecting a tool keeps its parent trace focused (so the left panel
  // stays intact) and overlays the tool's input/output in the detail.
  const selectNode = useCallback((t: TraceRecord) => {
    setSelectedTrace(t)
    setSelectedTool(null)
  }, [])

  const focusTool = useCallback<ToolSelectFn>((parentTrace, name, input, output, server) => {
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

  // Fetch the recent runs list (root traces only) for the left panel. The
  // window size and status come from the filter so the heavily-joined query
  // stays cheap on agents with deep history. Re-runs whenever those change.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingTraces(true)
      setTraceError(null)
      try {
        const params = new URLSearchParams()
        params.set("agent_key", agent.agent_key)
        params.set("agent_kind", agent.agent_kind)
        params.set("limit", String(runsLimit))
        if (runsStatus !== "all") params.set("status", runsStatus)
        const data = await authFetch<TraceListResponse>(`/api/v1/traces?${params.toString()}`)
        if (cancelled) return
        setTraces(data.traces)
        // Auto-select the newest *completed* run so the diagram opens with a
        // real span tree instead of a still-running (empty) one. Fall back to
        // the newest run when every loaded run is in flight.
        const initial =
          data.traces.find((t) => !isRunning(t.event)) ?? data.traces[0] ?? null
        if (initial) {
          setSelectedTrace(initial)
          setTraceSpansRoot(initial)
        } else {
          setSelectedTrace(null)
          setTraceSpansRoot(null)
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
  }, [agent.agent_key, agent.agent_kind, runsLimit, runsStatus])

  // When the selected root run changes, fetch all its spans so the architecture
  // view can render the full trace tree. This is intentionally decoupled from
  // selectedTrace so that clicking a node in the diagram (which updates
  // selectedTrace) does not re-fetch and wipe the tree.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const traceId = traceSpansRoot ? getStr(traceSpansRoot.event, "trace_id") : null
      if (!traceSpansRoot || !traceId) {
        if (!cancelled) {
          setTraceSpans(traceSpansRoot ? [traceSpansRoot] : [])
          setLoadingSpans(false)
        }
        return
      }
      if (!cancelled) setLoadingSpans(true)
      const params = new URLSearchParams()
      params.set("root_trace_id", traceId)
      params.set("limit", "500")
      try {
        const data = await authFetch<TraceListResponse>(`/api/v1/traces?${params.toString()}`)
        if (!cancelled) setTraceSpans(data.traces)
      } catch {
        if (!cancelled) setTraceSpans([traceSpansRoot])
      } finally {
        if (!cancelled) setLoadingSpans(false)
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

  // When a tool is selected, the detail panel renders the tool's own
  // input/output via a synthetic `tool`-type event through the normal tab bar
  // (Evaluation/Security wired but empty until tool-level scoring lands).
  const detailTrace = useMemo<TraceRecord | null>(() => {
    if (!selectedTrace) return null
    if (!selectedTool) return selectedTrace
    return {
      ...selectedTrace,
      event: {
        type: "tool",
        integration: selectedTool.server ?? "TOOL",
        function: selectedTool.name,
        input: selectedTool.input,
        output: selectedTool.output,
      },
      evaluations: [],
    }
  }, [selectedTrace, selectedTool])
  const evalCount =
    detailTrace?.evaluations?.filter((e) => e.evaluator !== "fluiq.security").length ?? 0

  // Mirror the Traces drawer so the Evaluation tab can *run* an eval here too,
  // not just display existing scores. Run controls only make sense on the run's
  // root span; a single LLM turn (even with tool calls) is metric mode, 2+ LLM
  // turns is agentic — counted the same way as TraceDrawer.
  const isRootTrace = useMemo(() => {
    if (!selectedTrace || !selectedGroup) return false
    const tid = getStr(selectedTrace.event, "trace_id")
    if (!tid) return false
    const rtid = getStr(selectedTrace.event, "root_trace_id")
    if (!rtid || rtid === tid) return true
    return getStr(selectedGroup.root?.trace?.event ?? {}, "trace_id") === tid
  }, [selectedTrace, selectedGroup])

  const isMultiRun = useMemo(() => {
    const countLlm = (n: { trace: TraceRecord; children: unknown[] } | undefined): number => {
      if (!n) return 0
      let c = getStr(n.trace.event, "type") === "llm" ? 1 : 0
      for (const ch of n.children) c += countLlm(ch as { trace: TraceRecord; children: unknown[] })
      return c
    }
    return countLlm(selectedGroup?.root) > 1
  }, [selectedGroup])

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
          "flex h-full flex-col border-l border-border/60 bg-background shadow-xl",
          // Near-fullscreen on every screen size: the drawer always spans the
          // full viewport minus a fixed ~40px, leaving just a thin clickable
          // sliver of the dark overlay to dismiss it. No max-width cap, so it
          // scales the same on laptops and ultrawide monitors alike.
          "w-[calc(100vw_-_40px)] max-w-none",
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
          <div className="flex w-60 shrink-0 flex-col border-r border-border/60">
            <RunsFilter
              limit={runsLimit}
              status={runsStatus}
              onLimitChange={setRunsLimit}
              onStatusChange={setRunsStatus}
            />
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
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
                {runsStatus === "all"
                  ? "No traces found"
                  : `No ${runsStatus === "completed" ? "completed" : "running"} runs found`}
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
                      setSelectedTool(null)
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
              {selectedTrace && loadingSpans ? (
                // Spans for the picked run are still loading. Show a spinner
                // here instead of letting the views render a null group (which
                // would flash "unavailable" / an empty tree).
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
                  <div className="relative">
                    <HugeiconsIcon
                      icon={WorkflowSquare01Icon}
                      size={26}
                      className="opacity-20"
                    />
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      size={14}
                      className="absolute -bottom-1 -right-1 animate-spin text-primary"
                    />
                  </div>
                  <span className="text-xs">
                    Loading {isTree ? "trace tree" : "architecture"}…
                  </span>
                </div>
              ) : isTree ? (
                selectedTrace ? (
                  <SpanTimeline
                    group={selectedGroup}
                    selectedTrace={selectedTrace}
                    onSelectTrace={selectNode}
                    onSelectTool={focusTool}
                    selectedToolKey={selectedTool?.key ?? null}
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
                    onSelectTrace={selectNode}
                    onSelectTool={focusTool}
                    selectedToolKey={selectedTool?.key ?? null}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Details panel */}
          <div className="flex min-w-70 flex-1 flex-col border-l border-border/60">
            {selectedTrace && detailTrace ? (
              <>
                {selectedTool ? (
                  <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedTool(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {getModel(selectedTrace.event) ?? "Trace"}
                    </button>
                    <span className="text-muted-foreground/50">/</span>
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      <HugeiconsIcon icon={Wrench01Icon} size={12} />
                      <span className="font-mono">{selectedTool.name}</span>
                      {selectedTool.server ? (
                        <span className="font-mono text-muted-foreground">
                          {"·"} {selectedTool.server}
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedTool(null)}
                      aria-label="Back to trace"
                      className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={12} />
                    </button>
                  </div>
                ) : null}
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
                      {evalCount > 0 ? (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground tabular-nums">
                          {evalCount}
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
                  <div className="ml-auto pb-1.5">
                    <AddToDataset
                      example={traceToDatasetExample(detailTrace)}
                      size="xs"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-auto px-4 py-4">
                  {drawerTab === "json" ? (
                    <JsonView value={detailTrace.event} />
                  ) : drawerTab === "evaluation" ? (
                    <EvaluationsSection
                      evaluations={detailTrace.evaluations?.filter(e => e.evaluator !== "fluiq.security")}
                      traceId={!selectedTool && isRootTrace ? getStr(detailTrace.event, "trace_id") || undefined : undefined}
                      rootTraceId={
                        !selectedTool && isRootTrace
                          ? getStr(detailTrace.event, "root_trace_id") ||
                            getStr(detailTrace.event, "trace_id") ||
                            undefined
                          : undefined
                      }
                      isMulti={isMultiRun}
                      prompt={buildUserPrompt(detailTrace.event as Record<string, unknown>)}
                      response={extractOutput(detailTrace.event as Record<string, unknown>)}
                      toolContext={buildToolGrounding(selectedGroup, detailTrace.event as Record<string, unknown>)}
                    />
                  ) : drawerTab === "security" ? (
                    <SecurityPanel trace={detailTrace} />
                  ) : (
                    <TraceUiView
                      event={synthesizeAggregatedEvent(detailTrace, selectedGroup)}
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
