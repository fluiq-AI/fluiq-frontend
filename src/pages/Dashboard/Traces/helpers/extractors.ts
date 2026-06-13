import type {
  FunctionView,
  McpCall,
  McpServer,
  MessageToolCall,
  RequestMessage,
  ToolDef,
  ToolIO,
  ToolLatencyMap,
  ToolResult,
  TokenUsage,
  TraceGroup,
  TraceNode,
} from "../utils/types"
import {
  flattenMessageList,
  isFailed,
  normalizeMessageRole,
  safeStringify,
} from "../utils"

export function extractErrorView(
  event: Record<string, unknown>,
): { message: string | null; traceback: string | null } | null {
  if (!isFailed(event)) return null
  const rawOutput = event["output"]
  const message =
    typeof rawOutput === "string" && rawOutput.length > 0
      ? rawOutput
      : rawOutput === undefined || rawOutput === null
      ? null
      : safeStringify(rawOutput)
  const rawTb = event["error_traceback"]
  const traceback =
    typeof rawTb === "string" && rawTb.length > 0 ? rawTb : null
  return { message, traceback }
}

export function extractFunctionView(event: Record<string, unknown>): FunctionView | null {
  const fn = event["function"]
  if (typeof fn !== "string" || fn.length === 0) return null
  const rawInput = event["input"]
  const rawOutput = event["output"]
  const input =
    typeof rawInput === "string"
      ? rawInput
      : rawInput === undefined || rawInput === null
      ? ""
      : safeStringify(rawInput)
  const output =
    typeof rawOutput === "string"
      ? rawOutput
      : rawOutput === undefined || rawOutput === null
      ? ""
      : safeStringify(rawOutput)
  return { name: fn, input, output }
}

export function extractSystemInstruction(event: Record<string, unknown>): string | null {
  const msgs = event["messages"]
  if (Array.isArray(msgs)) {
    for (const m of flattenMessageList(msgs)) {
      if (m && typeof m === "object" && !Array.isArray(m)) {
        const rec = m as Record<string, unknown>
        const role = normalizeMessageRole(rec)
        const content = rec["content"]
        if (role === "system" && typeof content === "string" && content.length > 0) {
          return content
        }
      }
    }
  }
  const sys = event["system"]
  if (typeof sys === "string" && sys.length > 0) return sys
  const sysInstr = event["system_instruction"]
  if (typeof sysInstr === "string" && sysInstr.length > 0) return sysInstr
  return null
}

// Normalize a provider tool-call array into MessageToolCall[]. Handles the
// three native shapes, which differ only in where name/args live:
//   OpenAI       : { id, type: "function", function: { name, arguments } }  // arguments is a JSON string
//   Anthropic    : { type: "tool_use", id, name, input }                    // input is a dict
//   Gemini       : { id?, name, args }                                      // args is a dict
//   LangChain/LG : { id, name, args, type: "tool_call" }                    // args is a dict
// String `arguments` are parsed best-effort so the UI can pretty-print
// structured input instead of an escaped blob.
function normalizeToolCalls(raw: unknown): MessageToolCall[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const out: MessageToolCall[] = []
  for (const tc of raw) {
    if (!tc || typeof tc !== "object") continue
    const trec = tc as Record<string, unknown>
    const fn =
      trec["function"] && typeof trec["function"] === "object"
        ? (trec["function"] as Record<string, unknown>)
        : undefined
    const src = fn ?? trec
    const name = typeof src["name"] === "string" ? (src["name"] as string) : "(unnamed)"
    const rawArgs = src["arguments"] ?? trec["args"] ?? trec["input"]
    let args: unknown = rawArgs
    if (typeof rawArgs === "string") {
      try {
        args = JSON.parse(rawArgs)
      } catch {
        args = rawArgs
      }
    }
    out.push({
      id: typeof trec["id"] === "string" ? (trec["id"] as string) : undefined,
      name,
      arguments: args,
    })
  }
  return out.length > 0 ? out : undefined
}

