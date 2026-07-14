import { useMemo, useState } from "react"
import { Alert02Icon, Cancel01Icon, Wrench01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { DrawerTabButton, LeftViewToggle, type LeftView } from "./DrawerPrimitives"
import { EvaluationsSection } from "./EvaluationsSection"
import { JsonView } from "./JsonView"
import { SecurityPanel } from "./SecurityPanel"
import { TraceUiView } from "./TraceUiView"
import { ArchitectureView } from "./ArchitectureView"
import { SpanTimeline } from "@/pages/Dashboard/Prompts/components/SpanTimeline"
import { synthesizeAggregatedEvent } from "../helpers/aggregation"
import { findGroupForTrace } from "../helpers/treeBuilder"
import type { DrawerTab, SelectedTool, ToolSelectFn, TraceRecord } from "../utils/types"
import { formatCost, formatDate, formatLatency, getModel, getStr, isFailed, traceToDatasetExample } from "../utils"
import { AddToDataset } from "@/components/AddToDataset"

export function TraceDrawer({
  trace,
  group,
  selectedNodeId,
  selectedTool,
  tab,
  onChangeTab,
  onClose,
  onFocusTrace,
  onFocusTool,
  onClearTool,
}: {
  trace: TraceRecord
  group: ReturnType<typeof findGroupForTrace>
  selectedNodeId: string | null
  selectedTool: SelectedTool | null
  tab: DrawerTab
  onChangeTab: (tab: DrawerTab) => void
  onClose: () => void
  onFocusTrace: (t: TraceRecord) => void
  onFocusTool: ToolSelectFn
  onClearTool: () => void
}) {
  const [leftView, setLeftView] = useState<LeftView>("architecture")
  const isTree = leftView === "tree"

  // When a tool is selected, the right-hand detail renders the tool's own
  // input/output (as a synthetic `tool`-type event routed through the normal
  // tab bar) while the left panel keeps showing the parent LLM's flow/tree.
  // Evaluation/Security tabs are intentionally wired but empty until tool-level
  // scoring lands.
  const detailTrace = useMemo<TraceRecord>(() => {
    if (!selectedTool) return trace
    return {
      ...trace,
      event: {
        type: "tool",
        integration: selectedTool.server ?? "TOOL",
        function: selectedTool.name,
        input: selectedTool.input,
        output: selectedTool.output,
      },
      evaluations: [],
    }
  }, [selectedTool, trace])
  const evalCount =
    detailTrace.evaluations?.filter((e) => e.evaluator !== "fluiq.security").length ?? 0

  // Agentic evaluation scores a whole run (the root span and its tool/MCP
  // subtree, keyed by root_trace_id), so the "Run Agentic Eval" button only
  // makes sense on a root trace. A trace is a root when it is its own root, has
  // no root_trace_id, or is the visible root of its group (the orphan-root case
  // where the real parent was never captured).
  const isRootTrace = useMemo(() => {
    const tid = getStr(trace.event, "trace_id")
    if (!tid) return false
    const rtid = getStr(trace.event, "root_trace_id")
    if (!rtid || rtid === tid) return true
    return getStr(group?.root?.trace?.event ?? {}, "trace_id") === tid
  }, [trace, group])
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Trace details"
      className="fixed inset-0 z-50 flex"
    >
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          "flex h-full flex-col border-l border-border/60 bg-background shadow-xl",
          // Near-fullscreen on every screen size: the drawer always spans the
          // full viewport minus a fixed 100px, leaving a clickable strip of the
          // dark overlay to dismiss it. No max-width cap, so it scales the same
          // on laptops and ultrawide monitors alike.
          "w-[calc(100vw_-_100px)] max-w-none",
        )}
      >
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
              <span className="px-2 text-muted-foreground/60">{"·"}</span>
              <span className="font-mono">{trace.api_key_prefix}{"…"}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Adding to a dataset captures the whole run (keyed by the root's
                trace_id), so it only makes sense on the root span — not on a
                child span or a selected tool overlay. */}
            {isRootTrace && !selectedTool ? (
              <AddToDataset example={traceToDatasetExample(detailTrace)} />
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 border-b border-border/60 px-6 py-3 text-xs">
          <div>
            <div className="text-muted-foreground">Model</div>
            <div className="mt-0.5 font-mono">
              {getModel(trace.event) ?? "—"}
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
              {getStr(trace.event, "integration") === "OTHERFUNCTION"
                ? "FUNCTION"
                : (getStr(trace.event, "integration") ?? "—")}
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <div
            className={cn(
              "flex min-w-0 flex-col",
              // Trace Tree is a compact list, so the left panel stays narrow and
              // the right (detail) panel gets maximum width. Architecture needs
              // room for the flow graph, so it takes the larger share.
              isTree ? "w-72 shrink-0 lg:w-80" : "flex-3",
            )}
          >
            <div className="flex items-center justify-between gap-2 px-4 pt-3">
              <LeftViewToggle value={leftView} onChange={setLeftView} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col px-2 pb-4 pt-3">
              {isTree ? (
                <SpanTimeline
                  group={group}
                  selectedTrace={trace}
                  onSelectTrace={onFocusTrace}
                  onSelectTool={onFocusTool}
                  selectedToolKey={selectedTool?.key ?? null}
                  bare
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col px-4">
                  <ArchitectureView
                    group={group}
                    selectedNodeId={selectedNodeId}
                    onSelectTrace={onFocusTrace}
                    onSelectTool={onFocusTool}
                    selectedToolKey={selectedTool?.key ?? null}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex min-w-70 flex-1 flex-col border-l border-border/60">
            {selectedTool ? (
              <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2 text-xs">
                <button
                  type="button"
                  onClick={onClearTool}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {getModel(trace.event) ?? "LLM call"}
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
                  onClick={onClearTool}
                  aria-label="Back to LLM call"
                  className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={12} />
                </button>
              </div>
            ) : null}
            <div className="flex items-center gap-1 border-b border-border/60 px-4 pt-3">
              <DrawerTabButton active={tab === "ui"} onClick={() => onChangeTab("ui")}>
                UI
              </DrawerTabButton>
              <DrawerTabButton active={tab === "json"} onClick={() => onChangeTab("json")}>
                JSON
              </DrawerTabButton>
              <DrawerTabButton
                active={tab === "evaluation"}
                onClick={() => onChangeTab("evaluation")}
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
                active={tab === "security"}
                onClick={() => onChangeTab("security")}
              >
                SECURITY
              </DrawerTabButton>
            </div>
            <div className="flex-1 overflow-auto px-4 py-4">
              {tab === "json" ? (
                <JsonView value={detailTrace.event} />
              ) : tab === "ui" ? (
                <TraceUiView event={synthesizeAggregatedEvent(detailTrace, group)} />
              ) : tab === "evaluation" ? (
                <EvaluationsSection
                  evaluations={detailTrace.evaluations?.filter((e) => e.evaluator !== "fluiq.security")}
                  traceId={isRootTrace ? getStr(trace.event, "trace_id") || undefined : undefined}
                  rootTraceId={
                    isRootTrace
                      ? getStr(trace.event, "root_trace_id") ||
                        getStr(trace.event, "trace_id") ||
                        undefined
                      : undefined
                  }
                />
              ) : (
                <SecurityPanel trace={detailTrace} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
