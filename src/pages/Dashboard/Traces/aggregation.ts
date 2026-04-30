import type { TokenUsage, TraceGroup, TraceNode, TraceRecord } from "./types"
import { findTraceNodeInTree } from "./treeBuilder"
import { flattenMessageList, safeStringify } from "./utils"

// Wrapper traces (chain/agent roots) carry no `messages`/`response`/`tokens`
// of their own. Walk their subtree to roll up every LLM descendant's prompt,
// response, and usage so the drawer reflects the full conversation and total
// cost instead of three empty sections.
export function aggregateLlmDescendants(node: TraceNode): {
  messages: unknown[]
  responses: string[]
  tokens: TokenUsage | null
} {
  const messages: unknown[] = []
  const responses: string[] = []
  let prompt = 0
  let completion = 0
  let total = 0
  let hasTokens = false

  function walk(n: TraceNode): void {
    const ev = n.trace.event
    if (ev["type"] === "llm") {
      const msgs = ev["messages"]
      if (Array.isArray(msgs)) {
        for (const m of flattenMessageList(msgs)) messages.push(m)
      }
      const resp = ev["response"]
      if (typeof resp === "string" && resp.length > 0) {
        responses.push(resp)
      } else if (resp !== undefined && resp !== null) {
        responses.push(safeStringify(resp))
      }
      const tk = ev["tokens"]
      if (tk && typeof tk === "object" && !Array.isArray(tk)) {
        const rec = tk as Record<string, unknown>
        const p = rec["prompt"] ?? rec["input_tokens"] ?? rec["prompt_tokens"]
        const c =
          rec["completion"] ??
          rec["output_tokens"] ??
          rec["completion_tokens"]
        const tot = rec["total"] ?? rec["total_tokens"]
        if (typeof p === "number") {
          prompt += p
          hasTokens = true
        }
        if (typeof c === "number") {
          completion += c
          hasTokens = true
        }
        if (typeof tot === "number") {
          total += tot
          hasTokens = true
        }
      }
    }
    for (const c of n.children) walk(c)
  }
  walk(node)

  const tokens: TokenUsage | null = hasTokens
    ? { prompt, completion, total }
    : null
  return { messages, responses, tokens }
}

export function synthesizeAggregatedEvent(
  trace: TraceRecord,
  group: TraceGroup | null,
): Record<string, unknown> {
  const event = trace.event
  // Leaf events that already carry llm payload (messages/response/tokens)
  // shouldn't be rewritten — only wrapper events with all three missing.
  if (
    event["messages"] !== undefined ||
    event["response"] !== undefined ||
    event["tokens"] !== undefined
  ) {
    return event
  }
  if (!group) return event
  const node = findTraceNodeInTree(group.root, trace)
  if (!node || node.children.length === 0) return event

  const agg = aggregateLlmDescendants(node)
  if (
    agg.messages.length === 0 &&
    agg.responses.length === 0 &&
    !agg.tokens
  ) {
    return event
  }
  const merged: Record<string, unknown> = { ...event }
  if (agg.messages.length > 0) merged["messages"] = agg.messages
  if (agg.responses.length > 0) {
    merged["response"] =
      agg.responses.length === 1 ? agg.responses[0] : agg.responses
  }
  if (agg.tokens) merged["tokens"] = agg.tokens
  return merged
}
