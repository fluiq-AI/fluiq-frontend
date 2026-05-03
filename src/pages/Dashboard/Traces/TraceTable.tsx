import { Fragment } from "react"
import {
  Alert02Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  InformationCircleIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import type { TraceNode, TraceRecord } from "./types"
import {
  countSubtree,
  hasFailedDescendant,
  minSubtreeScore,
  minTraceScore,
  sumSubtreeCost,
} from "./treeBuilder"
import {
  formatCost,
  formatDate,
  formatLatency,
  formatScore,
  getStr,
  isFailed,
  isRunning,
  scoreBandClass,
} from "./utils"

export function TraceTreeRows({
  node,
  depth,
  subtreeCount,
  expandedNodes,
  toggleNode,
  openTrace,
}: {
  node: TraceNode
  depth: number
  subtreeCount?: number
  expandedNodes: Set<string>
  toggleNode: (id: string) => void
  openTrace: (t: TraceRecord) => void
}) {
  const t = node.trace
  const hasChildren = node.children.length > 0
  const isExpanded = expandedNodes.has(node.id)
  const isRoot = depth === 0
  const failed = isFailed(t.event)
  const running = isRunning(t.event)
  const subtreeFailed = hasFailedDescendant(node)
  const displayCount =
    typeof subtreeCount === "number" ? subtreeCount : countSubtree(node)
  const subtreeCost = hasChildren ? sumSubtreeCost(node) : t.cost ?? null
  const subtreeScore = hasChildren ? minSubtreeScore(node) : minTraceScore(t)
  const ownScore = minTraceScore(t)
  const indentStyle =
    depth > 0 ? { paddingLeft: `${1.5 + depth * 1.5}rem` } : undefined
  const rowClass = failed
    ? "border-b border-border/60 bg-destructive/10 align-middle"
    : running
    ? "border-b border-border/60 bg-primary/5 align-middle"
    : isRoot
    ? "border-b border-border/60 align-middle"
    : "border-b border-border/60 bg-muted/20 align-middle"
  const cellPad = isRoot ? "px-6 py-3" : "px-6 py-2"
  const textSize = isRoot ? "" : "text-xs"

  return (
    <Fragment>
      <tr className={rowClass}>
        <td
          className={cn(
            "whitespace-nowrap text-muted-foreground",
            cellPad,
            textSize,
          )}
          style={indentStyle}
        >
          {!isRoot ? (
            <span className="mr-2 text-muted-foreground/60">{"\u21B3"}</span>
          ) : null}
          {formatDate(t.ingested_at)}
        </td>
        <td className={cn("font-mono text-xs text-muted-foreground", cellPad)}>
          {t.api_key_prefix}
          <span className="text-muted-foreground/60">{"\u2026"}</span>
        </td>
        <td className={cn("font-mono text-xs", cellPad)}>
          {getStr(t.event, "model") ?? (
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
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  scoreBandClass(score),
                )}
                title={
                  hasChildren
                    ? `Worst eval score across ${displayCount} traces`
                    : (t.evaluations ?? [])
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
          <div className="flex flex-wrap items-center gap-2">
            <span>
              {getStr(t.event, "integration") ?? (
                <span className="text-muted-foreground/60">{"\u2014"}</span>
              )}
            </span>
            {failed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
                <HugeiconsIcon icon={Alert02Icon} size={10} />
                Failed
              </span>
            ) : null}
          </div>
        </td>
        <td className={cellPad}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleNode(node.id)}
              aria-label={isExpanded ? "Collapse trace group" : "Expand trace group"}
              aria-expanded={isExpanded}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <HugeiconsIcon
                icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
                size={14}
              />
              {displayCount}
              {!isExpanded && subtreeFailed ? (
                <span
                  aria-label="Contains failed traces"
                  className="ml-0.5 inline-block size-1.5 rounded-full bg-destructive"
                />
              ) : null}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">
              {isRoot ? 1 : ""}
            </span>
          )}
        </td>
        <td className={cellPad}>
          <button
            type="button"
            onClick={() => openTrace(t)}
            aria-label="View trace details"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <HugeiconsIcon icon={InformationCircleIcon} size={16} />
          </button>
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
            />
          ))
        : null}
    </Fragment>
  )
}
