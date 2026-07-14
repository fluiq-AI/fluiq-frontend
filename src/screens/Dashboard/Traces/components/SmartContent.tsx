import type { MessageToolCall, ToolLatencyMap } from "../utils/types"
import { formatLatency, safeStringify } from "../utils"
import { tryParsePyLiteral } from "../utils/pyRepr"

// Provider tool results (and some message contents) arrive as a JSON-encoded
// string — e.g. the USITC schedule rows returned by `fetch_hts_details`. When a
// string parses as a non-trivial JSON object/array, return the parsed value so
// callers can pretty-print it; otherwise return null and render it as plain
// text. Short scalars ("42", "true") are deliberately left as text.
function tryParseJson(value: string): unknown | null {
  const trimmed = value.trim()
  if (trimmed.length < 2) return null
  const first = trimmed[0]
  if (first !== "{" && first !== "[") return null
  try {
    const parsed = JSON.parse(trimmed)
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

// Pretty-printed JSON in a collapsible block. Large payloads (the common case
// for tool results) collapse by default so a single result can't bury the rest
// of the conversation; the summary keeps a one-line preview visible.
export function JsonBlock({ value }: { value: unknown }) {
  const text = safeStringify(value)
  const lineCount = text.length - text.replace(/\n/g, "").length + 1
  const big = text.length > 1200
  const preview = Array.isArray(value)
    ? `Array · ${value.length} item${value.length === 1 ? "" : "s"}`
    : `Object · ${Object.keys(value as object).length} keys`
  return (
    <details open={!big} className="group rounded bg-muted/60">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-1 text-[10px] text-muted-foreground select-none">
        <span className="transition-transform group-open:rotate-90">{"▶"}</span>
        <span className="font-mono">{preview}</span>
        <span className="text-muted-foreground/60">· {lineCount} lines</span>
      </summary>
      <pre className="max-h-120 overflow-auto px-2 pb-2 font-mono text-[11px] leading-relaxed">
        {text}
      </pre>
    </details>
  )
}

// Render a string as a structured block when it parses, otherwise as wrapped
// text. We try JSON first (provider tool results), then Python repr — the shape
// the @trace decorator records for general function input/output (single-quoted
// dicts, None/ObjectId(…), `(args,){kwargs}`). Only object/array results use
// JsonBlock; a bare scalar falls through to text rendering of the original.
function TextOrJson({ value }: { value: string }) {
  const parsed = tryParseJson(value)
  if (parsed !== null) return <JsonBlock value={parsed} />
  const py = tryParsePyLiteral(value)
  if (py !== null && typeof py === "object") return <JsonBlock value={py} />
  return (
    <div className="whitespace-pre-wrap wrap-break-word text-xs">{value}</div>
  )
}

// Card for a tool call carried on a chat message (OpenAI `tool_calls`). Shares
// the visual language of the Anthropic `tool_use` content block.
export function MessageToolCallCard({
  call,
  latencies,
}: {
  call: MessageToolCall
  latencies?: ToolLatencyMap
}) {
  const latency =
    latencies?.[call.name] ?? (call.id ? latencies?.[call.id] : undefined)
  return (
    <div className="rounded-md border border-border/60 bg-background p-2.5">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
        <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-medium">
          tool_call
        </span>
        <span className="font-mono normal-case text-foreground">{call.name}</span>
        {typeof latency === "number" ? (
          <span className="normal-case text-muted-foreground">
            {formatLatency(latency)}
          </span>
        ) : null}
      </div>
      {call.id ? (
        <div className="mb-1.5 font-mono text-[10px] text-muted-foreground">
          {call.id}
        </div>
      ) : null}
      <div className="text-[10px] text-muted-foreground">arguments</div>
      <div className="mt-1">
        {typeof call.arguments === "string" ? (
          <pre className="overflow-x-auto rounded bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
            {call.arguments}
          </pre>
        ) : (
          <JsonBlock value={call.arguments} />
        )}
      </div>
    </div>
  )
}

export function SmartContent({
  value,
  latencies,
}: {
  value: unknown
  latencies?: ToolLatencyMap
}) {
  if (typeof value === "string") {
    return <TextOrJson value={value} />
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
    return <TextOrJson value={item} />
  }
  if (Array.isArray(item)) {
    return <SmartContent value={item} latencies={latencies} />
  }
  if (!item || typeof item !== "object") {
    return <div className="font-mono text-xs">{String(item)}</div>
  }
  const rec = item as Record<string, unknown>
  const type = rec["type"]

  // Multimodal media reference — the SDK stores a payload-free `_media_ref`
  // (kind/mime/bytes/sha256/url) in place of raw image/audio/video bytes.
  if (rec["_media_ref"] && typeof rec["_media_ref"] === "object") {
    return <MediaRefCard mediaRef={rec["_media_ref"] as Record<string, unknown>} />
  }

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

  // OpenAI Responses API self-contained MCP call:
  //   { type: "mcp_call", name, server_label, arguments (JSON string), output, error }
  if (type === "mcp_call") {
    return <McpCallBlock rec={rec} />
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

  // OpenAI Responses API function call output item:
  //   { type: "function_call", name, arguments (JSON string), call_id, id }
  if (type === "function_call") {
    const name = typeof rec["name"] === "string" ? (rec["name"] as string) : "(unnamed)"
    const id =
      typeof rec["call_id"] === "string"
        ? (rec["call_id"] as string)
        : typeof rec["id"] === "string"
          ? (rec["id"] as string)
          : undefined
    const rawArgs = rec["arguments"]
    let args: unknown = rawArgs
    if (typeof rawArgs === "string") {
      try {
        args = JSON.parse(rawArgs)
      } catch {
        args = rawArgs
      }
    }
    return (
      <MessageToolCallCard call={{ id, name, arguments: args }} latencies={latencies} />
    )
  }

  // OpenAI Responses API function result item:
  //   { type: "function_call_output", call_id, output }
  if (type === "function_call_output") {
    const id =
      typeof rec["call_id"] === "string" ? (rec["call_id"] as string) : undefined
    const output = rec["output"]
    return (
      <div className="rounded-md border border-border/60 bg-background p-2.5">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
          <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-medium">
            tool_result
          </span>
          {id ? (
            <span className="font-mono normal-case text-muted-foreground">{id}</span>
          ) : null}
        </div>
        <div className="text-[10px] text-muted-foreground">output</div>
        <div className="mt-1">
          {typeof output === "string" ? (
            <TextOrJson value={output} />
          ) : (
            <JsonBlock value={output} />
          )}
        </div>
      </div>
    )
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
      <div className="mt-1">
        {typeof content === "string" ? (
          <TextOrJson value={content} />
        ) : (
          <JsonBlock value={content} />
        )}
      </div>
    </div>
  )
}

function McpCallBlock({ rec }: { rec: Record<string, unknown> }) {
  const name = typeof rec["name"] === "string" ? (rec["name"] as string) : "(unnamed)"
  const server =
    typeof rec["server_label"] === "string" ? (rec["server_label"] as string) : undefined
  const id = typeof rec["id"] === "string" ? (rec["id"] as string) : undefined
  const rawArgs = rec["arguments"]
  let args: unknown = rawArgs
  if (typeof rawArgs === "string") {
    try {
      args = JSON.parse(rawArgs)
    } catch {
      args = rawArgs
    }
  }
  const output = rec["output"]
  const error = rec["error"]
  return (
    <div className="rounded-md border border-border/60 bg-background p-2.5">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
        <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-medium">
          mcp_call
        </span>
        <span className="font-mono normal-case text-foreground">{name}</span>
        {server ? (
          <span className="rounded border border-border/60 px-1.5 py-0.5 normal-case text-muted-foreground">
            {server}
          </span>
        ) : null}
        {error ? (
          <span className="rounded bg-destructive/15 px-1.5 py-0.5 font-medium text-destructive">
            error
          </span>
        ) : null}
      </div>
      {id ? (
        <div className="mb-1.5 font-mono text-[10px] text-muted-foreground">{id}</div>
      ) : null}
      <div className="text-[10px] text-muted-foreground">input</div>
      <div className="mt-1 mb-2">
        {typeof args === "string" ? (
          <pre className="overflow-x-auto rounded bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
            {args}
          </pre>
        ) : (
          <JsonBlock value={args} />
        )}
      </div>
      {output !== undefined && output !== null && output !== "" ? (
        <>
          <div className="text-[10px] text-muted-foreground">output</div>
          <div className="mt-1">
            {typeof output === "string" ? (
              <TextOrJson value={output} />
            ) : (
              <JsonBlock value={output} />
            )}
          </div>
        </>
      ) : null}
      {error ? (
        <div className="mt-1 text-[11px] text-destructive">{String(error)}</div>
      ) : null}
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

// ── Multimodal media reference ───────────────────────────────────────────────
// The SDK never stores raw image/audio/video bytes — it keeps a payload-free
// `_media_ref`. Render it as a compact card (kind, mime, size, sha256, and a
// url link / thumbnail when the source is a fetchable URL).

const MEDIA_GLYPH: Record<string, string> = {
  image: "🖼️", audio: "🔊", video: "🎬", document: "📄", media: "📎",
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function MediaRefCard({ mediaRef }: { mediaRef: Record<string, unknown> }) {
  const kind = typeof mediaRef["kind"] === "string" ? (mediaRef["kind"] as string) : "media"
  const mime = typeof mediaRef["mime"] === "string" ? (mediaRef["mime"] as string) : undefined
  const source = typeof mediaRef["source"] === "string" ? (mediaRef["source"] as string) : undefined
  const bytes = typeof mediaRef["bytes"] === "number" ? (mediaRef["bytes"] as number) : undefined
  const sha = typeof mediaRef["sha256"] === "string" ? (mediaRef["sha256"] as string) : undefined
  const url = typeof mediaRef["url"] === "string" ? (mediaRef["url"] as string) : undefined
  const data = typeof mediaRef["data"] === "string" ? (mediaRef["data"] as string) : undefined
  const dataUri = data ? `data:${mime ?? "image/png"};base64,${data}` : undefined
  const thumbSrc = kind === "image" ? (dataUri ?? (source === "url" ? url : undefined)) : undefined

  return (
    <div className="rounded-md border border-border/60 bg-background p-2.5">
      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
        <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-medium">
          {MEDIA_GLYPH[kind] ?? "📎"} {kind}
        </span>
        {mime ? <span className="font-mono normal-case text-foreground">{mime}</span> : null}
        {source ? <span className="normal-case text-muted-foreground">{source}</span> : null}
        {typeof bytes === "number" ? (
          <span className="normal-case text-muted-foreground">{formatBytes(bytes)}</span>
        ) : null}
      </div>
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt="media"
          className="mt-2 max-h-40 max-w-full rounded border border-border/60 object-contain"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = "none"
          }}
        />
      ) : null}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 block truncate font-mono text-[10px] text-foreground underline-offset-2 hover:underline"
        >
          {url}
        </a>
      ) : null}
      {sha ? (
        <div className="mt-1 font-mono text-[10px] text-muted-foreground">sha256:{sha}</div>
      ) : null}
      {source === "base64" && !data && !url ? (
        <div className="mt-1 text-[10px] text-muted-foreground italic">
          payload not stored (reference only)
        </div>
      ) : null}
    </div>
  )
}
