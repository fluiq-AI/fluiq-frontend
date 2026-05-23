import type {
  FunctionView,
  McpServer,
  RequestMessage,
  ToolDef,
  ToolLatencyMap,
  TokenUsage,
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

export function extractRequestMessages(event: Record<string, unknown>): RequestMessage[] {
  const msgs = event["messages"]
  if (Array.isArray(msgs)) {
    const out: RequestMessage[] = []
    for (const m of flattenMessageList(msgs)) {
      if (!m || typeof m !== "object" || Array.isArray(m)) continue
      const rec = m as Record<string, unknown>
      const role = normalizeMessageRole(rec)
      if (role === "system") continue
      out.push({ role, content: rec["content"] })
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
    const name = rec["name"]
    if (typeof name !== "string") continue
    out.push({
      name,
      description:
        typeof rec["description"] === "string"
          ? (rec["description"] as string)
          : undefined,
      input_schema: rec["input_schema"],
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
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    if (typeof item === "string") {
      if (item.length > 0) out.push(item)
      continue
    }
    if (!item || typeof item !== "object") continue
    const rec = item as Record<string, unknown>
    const text = rec["thinking"] ?? rec["text"]
    if (typeof text === "string" && text.length > 0) out.push(text)
  }
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
