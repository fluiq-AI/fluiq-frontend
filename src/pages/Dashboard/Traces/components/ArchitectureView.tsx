import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import {
  Alert02Icon,
  CloudServerIcon,
  Loading03Icon,
  RefreshIcon,
  Wrench01Icon,
  WorkflowSquare01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Background,
  Controls,
  Handle,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge as RFEdge,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { cn } from "@/lib/utils"
import {
  FLOW_NODE_HEIGHT,
  FLOW_NODE_WIDTH,
  FLOW_TOOL_ROWS_MAX,
} from "../utils/constants"
import type { ToolSelectFn, TraceGroup, TraceRecord } from "../utils/types"
import {
  buildFlowElements,
  layoutFlowNodes,
  type TraceFlowNode,
} from "../helpers/flowGraph"

// Hovered flow id is propagated through context rather than the nodes array
// so React Flow doesn't rebuild every node on each mouse move.
const HoveredFlowIdContext = createContext<string | null>(null)

function TraceFlowNodeCard({ id, data }: NodeProps<TraceFlowNode>) {
  const {
    label,
    sublabel,
    icon,
    failed,
    running,
    selected,
    count,
    request,
    response,
    tokens,
    suppressTooltip,
    onSelect,
    cacheEntries,
    rerankerEntries,
    toolEntries,
    nodeHeight,
  } = data
  const hoveredId = useContext(HoveredFlowIdContext)
  const isMergedCache = Array.isArray(cacheEntries) && cacheEntries.length > 0
  const isMergedReranker = Array.isArray(rerankerEntries) && rerankerEntries.length > 0
  const isMergedTools = Array.isArray(toolEntries) && toolEntries.length > 0
  const isMergedNode = isMergedCache || isMergedReranker || isMergedTools
  const effectiveHeight = nodeHeight ?? FLOW_NODE_HEIGHT
  const hasTokens =
    tokens !== null &&
    (typeof tokens.total === "number" ||
      typeof tokens.prompt === "number" ||
      typeof tokens.completion === "number")
  const hasTooltip =
    !suppressTooltip && (request !== null || response !== null || hasTokens)
  const showTooltip = hasTooltip && hoveredId === id
  return (
    <div
      className="relative"
      style={{ width: FLOW_NODE_WIDTH, height: effectiveHeight }}
    >
      <div
        onClick={onSelect}
        className={cn(
          "h-full w-full cursor-pointer rounded-md border bg-background text-sm shadow-xs transition-colors hover:bg-muted/40",
          isMergedNode
            ? "flex flex-col overflow-hidden"
            : "flex items-center gap-2 px-3 py-2",
          selected
            ? "border-primary bg-primary/5 ring-1 ring-primary/40"
            : "border-border/60",
          failed ? "border-destructive/60 bg-destructive/5" : undefined,
          running
            ? "border-dashed border-primary/70 bg-primary/5 animate-pulse"
            : undefined,
        )}
      >
        <Handle type="target" position={Position.Top} className="opacity-0!" />
        <Handle
          id="loop-target"
          type="target"
          position={Position.Right}
          className="opacity-0!"
        />
        {isMergedNode ? (
          <>
            {/* Shared header for merged cache / merged reranker nodes */}
            <div className="flex items-center gap-2 border-b border-border/30 px-3 py-2">
              <HugeiconsIcon
                icon={icon}
                size={16}
                className={cn(
                  "shrink-0",
                  failed ? "text-destructive" : "text-foreground",
                )}
              />
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "truncate font-medium",
                    failed ? "text-destructive" : undefined,
                  )}
                >
                  {label}
                </div>
              </div>
              {isMergedTools ? (
                <span
                  aria-label={`${toolEntries!.length} tools`}
                  className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary"
                >
                  {toolEntries!.length}
                </span>
              ) : null}
              {running ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={12}
                  className="shrink-0 animate-spin text-primary"
                  aria-label="Running"
                />
              ) : failed ? (
                <HugeiconsIcon
                  icon={Alert02Icon}
                  size={12}
                  className="shrink-0 text-destructive"
                />
              ) : null}
            </div>
            {/* Cache entries with hit-rate progress bars */}
            {isMergedCache ? (
              <div className="flex flex-col gap-1.5 px-3 py-2">
                {cacheEntries!.map((entry, i) => {
                  const pct =
                    entry.total > 0
                      ? Math.round((entry.hits / entry.total) * 100)
                      : 0
                  const barColor =
                    pct >= 80
                      ? "bg-emerald-500"
                      : pct >= 40
                        ? "bg-amber-500"
                        : "bg-destructive/60"
                  return (
                    <div key={i} className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-[10px] font-medium text-foreground">
                          {entry.kind ?? "cache"}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {entry.hits}/{entry.total}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", barColor)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {entry.toolNames && entry.toolNames.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5 pt-0.5">
                          {entry.toolNames.map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground"
                            >
                              <HugeiconsIcon icon={Wrench01Icon} size={8} />
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {entry.mcpNames && entry.mcpNames.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5 pt-0.5">
                          {entry.mcpNames.map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1 py-0.5 font-mono text-[9px] text-primary/80"
                            >
                              <HugeiconsIcon icon={CloudServerIcon} size={8} />
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : null}
            {/* Reranker entries with keep-ratio progress bars */}
            {isMergedReranker ? (
              <div className="flex flex-col gap-1.5 px-3 py-2">
                {rerankerEntries!.map((entry, i) => {
                  const stat =
                    entry.inputCount !== null && entry.outputCount !== null
                      ? `${entry.inputCount}\u2192${entry.outputCount}`
                      : null
                  return (
                    <div key={i} className="flex items-center justify-between gap-1">
                      <span className="truncate text-[10px] font-medium text-foreground">
                        {entry.reranker}
                      </span>
                      {stat !== null ? (
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {stat}
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : null}
            {/* Tools invoked across a collapsed agentic loop. Each row stays
                individually selectable (preserving tool-level selection) and
                stops propagation so it doesn't also trigger the node's own
                select handler. */}
            {isMergedTools ? (
              <div className="flex flex-col px-1.5 py-1">
                {toolEntries!.slice(0, FLOW_TOOL_ROWS_MAX).map((entry) => (
                  <button
                    key={`${entry.kind}:${entry.name}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      entry.onSelect?.()
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors hover:bg-muted",
                      entry.selected
                        ? "bg-primary/10 ring-1 ring-primary/40"
                        : undefined,
                    )}
                  >
                    <HugeiconsIcon
                      icon={entry.kind === "mcp" ? CloudServerIcon : Wrench01Icon}
                      size={11}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">
                      {entry.name}
                    </span>
                    {entry.count > 1 ? (
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {`×${entry.count}`}
                      </span>
                    ) : null}
                  </button>
                ))}
                {toolEntries!.length > FLOW_TOOL_ROWS_MAX ? (
                  <div className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    +{toolEntries!.length - FLOW_TOOL_ROWS_MAX} more
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <HugeiconsIcon
              icon={icon}
              size={16}
              className={cn(
                "shrink-0",
                failed ? "text-destructive" : "text-foreground",
              )}
            />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "truncate font-medium",
                  failed ? "text-destructive" : undefined,
                )}
              >
                {label}
              </div>
              {sublabel ? (
                <div className="truncate font-mono text-[10px] text-muted-foreground">
                  {sublabel}
                </div>
              ) : null}
            </div>
            {count > 1 ? (
              <span
                aria-label={`Executed ${count} times`}
                className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary"
              >
                {`\u00D7${count}`}
              </span>
            ) : null}
            {running ? (
              <HugeiconsIcon
                icon={Loading03Icon}
                size={12}
                className="shrink-0 animate-spin text-primary"
                aria-label="Running"
              />
            ) : failed ? (
              <HugeiconsIcon
                icon={Alert02Icon}
                size={12}
                className="shrink-0 text-destructive"
              />
            ) : null}
          </>
        )}
        <Handle
          id="loop-source"
          type="source"
          position={Position.Right}
          className="opacity-0!"
        />
        <Handle type="source" position={Position.Bottom} className="opacity-0!" />
      </div>
      {showTooltip ? (
        // Outer wrapper sits flush against the node's right edge so the cursor
        // can cross from the card to the tooltip without leaving the node's
        // DOM subtree (preserving onNodeMouseEnter); the 12px transparent
        // padding provides the visual gap. The `nowheel` class tells React
        // Flow to ignore wheel events here so scrolling the tooltip's content
        // doesn't zoom the canvas.
        <div
          className="nowheel absolute left-full top-0 z-50 pl-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-[320px] rounded-md border border-border/60 bg-popover p-2 text-[11px] shadow-md">
            {request !== null ? (
              <div className="mb-2">
                <div className="mb-1 font-medium text-muted-foreground">
                  Input
                </div>
                <pre className="max-h-32 overflow-auto rounded bg-muted/60 p-1.5 font-mono text-[10px] leading-relaxed whitespace-pre-wrap wrap-break-word">
                  {request}
                </pre>
              </div>
            ) : null}
            {response !== null ? (
              <div className={hasTokens ? "mb-2" : undefined}>
                <div className="mb-1 font-medium text-muted-foreground">
                  Output
                </div>
                <pre className="max-h-32 overflow-auto rounded bg-muted/60 p-1.5 font-mono text-[10px] leading-relaxed whitespace-pre-wrap wrap-break-word">
                  {response}
                </pre>
              </div>
            ) : null}
            {hasTokens && tokens !== null ? (
              <div>
                <div className="mb-1 font-medium text-muted-foreground">
                  Tokens
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 rounded bg-muted/60 p-1.5 font-mono text-[10px] leading-relaxed">
                  {typeof tokens.total === "number" ? (
                    <span>
                      <span className="text-muted-foreground">total</span>{" "}
                      {tokens.total.toLocaleString()}
                    </span>
                  ) : null}
                  {typeof tokens.prompt === "number" ? (
                    <span>
                      <span className="text-muted-foreground">prompt</span>{" "}
                      {tokens.prompt.toLocaleString()}
                    </span>
                  ) : null}
                  {typeof tokens.completion === "number" ? (
                    <span>
                      <span className="text-muted-foreground">completion</span>{" "}
                      {tokens.completion.toLocaleString()}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

const FLOW_NODE_TYPES = { trace: TraceFlowNodeCard }

function RearrangeButton({ onRearrange }: { onRearrange: () => void }) {
  const { fitView } = useReactFlow()
  return (
    <Panel position="top-right">
      <button
        type="button"
        onClick={() => {
          onRearrange()
          requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }))
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-xs hover:bg-muted hover:text-foreground"
      >
        <HugeiconsIcon icon={RefreshIcon} size={11} />
        Auto-layout
      </button>
    </Panel>
  )
}

export function ArchitectureView({
  group,
  selectedNodeId,
  onSelectTrace,
  onSelectTool = () => {},
  selectedToolKey = null,
}: {
  group: TraceGroup | null
  selectedNodeId: string | null
  onSelectTrace: (t: TraceRecord) => void
  onSelectTool?: ToolSelectFn
  selectedToolKey?: string | null
}) {
  const [hoveredFlowId, setHoveredFlowId] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<TraceFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([])
  const builtRef = useRef<{ nodes: TraceFlowNode[]; edges: RFEdge[] } | null>(null)

  // Rebuild on group/selection/handler changes, but preserve any user-dragged
  // positions by merging previous coords for ids that still exist. New ids
  // (or a fresh group) fall back to the dagre layout.
  useEffect(() => {
    if (!group) {
      setNodes([])
      setEdges([])
      builtRef.current = null
      return
    }
    const built = buildFlowElements(group, selectedNodeId, onSelectTrace, {
      selectedToolKey,
      onSelectTool,
    })
    builtRef.current = built
    const laid = layoutFlowNodes(built.nodes, built.edges)
    setNodes((prev) => {
      const prevPos = new Map(prev.map((n) => [n.id, n.position]))
      return laid.map((n) => ({
        ...n,
        position: prevPos.get(n.id) ?? n.position,
      }))
    })
    setEdges(built.edges)
  }, [group, selectedNodeId, onSelectTrace, onSelectTool, selectedToolKey, setNodes, setEdges])

  const rearrange = useCallback(() => {
    if (!builtRef.current) return
    setNodes(layoutFlowNodes(builtRef.current.nodes, builtRef.current.edges))
  }, [setNodes])

  if (!group) {
    return (
      <p className="text-sm text-muted-foreground">
        Architecture is unavailable for this trace.
      </p>
    )
  }
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <HugeiconsIcon icon={WorkflowSquare01Icon} size={14} />
        <span className="font-medium uppercase tracking-wide">Flow</span>
        <span>{"\u00b7"}</span>
        <span>
          {group.count} step{group.count === 1 ? "" : "s"}
        </span>
      </div>
      <div className="min-h-80 flex-1 rounded-md border border-border/60 bg-muted/20">
        <HoveredFlowIdContext.Provider value={hoveredFlowId}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={FLOW_NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll
            minZoom={0.2}
            maxZoom={1.5}
            onNodeMouseEnter={(_, node) => setHoveredFlowId(node.id)}
            onNodeMouseLeave={() => setHoveredFlowId(null)}
          >
            <Background gap={16} size={1} />
            <Controls showInteractive={false} />
            <RearrangeButton onRearrange={rearrange} />
          </ReactFlow>
        </HoveredFlowIdContext.Provider>
      </div>
    </div>
  )
}
