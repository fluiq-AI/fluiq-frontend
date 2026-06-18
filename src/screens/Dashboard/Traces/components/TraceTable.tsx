import { Fragment } from "react"
import {
  Alert02Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import type { TraceNode, TraceRecord } from "../utils/types"
import {
  countSubtree,
  hasBlockedDescendant,
  hasFailedDescendant,
  minSubtreeScore,
  minTraceScore,
  sumSubtreeCost,
} from "../helpers/treeBuilder"
import {
  formatCost,
  formatDate,
  formatLatency,
  formatScore,
  getModel,
  getStr,
  isBlocked,
  isFailed,
  isRunning,
  scoreBandClass,
} from "../utils"

import { SecurityBadge } from "./SecurityPanel"

export function TraceTreeRows({
  node,
  depth,
  subtreeCount,
  expandedNodes,
  toggleNode,
  openTrace,
  fetchedSpanRoots = new Set(),
  loadingSpanRoots = new Set(),
  onExpandRoot,
}: {
  node: TraceNode
  depth: number
  subtreeCount?: number
  expandedNodes: Set<string>
  toggleNode: (id: string) => void
  openTrace: (t: TraceRecord) => void
  fetchedSpanRoots?: Set<string>
  loadingSpanRoots?: Set<string>
  onExpandRoot?: (traceId: string) => void
}) {
  const t = node.trace
  const hasChildren = node.children.length > 0
  const isExpanded = expandedNodes.has(node.id)
  const isRoot = depth === 0
  const isSpansFetched = isRoot && fetchedSpanRoots.has(node.id)
  const isSpansLoading = isRoot && loadingSpanRoots.has(node.id)
  // Show the expand toggle on root rows until we know the trace is a leaf
  // (fetched and came back with no children). While loading, show a spinner.
  const showExpandToggle = hasChildren || isSpansLoading || (isRoot && !isSpansFetched)
  const failed = isFailed(t.event)
  const blocked = isBlocked(t.event)
  const running = isRunning(t.event)
  const subtreeFailed = hasFailedDescendant(node)
  const subtreeBlocked = hasBlockedDescendant(node)
  const displayCount =
    typeof subtreeCount === "number" ? subtreeCount : countSubtree(node)
  const subtreeCost = hasChildren ? sumSubtreeCost(node) : t.cost ?? null
  const subtreeScore = hasChildren ? minSubtreeScore(node) : minTraceScore(t)
  const ownScore = minTraceScore(t)
  const indentStyle =
    depth > 0 ? { paddingLeft: `${1.5 + depth * 1.5}rem` } : undefined
  const rowClass = failed
    ? "border-b border-border/60 bg-destructive/10 align-middle"
    : blocked
    ? "border-b border-border/60 bg-red-500/5 align-middle"
    : running
    ? "border-b border-border/60 bg-primary/5 align-middle"
    : isRoot
    ? "border-b border-border/60 align-middle"
    : "border-b border-border/60 bg-muted/20 align-middle"
  const cellPad = isRoot ? "px-4 py-3" : "px-4 py-2"
  const textSize = isRoot ? "" : "text-xs"

  return (
    <Fragment>
      <tr className={cn(rowClass, "cursor-pointer")} onClick={() => openTrace(t)}>
        <td
          className={cn(
            "whitespace-wrap text-xs text-muted-foreground",
            cellPad,
            textSize,
          )}
          style={indentStyle}
        >
          {!isRoot ? (
            <span className="mr-2 text-muted-foreground/60">{"\u21B3"}</span>
          ) : null}
          {formatDate(t.ingested_at).split(",")[0]+","+formatDate(t.ingested_at).split(",")[1]}
          <br/>
          {formatDate(t.ingested_at).split(",")[2]}
        </td>
        <td className={cn("font-mono text-xs text-muted-foreground", cellPad)}>
          {t.api_key_prefix}
          <span className="text-muted-foreground/60">{"\u2026"}</span>
        </td>
        <td className={cn("font-mono text-xs", cellPad)}>
          {getModel(t.event) ?? (
            <span className="text-muted-foreground/60">{"\u2014"}</span>
          )}
        </td>
        <td
          className={cn(
            "whitespace-nowrap text-muted-foreground",
            cellPad,
            textSize,
          )}
        >
          {running ? (
            <span className="inline-flex items-center gap-1.5 text-primary">
              <HugeiconsIcon
                icon={Loading03Icon}
                size={12}
                className="animate-spin"
              />
              <span className="text-[11px] font-medium uppercase tracking-wide">
                Running
              </span>
            </span>
          ) : (
            formatLatency(t.event["latency"])
          )}
        </td>
        <td
          className={cn(
            "whitespace-nowrap font-mono text-xs",
            cellPad,
            (hasChildren ? subtreeCost : t.cost) === null ||
              (hasChildren ? subtreeCost : t.cost) === undefined
              ? "text-muted-foreground/60"
              : "text-foreground",
          )}
        >
          {hasChildren ? (
            <span
              className="inline-flex items-center gap-1"
              title={`Rolled-up cost across ${displayCount} traces`}
            >
              {formatCost(subtreeCost, t.currency)}
              <span className="rounded bg-muted px-1 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                {"\u03A3"}
              </span>
            </span>
          ) : (
            formatCost(t.cost, t.currency)
          )}
        </td>
        <td className={cn("whitespace-nowrap", cellPad, textSize)}>
          {(() => {
            const score = hasChildren ? subtreeScore : ownScore
            if (score === null) {
              return (
                <span className="text-muted-foreground/60">{"\u2014"}</span>
              )
            }
            return (
              <span
                className={cn(
                  "inline-flex text-xs items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                  scoreBandClass(score),
                )}
                title={
                  hasChildren
                    ? `Worst eval score across ${displayCount} traces`
                    : (t.evaluations ?? [])
                        .filter((e) => e.evaluator !== "fluiq.security")
                        .map((e) => `${e.metric}: ${formatScore(e.score)}`)
                        .join("\n")
                }
              >
                {formatScore(score)}
                {hasChildren ? (
                  <span className="rounded bg-muted px-1 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    {"\u2193"}
                  </span>
                ) : null}
              </span>
            )
          })()}
        </td>
        <td className={cn(cellPad, textSize)}>
          <div className="flex flex-wrap text-xs items-center gap-1.5">
            {failed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
                <HugeiconsIcon icon={Alert02Icon} size={10} />
                Failed
              </span>
            ) : blocked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-600">
                <HugeiconsIcon icon={Alert02Icon} size={10} />
                Blocked
              </span>
            ) : (
              <>
                <span>
                  {(getStr(t.event, "integration") == "OTHERFUNCTION" ? "FUNCTION" : getStr(t.event, "integration")) ?? (
                    <span className="text-muted-foreground/60">{"\u2014"}</span>
                  )}
                </span>
                {/* The node itself is fine, but a step deeper in the tree
                    failed/blocked \u2014 an outline (vs. filled) chip distinguishes
                    "happened inside" from "this node", and forms a trail the
                    user can follow down to the offending span. Explains why a
                    healthy-looking root surfaces under the Failed/Blocked
                    filter. */}
                {subtreeFailed ? (
                  <span
                    title="A step inside this trace failed"
                    className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive/80"
                  >
                    <HugeiconsIcon icon={Alert02Icon} size={9} />
                    Failed step
                  </span>
                ) : subtreeBlocked ? (
                  <span
                    title="A step inside this trace was blocked"
                    className="inline-flex items-center gap-1 rounded-full border border-red-500/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-600/80"
                  >
                    <HugeiconsIcon icon={Alert02Icon} size={9} />
                    Blocked step
                  </span>
                ) : null}
              </>
            )}
          </div>
        </td>
        <td className={cn(cellPad, textSize)}>
          <SecurityBadge event={t.event} />
        </td>
        <td className={cellPad}>
          {showExpandToggle ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(node.id)
                if (isRoot && !isExpanded && !isSpansFetched && !isSpansLoading) {
                  onExpandRoot?.(node.id)
                }
              }}
              aria-label={isExpanded ? "Collapse trace group" : "Expand trace group"}
              aria-expanded={isExpanded}
              disabled={isSpansLoading}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
            >
              {isSpansLoading ? (
                <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
              ) : (
                <HugeiconsIcon icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon} size={14} />
              )}
              {displayCount}
              {!isExpanded && subtreeFailed ? (
                <span
                  aria-label="Contains failed steps"
                  className="ml-0.5 inline-block size-1.5 rounded-full bg-destructive"
                />
              ) : !isExpanded && subtreeBlocked ? (
                <span
                  aria-label="Contains blocked steps"
                  className="ml-0.5 inline-block size-1.5 rounded-full bg-red-500"
                />
              ) : null}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">
              {isRoot ? 1 : ""}
            </span>
          )}
        </td>
      </tr>
      {hasChildren && isExpanded
        ? node.children.map((child) => (
            <TraceTreeRows
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              openTrace={openTrace}
              fetchedSpanRoots={fetchedSpanRoots}
              loadingSpanRoots={loadingSpanRoots}
              onExpandRoot={onExpandRoot}
            />
          ))
        : null}
    </Fragment>
  )
}
