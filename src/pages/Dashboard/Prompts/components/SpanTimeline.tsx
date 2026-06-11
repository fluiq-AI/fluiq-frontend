import { useMemo, useState } from "react"
import {
  AiBrain04Icon,
  ArrowDown01Icon,
  BotIcon,
  Cancel01Icon,
  ChatGptIcon,
  ClaudeIcon,
  Database01Icon,
  FunctionSquareIcon,
  GoogleGeminiIcon,
  GridIcon,
  Link01Icon,
  McpServerIcon,
  ToolsIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ToolIO, ToolSelectFn, TraceGroup, TraceNode, TraceRecord } from "@/pages/Dashboard/Traces/utils/types"
import { formatLatency, isFailed, toolSelectionKey } from "@/pages/Dashboard/Traces/utils"
import {
  extractMcpToolCalls,
  extractResponseToolCalls,
  formatToolIOList,
  indexGroupMcpResults,
  indexGroupToolIO,
} from "@/pages/Dashboard/Traces/helpers/extractors"

// ── Icon helpers ──────────────────────────────────────────────────────────────

export function modelToIcon(model?: string | null) {
  if (!model) return AiBrain04Icon
  const m = model.toLowerCase()
  if (m.includes("gpt") || m.includes("openai")) return ChatGptIcon
  if (m.includes("claude") || m.includes("anthropic")) return ClaudeIcon
  if (m.includes("gemini") || m.includes("google")) return GoogleGeminiIcon
  return AiBrain04Icon
}

export function spanTypeIcon(type: string, model?: string | null) {
  switch (type) {
    case "llm":      return modelToIcon(model)
    case "function": return FunctionSquareIcon
    case "tool":     return ToolsIcon
    case "agent":    return BotIcon
    case "mcp":      return McpServerIcon
    case "chain":    return Link01Icon
    case "retriever":
    case "search_knowledge_base": return Database01Icon
    case "embedding": return GridIcon
    default:         return AiBrain04Icon
  }
}

export function spanTypeLabel(type: string): string {
  switch (type) {
    case "llm":      return "LLM"
    case "function": return "Fn"
    case "tool":     return "Tool"
    case "agent":    return "Agent"
    case "mcp":      return "MCP"
    case "chain":    return "Chain"
    case "retriever":
    case "search_knowledge_base": return "Retriever"
    case "embedding": return "Embed"
    default:         return type || "span"
  }
}

// ── Filter helpers ────────────────────────────────────────────────────────────

const TOGGLE_TYPES = ["llm", "function", "tool", "agent", "mcp", "chain", "retriever", "embedding"] as const

function nodeMatchesFilter(node: TraceNode, hidden: Set<string>, q: string): boolean {
  const e = node.trace.event
  const type = typeof e["type"] === "string" ? (e["type"] as string) : "function"
  if (hidden.has(type)) return false
  if (!q) return true
  const name =
    (typeof e["function"] === "string" && e["function"]) ? e["function"] as string
    : (typeof e["name"] === "string" && e["name"]) ? e["name"] as string
    : type
  if (name.toLowerCase().includes(q.toLowerCase())) return true
  return node.children.some((child) => nodeMatchesFilter(child, hidden, q))
}

function collectTypes(node: TraceNode, out: Set<string>) {
  const t = typeof node.trace.event["type"] === "string" ? node.trace.event["type"] as string : "function"
  out.add(t)
  node.children.forEach((c) => collectTypes(c, out))
}

// Embedded tool / MCP calls aren't trace spans, so they don't show up via
// collectTypes. Detect them so the "Tool"/"MCP" filter chips and the synthetic
// rows below appear even when no decorated span exists.
function hasEmbeddedToolCalls(node: TraceNode): boolean {
  if (extractResponseToolCalls(node.trace.event).length > 0) return true
  return node.children.some(hasEmbeddedToolCalls)
}

function hasMcpCalls(node: TraceNode): boolean {
  if (extractMcpToolCalls(node.trace.event).length > 0) return true
  return node.children.some(hasMcpCalls)
}

// ── CallRow ─────────────────────────────────────────────────────────────────
// A synthetic row for an embedded tool or MCP call. Shows the name (+ server
// for MCP), a hover tooltip with input/output, and selects the call's detail
// on click. Shared by both the tool and MCP paths.

