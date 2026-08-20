"use client"

import { useState } from "react"
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * The toolset a prompt is allowed to reach for.
 *
 * This lives on the prompt rather than on each run because for an agentic
 * prompt the tools *are* part of the prompt: the same instructions offered a
 * different set of tools is a different thing, and tool selection is precisely
 * what the agentic evaluator's L2 layer grades. Evaluating an agentic prompt
 * without its tools doesn't measure it — it measures a model that had nothing
 * to call.
 */

export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface McpServerDef {
  label: string
  url: string
  description: string
  tools: ToolDef[]
}

export function emptyTool(): ToolDef {
  return { name: "", description: "", parameters: { type: "object", properties: {} } }
}

export function emptyServer(): McpServerDef {
  return { label: "", url: "", description: "", tools: [] }
}

const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-2 py-1 text-xs " +
  "outline-none transition-colors focus:border-primary/50"

/** A JSON-schema textarea that reports its own parse errors as you type. */
function SchemaField({
  value,
  onChange,
}: {
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}) {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2))
  const [error, setError] = useState<string | null>(null)

  function handle(next: string) {
    setText(next)
    if (!next.trim()) {
      setError(null)
      onChange({ type: "object", properties: {} })
      return
    }
    try {
      const parsed = JSON.parse(next)
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setError("Must be a JSON object.")
        return
      }
      setError(null)
      onChange(parsed as Record<string, unknown>)
    } catch {
      // Surfaced here rather than on save: a schema typo found at save time
      // means retyping the whole tool.
      setError("Not valid JSON yet.")
    }
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => handle(e.target.value)}
        rows={5}
        spellCheck={false}
        className={cn(inputCls, "font-mono leading-relaxed", error && "border-destructive/60")}
        placeholder='{"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}'
      />
      {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
    </div>
  )
}

function ToolRow({
  tool,
  onChange,
  onRemove,
}: {
  tool: ToolDef
  onChange: (next: ToolDef) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-md border border-border/60 p-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <input
            value={tool.name}
            onChange={(e) => onChange({ ...tool, name: e.target.value })}
            placeholder="tool_name"
            className={cn(inputCls, "font-mono")}
          />
          <input
            value={tool.description}
            onChange={(e) => onChange({ ...tool, description: e.target.value })}
            placeholder="What it does — the model picks by this."
            className={inputCls}
          />
          <SchemaField
            value={tool.parameters}
            onChange={(parameters) => onChange({ ...tool, parameters })}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${tool.name || "tool"}`}
          className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-destructive"
        >
          <HugeiconsIcon icon={Delete02Icon} size={14} />
        </button>
      </div>
    </div>
  )
}

export function ToolsEditor({
  tools,
  mcpServers,
  onToolsChange,
  onMcpChange,
}: {
  tools: ToolDef[]
  mcpServers: McpServerDef[]
  onToolsChange: (next: ToolDef[]) => void
  onMcpChange: (next: McpServerDef[]) => void
}) {
  // Duplicate names are rejected by the API, but the model also can't
  // disambiguate them — so say it here, where the fix is one field away.
  const allNames = [
    ...tools.map((t) => t.name.trim()),
    ...mcpServers.flatMap((s) => s.tools.map((t) => t.name.trim())),
  ].filter(Boolean)
  const duplicates = allNames.filter((n, i) => allNames.indexOf(n) !== i)

  return (
    // The explanation of what a toolset is for lives in the dialog's
    // description, so it isn't repeated here.
    <div className="space-y-4">
      {duplicates.length > 0 ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">
          Duplicate tool {duplicates.length === 1 ? "name" : "names"}:{" "}
          {[...new Set(duplicates)].join(", ")}. The model selects by name, so a
          repeat is ambiguous.
        </p>
      ) : null}

      {/* ── Tools ── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold">Tools</h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToolsChange([...tools, emptyTool()])}
          >
            <HugeiconsIcon icon={Add01Icon} size={13} />
            Add tool
          </Button>
        </div>
        {tools.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 px-3 py-4 text-center text-[11px] text-muted-foreground">
            No tools. This prompt is evaluated as plain text generation.
          </p>
        ) : (
          <div className="space-y-2">
            {tools.map((tool, i) => (
              <ToolRow
                key={i}
                tool={tool}
                onChange={(next) =>
                  onToolsChange(tools.map((t, j) => (j === i ? next : t)))
                }
                onRemove={() => onToolsChange(tools.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── MCP servers ── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold">MCP servers</h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onMcpChange([...mcpServers, emptyServer()])}
          >
            <HugeiconsIcon icon={Add01Icon} size={13} />
            Add server
          </Button>
        </div>
        {mcpServers.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 px-3 py-4 text-center text-[11px] text-muted-foreground">
            No MCP servers. Add one to record which server a tool comes from —
            the evaluator reports MCP calls separately from local ones.
          </p>
        ) : (
          <div className="space-y-3">
            {mcpServers.map((server, i) => {
              const patch = (next: McpServerDef) =>
                onMcpChange(mcpServers.map((s, j) => (j === i ? next : s)))
              return (
                <div key={i} className="rounded-md border border-border/60 p-2.5">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <input
                        value={server.label}
                        onChange={(e) => patch({ ...server, label: e.target.value })}
                        placeholder="server-label"
                        className={cn(inputCls, "font-mono")}
                      />
                      <input
                        value={server.url}
                        onChange={(e) => patch({ ...server, url: e.target.value })}
                        placeholder="https://mcp.example.com/… (optional)"
                        className={inputCls}
                      />
                      <input
                        value={server.description}
                        onChange={(e) => patch({ ...server, description: e.target.value })}
                        placeholder="What this server provides (optional)"
                        className={inputCls}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onMcpChange(mcpServers.filter((_, j) => j !== i))}
                      aria-label={`Remove ${server.label || "server"}`}
                      className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={14} />
                    </button>
                  </div>

                  <div className="mt-2 space-y-2 border-l-2 border-border/60 pl-2.5">
                    {server.tools.map((tool, k) => (
                      <ToolRow
                        key={k}
                        tool={tool}
                        onChange={(next) =>
                          patch({
                            ...server,
                            tools: server.tools.map((t, m) => (m === k ? next : t)),
                          })
                        }
                        onRemove={() =>
                          patch({
                            ...server,
                            tools: server.tools.filter((_, m) => m !== k),
                          })
                        }
                      />
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => patch({ ...server, tools: [...server.tools, emptyTool()] })}
                    >
                      <HugeiconsIcon icon={Add01Icon} size={12} />
                      Add tool to {server.label || "this server"}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