function extractMessageToolCalls(rec: Record<string, unknown>): MessageToolCall[] | undefined {
  return normalizeToolCalls(rec["tool_calls"])
}

// The current turn's outgoing tool calls live at the top level of the event,
// under a provider-native key (OpenAI tool_calls / Anthropic tool_uses /
// Gemini function_calls). Unlike history-turn calls embedded in `messages`,
// these would otherwise only be visible in the raw JSON tab.
export function extractResponseToolCalls(
  event: Record<string, unknown>,
): MessageToolCall[] {
  const out: MessageToolCall[] = []
  for (const key of ["tool_calls", "tool_uses", "function_calls"]) {
    const calls = normalizeToolCalls(event[key])
    if (calls) out.push(...calls)
  }
  return out
}

// Every tool call referenced anywhere in an event: the current turn's outgoing
// calls (top level) plus any carried on assistant messages in the request
// history. Used to build the group-wide id→name and name→inputs maps.
function extractAllToolCalls(event: Record<string, unknown>): MessageToolCall[] {
  const out = extractResponseToolCalls(event)
  const msgs = event["messages"]
  if (Array.isArray(msgs)) {
    for (const m of flattenMessageList(msgs)) {
      if (!m || typeof m !== "object" || Array.isArray(m)) continue
      const calls = extractMessageToolCalls(m as Record<string, unknown>)
      if (calls) out.push(...calls)
    }
  }
  return out
}

// Tool outputs carried in a request's message history. A tool's result comes
// back on the FOLLOWING llm call as a role:"tool" message (OpenAI/LangChain),
// a tool_result content block on a user message (Anthropic), or a
// function_response part (Gemini). Keyed by call id where present, with a
// name-based fallback for providers that omit ids.
export function extractToolResults(event: Record<string, unknown>): ToolResult[] {
  const out: ToolResult[] = []
  const msgs = event["messages"]
  if (Array.isArray(msgs)) {
    for (const m of flattenMessageList(msgs)) {
      if (!m || typeof m !== "object" || Array.isArray(m)) continue
      const rec = m as Record<string, unknown>
      if (normalizeMessageRole(rec) === "tool") {
        out.push({
          id: typeof rec["tool_call_id"] === "string" ? (rec["tool_call_id"] as string) : undefined,
          name: typeof rec["name"] === "string" ? (rec["name"] as string) : undefined,
          content: rec["content"],
        })
        continue
      }
      // Anthropic returns tool results as content blocks on a user message.
      const content = rec["content"]
      if (Array.isArray(content)) {
        for (const block of content) {
          if (!block || typeof block !== "object") continue
          const brec = block as Record<string, unknown>
          if (brec["type"] === "tool_result") {
            out.push({
              id: typeof brec["tool_use_id"] === "string" ? (brec["tool_use_id"] as string) : undefined,
              content: brec["content"],
            })
          }
        }
      }
    }
  }
  // Gemini function_response parts live on `contents`.
  const contents = event["contents"]
  if (Array.isArray(contents)) {
    for (const c of contents) {
      if (!c || typeof c !== "object" || Array.isArray(c)) continue
      const parts = (c as Record<string, unknown>)["parts"]
      if (!Array.isArray(parts)) continue
      for (const p of parts) {
        if (!p || typeof p !== "object") continue
        const fr = (p as Record<string, unknown>)["function_response"]
        if (fr && typeof fr === "object") {
          const frec = fr as Record<string, unknown>
          out.push({
            name: typeof frec["name"] === "string" ? (frec["name"] as string) : undefined,
            content: frec["response"],
          })
        }
      }
    }
  }
  return out
}