function CallRow({
  name,
  input,
  output,
  server,
  depth,
  selected,
  icon,
  badge,
  onClick,
}: {
  name: string
  input: unknown
  output: unknown
  server?: string
  depth: number
  selected: boolean
  icon: typeof ToolsIcon
  badge: string
  onClick: () => void
}) {
  const inputStr = formatToolIOList([input], 800)
  const outputStr = output !== undefined && output !== null ? formatToolIOList([output], 800) : null
  const title =
    [inputStr ? `input:\n${inputStr}` : null, outputStr ? `output:\n${outputStr}` : null]
      .filter(Boolean)
      .join("\n\n") || undefined
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") onClick() }}
      title={title}
      className={cn(
        "flex min-w-0 cursor-pointer items-center gap-1.5 rounded-sm py-1 pr-2 text-xs transition-colors",
        selected
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted/40",
      )}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
    >
      <span className="w-3.5 shrink-0" />
      <HugeiconsIcon icon={icon} size={12} className="shrink-0 text-muted-foreground/70" />
      <span className="min-w-0 flex-1 truncate leading-none">{name}</span>
      {server ? (
        <span className="shrink-0 truncate font-mono text-[9px] text-muted-foreground/60">
          {server}
        </span>
      ) : null}
      <span className="shrink-0 rounded-full bg-muted px-1 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground/70">
        {badge}
      </span>
    </div>
  )
}

// ── SpanNode ──────────────────────────────────────────────────────────────────

function SpanNode({
  node,
  depth,
  selectedTrace,
  onSelect,
  searchQuery,
  hiddenTypes,
  toolIO,
  mcpResults,
  onSelectTool,
  selectedToolKey,
}: {
  node: TraceNode
  depth: number
  selectedTrace: TraceRecord
  onSelect: (trace: TraceRecord) => void
  searchQuery: string
  hiddenTypes: Set<string>
  toolIO: Map<string, ToolIO> | null
  mcpResults: Map<string, unknown> | null
  onSelectTool: ToolSelectFn
  selectedToolKey: string | null
}) {
  const [collapsed, setCollapsed] = useState(false)

  if (!nodeMatchesFilter(node, hiddenTypes, searchQuery)) return null

  const e = node.trace.event
  const type = typeof e["type"] === "string" ? (e["type"] as string) : "function"
  const name =
    (typeof e["function"] === "string" && e["function"]) ? e["function"] as string
    : (typeof e["name"] === "string" && e["name"]) ? e["name"] as string
    : type
  const model = typeof e["model"] === "string" ? e["model"] as string : null
  const latency = typeof e["latency"] === "number" ? e["latency"] as number : null
  const failed = isFailed(e)
  const isSelected = node.trace === selectedTrace
  const hasChildren = node.children.length > 0

  // Embedded tool / MCP calls made by this LLM span (no separate span exists).
  const q = searchQuery.toLowerCase()
  const embeddedToolCalls =
    type === "llm" && !hiddenTypes.has("tool")
      ? extractResponseToolCalls(e).filter(
          (c) => !q || c.name.toLowerCase().includes(q),
        )
      : []
  const mcpCalls =
    type === "llm" && !hiddenTypes.has("mcp")
      ? extractMcpToolCalls(e, mcpResults ?? undefined).filter(
          (c) => !q || c.name.toLowerCase().includes(q),
        )
      : []

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(node.trace)}
        onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") onSelect(node.trace) }}
        className={cn(
          "flex min-w-0 cursor-pointer items-center gap-1.5 rounded-sm py-1 pr-2 text-xs transition-colors",
          isSelected
            ? "bg-primary/10 font-medium text-primary"
            : failed
              ? "text-destructive hover:bg-destructive/5"
              : "text-foreground hover:bg-muted/40",
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(ev) => { ev.stopPropagation(); setCollapsed((v) => !v) }}
            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm text-muted-foreground/60 hover:text-muted-foreground"
          >
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={9}
              className={cn("transition-transform", collapsed && "-rotate-90")}
            />
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <HugeiconsIcon
          icon={spanTypeIcon(type, model)}
          size={12}
          className="shrink-0 text-muted-foreground/70"
        />
        <span className="min-w-0 flex-1 truncate leading-none">{name}</span>
        {latency != null ? (
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/70">
            {formatLatency(latency)}
          </span>
        ) : null}
      </div>
      {model ? (
        <div
          className="flex items-center gap-1.5 py-0.5 text-[10px] text-muted-foreground/60"
          style={{ paddingLeft: `${8 + (depth + 1) * 14 + 3.5 + 6}px` }}
        >
          <HugeiconsIcon icon={modelToIcon(model)} size={10} className="shrink-0" />
          <span className="truncate font-mono">{model}</span>
        </div>
      ) : null}
      {!collapsed ? (
        <>
          {embeddedToolCalls.map((call, i) => {
            const key = toolSelectionKey(e, node.id, call.name)
            const io = toolIO?.get(call.name)
            const output = io
              ? io.outputs.length === 1 ? io.outputs[0] : io.outputs
              : undefined
            return (
              <CallRow
                key={call.id ?? `tool-${call.name}-${i}`}
                name={call.name}
                input={call.arguments}
                output={output}
                depth={depth + 1}
                selected={selectedToolKey != null && selectedToolKey === key}
                icon={ToolsIcon}
                badge="tool"
                onClick={() => onSelectTool(node.trace, call.name, call.arguments, output)}
              />
            )
          })}
          {mcpCalls.map((call, i) => {
            const key = toolSelectionKey(e, node.id, call.name)
            return (
              <CallRow
                key={call.id ?? `mcp-${call.name}-${i}`}
                name={call.name}
                input={call.input}
                output={call.output}
                server={call.server}
                depth={depth + 1}
                selected={selectedToolKey != null && selectedToolKey === key}
                icon={McpServerIcon}
                badge="mcp"
                onClick={() => onSelectTool(node.trace, call.name, call.input, call.output, call.server)}
              />
            )
          })}
          {node.children.map((child) => (
            <SpanNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedTrace={selectedTrace}
              onSelect={onSelect}
              searchQuery={searchQuery}
              hiddenTypes={hiddenTypes}
              toolIO={toolIO}
              mcpResults={mcpResults}
              onSelectTool={onSelectTool}
              selectedToolKey={selectedToolKey}
            />
          ))}
        </>
      ) : null}
    </div>
  )
}

