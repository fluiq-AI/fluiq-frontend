import { useState } from "react"
import {
  AiBrain04Icon,
  ArrowDown01Icon,
  BotIcon,
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
import type { TraceGroup, TraceNode, TraceRecord } from "@/pages/Dashboard/Traces/utils/types"
import { formatLatency, isFailed } from "@/pages/Dashboard/Traces/utils"

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

// ── SpanNode ──────────────────────────────────────────────────────────────────

function SpanNode({
  node,
  depth,
  selectedTrace,
  onSelect,
}: {
  node: TraceNode
  depth: number
  selectedTrace: TraceRecord
  onSelect: (trace: TraceRecord) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
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
      {!collapsed
        ? node.children.map((child) => (
            <SpanNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedTrace={selectedTrace}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  )
}

// ── SpanTimeline ──────────────────────────────────────────────────────────────

export function SpanTimeline({
  group,
  selectedTrace,
  onSelectTrace,
  sticky = true,
}: {
  group: TraceGroup | null
  selectedTrace: TraceRecord
  onSelectTrace: (trace: TraceRecord) => void
  sticky?: boolean
}) {
  const spanCount = group?.count ?? 1

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
      <CardContent className="px-1 pb-3">
        {group ? (
          <div className="space-y-px">
            <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 px-2 pb-1 border-b border-border/40">
              {(["llm", "function", "tool", "agent"] as const).map((t) => (
                <span key={t} className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                  <HugeiconsIcon icon={spanTypeIcon(t)} size={10} />
                  {spanTypeLabel(t)}
                </span>
              ))}
            </div>
            <SpanNode
              node={group.root}
              depth={0}
              selectedTrace={selectedTrace}
              onSelect={onSelectTrace}
            />
          </div>
        ) : (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            No trace tree — standalone LLM call
          </div>
        )}
      </CardContent>
    </Card>
  )
}
