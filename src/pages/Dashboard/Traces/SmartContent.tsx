import type { ToolLatencyMap } from "./types"
import { formatLatency, safeStringify } from "./utils"

export function SmartContent({
  value,
  latencies,
}: {
  value: unknown
  latencies?: ToolLatencyMap
}) {
  if (typeof value === "string") {
    return (
      <div className="whitespace-pre-wrap wrap-break-word text-xs">{value}</div>
    )
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <div className="text-xs text-muted-foreground">(empty)</div>
    }
    return (
      <div className="space-y-2">
        {value.map((item, idx) => (
          <SmartBlock key={idx} item={item} latencies={latencies} />
        ))}
      </div>
    )
  }
  if (value === undefined || value === null) return null
  return (
    <pre className="overflow-x-auto rounded bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
      {safeStringify(value)}
    </pre>
  )
}

function SmartBlock({
  item,
  latencies,
}: {
  item: unknown
  latencies?: ToolLatencyMap
}) {
  if (typeof item === "string") {
    return (
      <div className="whitespace-pre-wrap wrap-break-word text-xs">{item}</div>
    )
  }
  if (Array.isArray(item)) {
    return <SmartContent value={item} latencies={latencies} />
  }
  if (!item || typeof item !== "object") {
    return <div className="font-mono text-xs">{String(item)}</div>
  }
  const rec = item as Record<string, unknown>
  const type = rec["type"]

  if (type === "text" && typeof rec["text"] === "string") {
    return (
      <div className="whitespace-pre-wrap wrap-break-word text-xs">
        {rec["text"] as string}
      </div>
    )
  }

  // OpenAI Responses API text content: { type: "output_text", text: "...", annotations, logprobs }
  if (type === "output_text" && typeof rec["text"] === "string") {
    return (
      <div className="whitespace-pre-wrap wrap-break-word text-xs">
        {rec["text"] as string}
      </div>
    )
  }

  // OpenAI Responses API assistant message wrapper: { type: "message", role, content: [...] }
  if (type === "message" && Array.isArray(rec["content"])) {
    return <SmartContent value={rec["content"]} latencies={latencies} />
  }

  // Gemini text part: { text: "..." } with no `type`
  if (
    type === undefined &&
    typeof rec["text"] === "string" &&
    !("function_call" in rec) &&
    !("function_response" in rec)
  ) {
    return (
      <div className="whitespace-pre-wrap wrap-break-word text-xs">
        {rec["text"] as string}
      </div>
    )
  }

  // Gemini function_call part: { function_call: { name, args }, thought_signature? }
  if (rec["function_call"] && typeof rec["function_call"] === "object") {
    const fc = rec["function_call"] as Record<string, unknown>
    const name =
      typeof fc["name"] === "string" ? (fc["name"] as string) : "(unnamed)"
    const input = fc["args"]
    const latency = latencies ? latencies[name] : undefined
    return (
      <div className="rounded-md border border-border/60 bg-background p-2.5">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
          <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-medium">
            tool_use
          </span>
          <span className="font-mono normal-case text-foreground">{name}</span>
          {typeof latency === "number" ? (
            <span className="normal-case text-muted-foreground">
              {formatLatency(latency)}
            </span>
          ) : null}
        </div>
        <div className="text-[10px] text-muted-foreground">input</div>
        <pre className="mt-1 overflow-x-auto rounded bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
          {safeStringify(input)}
        </pre>
      </div>
    )
  }

  // Gemini function_response part: { function_response: { name, response } }
  if (rec["function_response"] && typeof rec["function_response"] === "object") {
    const fr = rec["function_response"] as Record<string, unknown>
    const name =
      typeof fr["name"] === "string" ? (fr["name"] as string) : undefined
    const response = fr["response"]
    const text =
      typeof response === "string" ? response : safeStringify(response)
    return (
      <div className="rounded-md border border-border/60 bg-background p-2.5">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
          <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-medium">
            tool_result
          </span>
          {name ? (
            <span className="font-mono normal-case text-foreground">{name}</span>
          ) : null}
        </div>
        <div className="text-[10px] text-muted-foreground">output</div>
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap wrap-break-word rounded bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
          {text}
        </pre>
      </div>
    )
  }

  if (type === "mcp_list_tools") {
    return <McpListToolsBlock rec={rec} />
  }
  if (type === "mcp_tool_use") {
    return <McpToolUseBlock rec={rec} />
  }
  if (type === "mcp_tool_result") {
    return <McpToolResultBlock rec={rec} latencies={latencies} />
  }
  if (type === "tool_use") {
    return <ToolUseBlock rec={rec} latencies={latencies} />
  }
  if (type === "tool_result") {
    return <ToolResultBlock rec={rec} />
  }

  return (
    <pre className="overflow-x-auto rounded bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
      {safeStringify(item)}
    </pre>
  )
}

