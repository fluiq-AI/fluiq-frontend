import { createContext, useContext, useEffect, useState } from "react"
import { Alert02Icon, WorkflowSquare01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge as RFEdge,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { cn } from "@/lib/utils"
import { FLOW_NODE_HEIGHT, FLOW_NODE_WIDTH } from "./constants"
import type { TraceGroup, TraceRecord } from "./types"
import {
  buildFlowElements,
  layoutFlowNodes,
  type TraceFlowNode,
} from "./flowGraph"

// Hovered flow id is propagated through context rather than the nodes array
// so React Flow doesn't rebuild every node on each mouse move.
const HoveredFlowIdContext = createContext<string | null>(null)

function TraceFlowNodeCard({ id, data }: NodeProps<TraceFlowNode>) {
  const {
    label,
    sublabel,
    icon,
    failed,
    selected,
    count,
    request,
    response,
    tokens,
    suppressTooltip,
    onSelect,
  } = data
  const hoveredId = useContext(HoveredFlowIdContext)
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
      style={{ width: FLOW_NODE_WIDTH, height: FLOW_NODE_HEIGHT }}
    >
      <div
        onClick={onSelect}
        className={cn(
          "flex h-full w-full cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-xs transition-colors hover:bg-muted/40",
          selected
            ? "border-primary bg-primary/5 ring-1 ring-primary/40"
            : "border-border/60",
          failed ? "border-destructive/60 bg-destructive/5" : undefined,
        )}
      >
        <Handle type="target" position={Position.Top} className="!opacity-0" />
        <Handle
          id="loop-target"
          type="target"
          position={Position.Right}
          className="!opacity-0"
        />
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
        {failed ? (
          <HugeiconsIcon
            icon={Alert02Icon}
            size={12}
            className="shrink-0 text-destructive"
          />
        ) : null}
        <Handle
          id="loop-source"
          type="source"
          position={Position.Right}
          className="!opacity-0"
        />
        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
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
                <pre className="max-h-32 overflow-auto rounded bg-muted/60 p-1.5 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words">
                  {request}
                </pre>
              </div>
            ) : null}
            {response !== null ? (
              <div className={hasTokens ? "mb-2" : undefined}>
                <div className="mb-1 font-medium text-muted-foreground">
                  Output
                </div>
                <pre className="max-h-32 overflow-auto rounded bg-muted/60 p-1.5 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words">
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

export function ArchitectureView({
  group,
  selectedNodeId,
  onSelectTrace,
}: {
  group: TraceGroup | null
  selectedNodeId: string | null
  onSelectTrace: (t: TraceRecord) => void
}) {
  const [hoveredFlowId, setHoveredFlowId] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<TraceFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([])

  // Rebuild on group/selection/handler changes, but preserve any user-dragged
  // positions by merging previous coords for ids that still exist. New ids
  // (or a fresh group) fall back to the dagre layout.
  useEffect(() => {
    if (!group) {
      setNodes([])
      setEdges([])
      return
    }
    const built = buildFlowElements(group, selectedNodeId, onSelectTrace)
    const laid = layoutFlowNodes(built.nodes, built.edges)
    setNodes((prev) => {
      const prevPos = new Map(prev.map((n) => [n.id, n.position]))
      return laid.map((n) => ({
        ...n,
        position: prevPos.get(n.id) ?? n.position,
      }))
    })
    setEdges(built.edges)
  }, [group, selectedNodeId, onSelectTrace, setNodes, setEdges])

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
      <div className="min-h-[320px] flex-1 rounded-md border border-border/60 bg-muted/20">
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
          </ReactFlow>
        </HoveredFlowIdContext.Provider>
      </div>
    </div>
  )
}