// Walk a whole trace group and aggregate, per tool-function name, every call's
// input arguments and every matching result's output. Inputs and outputs are
// correlated across separate llm spans (a call made in turn N is answered in
// turn N+1's message history) by call id, falling back to the tool name when a
// provider omits ids. De-duplicated by id so a call echoed across many turns'
// histories is counted once.
export function indexGroupToolIO(group: TraceGroup): Map<string, ToolIO> {
  const byName = new Map<string, ToolIO>()
  const idToName = new Map<string, string>()
  const get = (name: string): ToolIO => {
    let v = byName.get(name)
    if (!v) {
      v = { inputs: [], outputs: [] }
      byName.set(name, v)
    }
    return v
  }

  // Pass 1: calls → id→name map + per-name inputs (dedup by id).
  const seenCallIds = new Set<string>()
  const walkCalls = (node: TraceNode) => {
    for (const call of extractAllToolCalls(node.trace.event)) {
      if (call.id) idToName.set(call.id, call.name)
      if (call.id) {
        if (seenCallIds.has(call.id)) continue
        seenCallIds.add(call.id)
      }
      get(call.name).inputs.push(call.arguments)
    }
    for (const c of node.children) walkCalls(c)
  }
  walkCalls(group.root)

  // Pass 2: results → per-name outputs (dedup by id), resolving the tool name
  // from the result itself or the id→name map built above.
  const seenResultIds = new Set<string>()
  const walkResults = (node: TraceNode) => {
    for (const res of extractToolResults(node.trace.event)) {
      if (res.id) {
        if (seenResultIds.has(res.id)) continue
        seenResultIds.add(res.id)
      }
      const name = res.name ?? (res.id ? idToName.get(res.id) : undefined)
      if (!name) continue
      get(name).outputs.push(res.content)
    }
    for (const c of node.children) walkResults(c)
  }
  walkResults(group.root)

  return byName
}

// Compact, tooltip-friendly rendering of a tool's aggregated inputs or outputs.
// Multiple values are numbered; each is capped so a large payload (e.g. a full
// tariff schedule) can't blow out the hover card.
export function formatToolIOList(items: unknown[], max = 1200): string | null {
  const parts: string[] = []
  for (const it of items) {
    if (it === undefined || it === null) continue
    let s = typeof it === "string" ? it : safeStringify(it)
    if (s.length === 0) continue
    if (s.length > max) s = s.slice(0, max) + "…"
    parts.push(s)
  }
  if (parts.length === 0) return null
  if (parts.length === 1) return parts[0]
  return parts.map((p, i) => `#${i + 1}\n${p}`).join("\n\n")
}

// ── MCP tool calls ──────────────────────────────────────────────────────────
// MCP invocations are like regular tool calls but routed through an MCP server.
// They live on `event.mcp_calls` (a key shared across providers but holding
// different shapes): OpenAI emits self-contained `mcp_call` items; Anthropic
// emits `mcp_tool_use` blocks whose output arrives as separate
// `mcp_tool_result` blocks (on `mcp_results`, in `mcp_calls`, or in message
// content), correlated by id.

// id → result content for every mcp_tool_result reachable from this event.
export function extractMcpResults(event: Record<string, unknown>): Map<string, unknown> {
  const out = new Map<string, unknown>()
  const consider = (block: unknown): void => {
    if (!block || typeof block !== "object" || Array.isArray(block)) return
    const b = block as Record<string, unknown>
    if (b["type"] === "mcp_tool_result" && typeof b["tool_use_id"] === "string") {
      out.set(b["tool_use_id"] as string, b["content"])
    }
  }
  for (const field of [event["mcp_results"], event["mcp_calls"]]) {
    if (Array.isArray(field)) for (const b of field) consider(b)
  }
  const msgs = event["messages"]
  if (Array.isArray(msgs)) {
    for (const m of flattenMessageList(msgs)) {
      if (!m || typeof m !== "object" || Array.isArray(m)) continue
      const content = (m as Record<string, unknown>)["content"]
      if (Array.isArray(content)) for (const b of content) consider(b)
    }
  }
  return out
}

export function indexGroupMcpResults(group: TraceGroup): Map<string, unknown> {
  const out = new Map<string, unknown>()
  const walk = (n: TraceNode): void => {
    for (const [k, v] of extractMcpResults(n.trace.event)) {
      if (!out.has(k)) out.set(k, v)
    }
    for (const c of n.children) walk(c)
  }
  walk(group.root)
  return out
}

