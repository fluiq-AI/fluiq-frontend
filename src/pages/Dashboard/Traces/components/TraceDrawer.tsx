import { useState } from "react"
import { Alert02Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
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
import type { DrawerTab, TraceRecord } from "../utils/types"
import { formatCost, formatDate, formatLatency, getStr, isFailed } from "../utils"

export function TraceDrawer({
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
  const [leftView, setLeftView] = useState<LeftView>("architecture")
  const isTree = leftView === "tree"
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
          "flex h-full w-full flex-col border-l border-border/60 bg-background shadow-xl",
          // Responsive: nearly full width on small screens, tapering on larger
          // viewports, capped so the dark overlay stays visible on wide monitors.
          "sm:w-[95vw] lg:w-[90vw] xl:w-[85vw]",
          isTree ? "max-w-440" : "max-w-352",
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
              {getStr(trace.event, "model") ?? "—"}
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
                  bare
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col px-4">
                  <ArchitectureView
                    group={group}
                    selectedNodeId={selectedNodeId}
                    onSelectTrace={onFocusTrace}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex min-w-70 flex-1 flex-col border-l border-border/60">
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
                  {(trace.evaluations?.filter((e) => e.evaluator !== "fluiq.security").length ?? 0) > 0 ? (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground tabular-nums">
                      {trace.evaluations!.filter((e) => e.evaluator !== "fluiq.security").length}
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
                <JsonView value={trace.event} />
              ) : tab === "ui" ? (
                <TraceUiView event={synthesizeAggregatedEvent(trace, group)} />
              ) : tab === "evaluation" ? (
                <EvaluationsSection
                  evaluations={trace.evaluations?.filter((e) => e.evaluator !== "fluiq.security")}
                />
              ) : (
                <SecurityPanel trace={trace} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