// ── SpanTimeline ──────────────────────────────────────────────────────────────

export function SpanTimeline({
  group,
  selectedTrace,
  onSelectTrace,
  onSelectTool = () => {},
  selectedToolKey = null,
  sticky = true,
  bare = false,
  onClose,
}: {
  group: TraceGroup | null
  selectedTrace: TraceRecord
  onSelectTrace: (trace: TraceRecord) => void
  onSelectTool?: ToolSelectFn
  selectedToolKey?: string | null
  sticky?: boolean
  bare?: boolean
  onClose?: () => void
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())

  function toggleType(t: string) {
    setHiddenTypes((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  const spanCount = group?.count ?? 1

  const presentTypes = useMemo(() => {
    if (!group) return new Set<string>()
    const types = new Set<string>()
    collectTypes(group.root, types)
    // Surface the "Tool"/"MCP" chips when embedded (non-span) calls exist, even
    // if no decorated span is present in the tree.
    if (hasEmbeddedToolCalls(group.root)) types.add("tool")
    if (hasMcpCalls(group.root)) types.add("mcp")
    return types
  }, [group])

  // Correlated input/output for synthetic rows: tools by name, MCP results by
  // call id. Feed the hover tooltips and the selection detail.
  const toolIO = useMemo(() => (group ? indexGroupToolIO(group) : null), [group])
  const mcpResults = useMemo(() => (group ? indexGroupMcpResults(group) : null), [group])

  const treeContent = group ? (
    <div className="space-y-1.5">
      <div className="px-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter spans…"
          className="w-full rounded-sm border border-border/50 bg-muted/30 px-2 py-1 text-[11px] outline-none placeholder:text-muted-foreground/50 focus:border-primary/50"
        />
      </div>
      {TOGGLE_TYPES.some((t) => presentTypes.has(t)) ? (
        <div className="flex flex-wrap gap-1 px-2 pb-1 border-b border-border/40">
          {TOGGLE_TYPES.filter((t) => presentTypes.has(t)).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              className={cn(
                "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] transition-colors",
                hiddenTypes.has(t)
                  ? "opacity-40 bg-muted/30 text-muted-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted",
              )}
            >
              <HugeiconsIcon icon={spanTypeIcon(t)} size={9} />
              {spanTypeLabel(t)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="space-y-px">
        <SpanNode
          node={group.root}
          depth={0}
          selectedTrace={selectedTrace}
          onSelect={onSelectTrace}
          searchQuery={searchQuery}
          hiddenTypes={hiddenTypes}
          toolIO={toolIO}
          mcpResults={mcpResults}
          onSelectTool={onSelectTool}
          selectedToolKey={selectedToolKey}
        />
      </div>
    </div>
  ) : (
    <div className="px-2 py-2 text-xs text-muted-foreground">
      No trace tree — standalone LLM call
    </div>
  )

  if (bare) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/40 px-3 py-2.5">
          <span className="text-sm font-semibold">Trace Tree</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {spanCount} span{spanCount !== 1 ? "s" : ""}
            </span>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={10} />
              </button>
            ) : null}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">{treeContent}</div>
      </div>
    )
  }

  return (
    <Card className={cn(sticky && "self-start sticky top-4")}>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Trace Tree</CardTitle>
          <span className="text-[11px] text-muted-foreground">
            {spanCount} span{spanCount !== 1 ? "s" : ""}
          </span>
        </div>
        <CardDescription className="text-[11px]">
          Execution context for this LLM call
        </CardDescription>
      </CardHeader>
      <CardContent className="px-1 pb-3">{treeContent}</CardContent>
    </Card>
  )
}