function McpToolUseBlock({ rec }: { rec: Record<string, unknown> }) {
  const id = typeof rec["id"] === "string" ? (rec["id"] as string) : undefined
  const name =
    typeof rec["name"] === "string" ? (rec["name"] as string) : "(unnamed)"
  const server =
    typeof rec["server_name"] === "string"
      ? (rec["server_name"] as string)
      : undefined
  const input = rec["input"]
  return (
    <div className="rounded-md border border-border/60 bg-background p-2.5">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
        <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-medium">
          mcp_tool_use
        </span>
        <span className="font-mono normal-case text-foreground">{name}</span>
        {server ? (
          <span className="rounded border border-border/60 px-1.5 py-0.5 normal-case text-muted-foreground">
            {server}
          </span>
        ) : null}
      </div>
      {id ? (
        <div className="mb-1.5 font-mono text-[10px] text-muted-foreground">
          {id}
        </div>
      ) : null}
      <div className="text-[10px] text-muted-foreground">input</div>
      <pre className="mt-1 overflow-x-auto rounded bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
        {safeStringify(input)}
      </pre>
    </div>
  )
}

function McpToolResultBlock({
  rec,
  latencies,
}: {
  rec: Record<string, unknown>
  latencies?: ToolLatencyMap
}) {
  const id =
    typeof rec["tool_use_id"] === "string"
      ? (rec["tool_use_id"] as string)
      : undefined
  const isError = rec["is_error"] === true
  const content = rec["content"]
  return (
    <div className="rounded-md border border-border/60 bg-background p-2.5">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
        <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-medium">
          mcp_tool_result
        </span>
        {isError ? (
          <span className="rounded bg-destructive/15 px-1.5 py-0.5 font-medium text-destructive">
            error
          </span>
        ) : null}
        {id ? (
          <span className="font-mono normal-case text-muted-foreground">
            {id}
          </span>
        ) : null}
      </div>
      <div className="text-[10px] text-muted-foreground">output</div>
      <div className="mt-1">
        <SmartContent value={content} latencies={latencies} />
      </div>
    </div>
  )
}

function ToolUseBlock({
  rec,
  latencies,
}: {
  rec: Record<string, unknown>
  latencies?: ToolLatencyMap
}) {
  const id = typeof rec["id"] === "string" ? (rec["id"] as string) : undefined
  const name =
    typeof rec["name"] === "string" ? (rec["name"] as string) : "(unnamed)"
  const input = rec["input"]
  const latency = id && latencies ? latencies[id] : undefined
  return (
    <div className="rounded-md border border-border/60 bg-background p-2.5">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
        <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-medium">
          tool_use
        </span>
        <span className="font-mono normal-case text-foreground">{name}</span>
        {typeof latency === "number" ? (
          <span className="normal-case text-muted-foreground">
            {formatLatency(latency)}
          </span>
        ) : null}
      </div>
      {id ? (
        <div className="mb-1.5 font-mono text-[10px] text-muted-foreground">
          {id}
        </div>
      ) : null}
      <div className="text-[10px] text-muted-foreground">input</div>
      <pre className="mt-1 overflow-x-auto rounded bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
        {safeStringify(input)}
      </pre>
    </div>
  )
}

function ToolResultBlock({ rec }: { rec: Record<string, unknown> }) {
  const id =
    typeof rec["tool_use_id"] === "string"
      ? (rec["tool_use_id"] as string)
      : undefined
  const content = rec["content"]
  const text = typeof content === "string" ? content : safeStringify(content)
  return (
    <div className="rounded-md border border-border/60 bg-background p-2.5">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
        <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-medium">
          tool_result
        </span>
        {id ? (
          <span className="font-mono normal-case text-muted-foreground">
            {id}
          </span>
        ) : null}
      </div>
      <div className="text-[10px] text-muted-foreground">output</div>
      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap wrap-break-word rounded bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
        {text}
      </pre>
    </div>
  )
}

function McpListToolsBlock({ rec }: { rec: Record<string, unknown> }) {
  const id = typeof rec["id"] === "string" ? (rec["id"] as string) : undefined
  const server =
    typeof rec["server_label"] === "string"
      ? (rec["server_label"] as string)
      : typeof rec["server_name"] === "string"
        ? (rec["server_name"] as string)
        : undefined
  const toolsRaw = rec["tools"]
  const toolNames: string[] = []
  if (Array.isArray(toolsRaw)) {
    for (const t of toolsRaw) {
      if (!t || typeof t !== "object") continue
      const tname = (t as Record<string, unknown>)["name"]
      if (typeof tname === "string") toolNames.push(tname)
    }
  }
  return (
    <div className="rounded-md border border-border/60 bg-background p-2.5">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
        <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-medium">
          mcp_list_tools
        </span>
        {server ? (
          <span className="rounded border border-border/60 px-1.5 py-0.5 normal-case text-muted-foreground">
            {server}
          </span>
        ) : null}
        <span className="normal-case text-muted-foreground">
          {toolNames.length} tool{toolNames.length === 1 ? "" : "s"}
        </span>
      </div>
      {id ? (
        <div className="mb-1.5 font-mono text-[10px] text-muted-foreground">
          {id}
        </div>
      ) : null}
      {toolNames.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {toolNames.map((n, idx) => (
            <span
              key={idx}
              className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[11px]"
            >
              {n}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