export function extractMcpToolCalls(
  event: Record<string, unknown>,
  resultsById?: Map<string, unknown>,
): McpCall[] {
  const raw = event["mcp_calls"]
  if (!Array.isArray(raw)) return []
  const out: McpCall[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue
    const rec = item as Record<string, unknown>
    const t = rec["type"]
    if (t === "mcp_call") {
      // OpenAI Responses: self-contained { name, server_label, arguments, output }.
      const rawArgs = rec["arguments"]
      let input: unknown = rawArgs
      if (typeof rawArgs === "string") {
        try {
          input = JSON.parse(rawArgs)
        } catch {
          input = rawArgs
        }
      }
      out.push({
        id: typeof rec["id"] === "string" ? (rec["id"] as string) : undefined,
        name: typeof rec["name"] === "string" ? (rec["name"] as string) : "(unnamed)",
        server: typeof rec["server_label"] === "string" ? (rec["server_label"] as string) : undefined,
        input,
        output: rec["output"] ?? rec["error"] ?? undefined,
      })
    } else if (t === "mcp_tool_use") {
      // Anthropic: { id, name, server_name, input }; output correlated by id.
      const id = typeof rec["id"] === "string" ? (rec["id"] as string) : undefined
      out.push({
        id,
        name: typeof rec["name"] === "string" ? (rec["name"] as string) : "(unnamed)",
        server: typeof rec["server_name"] === "string" ? (rec["server_name"] as string) : undefined,
        input: rec["input"],
        output: id && resultsById ? resultsById.get(id) : undefined,
      })
    }
  }
  return out
}

export function extractRequestMessages(event: Record<string, unknown>): RequestMessage[] {
  const msgs = event["messages"]
  if (Array.isArray(msgs)) {
    const out: RequestMessage[] = []
    for (const m of flattenMessageList(msgs)) {
      if (!m || typeof m !== "object" || Array.isArray(m)) continue
      const rec = m as Record<string, unknown>
      const role = normalizeMessageRole(rec)
      if (role === "system") continue
      const reasoning = rec["reasoning_content"] ?? rec["reasoning"]
      out.push({
        role,
        content: rec["content"],
        name: typeof rec["name"] === "string" ? (rec["name"] as string) : undefined,
        toolCallId:
          typeof rec["tool_call_id"] === "string"
            ? (rec["tool_call_id"] as string)
            : undefined,
        reasoningContent:
          typeof reasoning === "string" && reasoning.length > 0
            ? (reasoning as string)
            : undefined,
        toolCalls: extractMessageToolCalls(rec),
      })
    }
    return out
  }
  const contents = event["contents"]
  if (typeof contents === "string") {
    return [{ role: "user", content: contents }]
  }
  if (Array.isArray(contents)) {
    const out: RequestMessage[] = []
    for (const c of contents) {
      if (c && typeof c === "object" && !Array.isArray(c)) {
        const rec = c as Record<string, unknown>
        const role =
          typeof rec["role"] === "string" ? (rec["role"] as string) : "user"
        const parts = rec["parts"]
        out.push({ role, content: parts !== undefined ? parts : c })
      } else {
        out.push({ role: "user", content: c })
      }
    }
    return out
  }
  // OpenAI Responses API: `input` can be a string or an array of message objects.
  const input = event["input"]
  if (typeof input === "string") {
    return [{ role: "user", content: input }]
  }
  if (Array.isArray(input)) {
    const out: RequestMessage[] = []
    for (const m of input) {
      if (m && typeof m === "object" && !Array.isArray(m)) {
        const rec = m as Record<string, unknown>
        const role =
          typeof rec["role"] === "string" ? (rec["role"] as string) : "user"
        if (role === "system") continue
        out.push({ role, content: rec["content"] ?? m })
      } else {
        out.push({ role: "user", content: m })
      }
    }
    return out
  }
  return []
}

export function extractTools(event: Record<string, unknown>): ToolDef[] {
  const tools = event["tools"]
  if (!Array.isArray(tools)) return []
  const out: ToolDef[] = []
  for (const t of tools) {
    if (!t || typeof t !== "object") continue
    const rec = t as Record<string, unknown>
    // Skip MCP server wrappers — those are surfaced in the dedicated "MCP servers" section.
    if (rec["type"] === "mcp_session" || rec["type"] === "mcp") continue
    // Gemini wrapper: { function_declarations: [{name, description, parameters}, ...] }
    const decls = rec["function_declarations"]
    if (Array.isArray(decls)) {
      for (const d of decls) {
        if (!d || typeof d !== "object") continue
        const drec = d as Record<string, unknown>
        const dname = drec["name"]
        if (typeof dname !== "string") continue
        out.push({
          name: dname,
          description:
            typeof drec["description"] === "string"
              ? (drec["description"] as string)
              : undefined,
          input_schema: drec["parameters"] ?? drec["input_schema"],
        })
      }
      continue
    }
    // OpenAI wrapper: { type: "function", function: { name, description, parameters } }.
    // Name/description/schema are nested under `function`, not at the top level.
    const fn =
      rec["function"] && typeof rec["function"] === "object"
        ? (rec["function"] as Record<string, unknown>)
        : rec
    const name = fn["name"]
    if (typeof name !== "string") continue
    out.push({
      name,
      description:
        typeof fn["description"] === "string"
          ? (fn["description"] as string)
          : undefined,
      input_schema: fn["parameters"] ?? fn["input_schema"],
    })
  }
  return out
}

export function extractToolLatencies(event: Record<string, unknown>): ToolLatencyMap {
  const tcl = event["tool_call_latencies"]
  if (!Array.isArray(tcl)) return {}
  const map: ToolLatencyMap = {}
  for (const item of tcl) {
    if (!item || typeof item !== "object") continue
    const rec = item as Record<string, unknown>
    const id = rec["tool_use_id"]
    const name = rec["name"]
    const latency = rec["latency"]
    if (typeof latency !== "number") continue
    if (typeof id === "string") map[id] = latency
    if (typeof name === "string") map[name] = latency
  }
  return map
}

export function extractMcpCalls(event: Record<string, unknown>): unknown[] {
  const raw = event["mcp_calls"]
  if (!Array.isArray(raw)) return []
  return raw
}

// Tool calls embedded on an LLM event itself (no separate `tool` trace was
// emitted because the user's tool function isn't @trace-decorated). Returns
// unique tool-function names across the three integrations:
//   OpenAI    : event.tool_calls[*].function.name
//   Anthropic : event.tool_uses[*].name
//   Gemini    : event.function_calls[*].name
export function extractLlmToolCallNames(
  event: Record<string, unknown>,
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const push = (name: unknown): void => {
    if (typeof name !== "string" || name.length === 0) return
    if (seen.has(name)) return
    seen.add(name)
    out.push(name)
  }
  const oai = event["tool_calls"]
  if (Array.isArray(oai)) {
    for (const tc of oai) {
      if (!tc || typeof tc !== "object") continue
      const fn = (tc as Record<string, unknown>)["function"]
      if (fn && typeof fn === "object" && !Array.isArray(fn)) {
        push((fn as Record<string, unknown>)["name"])
      } else {
        push((tc as Record<string, unknown>)["name"])
      }
    }
  }
  const ant = event["tool_uses"]
  if (Array.isArray(ant)) {
    for (const tu of ant) {
      if (!tu || typeof tu !== "object") continue
      push((tu as Record<string, unknown>)["name"])
    }
  }
  const gem = event["function_calls"]
  if (Array.isArray(gem)) {
    for (const fc of gem) {
      if (!fc || typeof fc !== "object") continue
      push((fc as Record<string, unknown>)["name"])
    }
  }
  return out
}

export function extractThinking(event: Record<string, unknown>): string[] {
  const raw = event["thinking"]
  if (typeof raw === "string") return raw.length > 0 ? [raw] : []
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  // Runs of plain string tokens (e.g. streamed thinking deltas) are
  // concatenated into a single block. The tokens already carry their own
  // spacing, so they are joined with "" rather than " ".
  let buffer = ""
  const flush = () => {
    if (buffer.length > 0) out.push(buffer)
    buffer = ""
  }
  for (const item of raw) {
    if (typeof item === "string") {
      buffer += item
      continue
    }
    flush()
    if (!item || typeof item !== "object") continue
    const rec = item as Record<string, unknown>
    const text = rec["thinking"] ?? rec["text"]
    if (typeof text === "string" && text.length > 0) out.push(text)
  }
  flush()
  return out
}

export function extractTokens(event: Record<string, unknown>): TokenUsage | null {
  const t = event["tokens"]
  if (!t || typeof t !== "object") return null
  const rec = t as Record<string, unknown>
  const out: TokenUsage = {}
  const prompt = rec["prompt"] ?? rec["input_tokens"] ?? rec["prompt_tokens"]
  const completion =
    rec["completion"] ?? rec["output_tokens"] ?? rec["completion_tokens"]
  const total = rec["total"] ?? rec["total_tokens"]
  if (typeof prompt === "number") out.prompt = prompt
  if (typeof completion === "number") out.completion = completion
  if (typeof total === "number") out.total = total
  return Object.keys(out).length > 0 ? out : null
}

export function extractMcpServers(event: Record<string, unknown>): McpServer[] {
  const raw = event["mcp_servers"]
  if (!Array.isArray(raw)) return []
  const out: McpServer[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const rec = item as Record<string, unknown>
    const serverInfo =
      rec["server_info"] && typeof rec["server_info"] === "object"
        ? (rec["server_info"] as Record<string, unknown>)
        : undefined
    const name =
      typeof rec["name"] === "string"
        ? (rec["name"] as string)
        : typeof rec["server_label"] === "string"
          ? (rec["server_label"] as string)
          : serverInfo && typeof serverInfo["name"] === "string"
            ? (serverInfo["name"] as string)
            : undefined
    if (!name) continue
    const version =
      serverInfo && typeof serverInfo["version"] === "string"
        ? (serverInfo["version"] as string)
        : undefined
    const tools: ToolDef[] = []
    const rawTools = rec["tools"]
    if (Array.isArray(rawTools)) {
      for (const t of rawTools) {
        if (!t || typeof t !== "object") continue
        const trec = t as Record<string, unknown>
        const tname = trec["name"]
        if (typeof tname !== "string") continue
        tools.push({
          name: tname,
          description:
            typeof trec["description"] === "string"
              ? (trec["description"] as string)
              : undefined,
          input_schema: trec["input_schema"] ?? trec["parameters"],
        })
      }
    }
    // OpenAI shape: tools live in mcp_calls[mcp_list_tools] keyed by server_label,
    // not on the mcp_servers entry itself. Walk mcp_calls to enrich.
    if (tools.length === 0) {
      const calls = event["mcp_calls"]
      if (Array.isArray(calls)) {
        for (const c of calls) {
          if (!c || typeof c !== "object") continue
          const crec = c as Record<string, unknown>
          if (crec["type"] !== "mcp_list_tools") continue
          if (crec["server_label"] !== name) continue
          const ctools = crec["tools"]
          if (!Array.isArray(ctools)) continue
          for (const t of ctools) {
            if (!t || typeof t !== "object") continue
            const trec = t as Record<string, unknown>
            const tname = trec["name"]
            if (typeof tname !== "string") continue
            tools.push({
              name: tname,
              description:
                typeof trec["description"] === "string"
                  ? (trec["description"] as string)
                  : undefined,
              input_schema: trec["input_schema"] ?? trec["parameters"],
            })
          }
        }
      }
    }
    out.push({
      name,
      type: typeof rec["type"] === "string" ? (rec["type"] as string) : undefined,
      url:
        typeof rec["url"] === "string"
          ? (rec["url"] as string)
          : typeof rec["server_url"] === "string"
            ? (rec["server_url"] as string)
            : undefined,
      version,
      tools: tools.length > 0 ? tools : undefined,
    })
  }
  return out
}
