import type { TraceGroup } from "../utils/types"
import {
  indexGroupToolIO,
  formatToolIOList,
  extractMcpToolCalls,
  extractMcpResults,
} from "./extractors"

/**
 * Build a "grounding" context block from the tool and MCP results a run actually
 * produced, so a metric judge (hallucination / faithfulness) can check the
 * answer's factual claims against the data the agent retrieved — not just the
 * user prompt.
 *
 * Without this, a trace that calls e.g. `get_weather` and answers "18°C" looks
 * like a hallucination to the judge, because the tool's output was never shown
 * to it. Tool outputs are aggregated across the whole run (a call in turn N is
 * answered in turn N+1's history); MCP results are read from the open event.
 *
 * Returns "" when the run has no tool/MCP output to ground against.
 */
export function buildToolGrounding(
  group: TraceGroup | null | undefined,
  event: Record<string, unknown>,
): string {
  const blocks: string[] = []

  // Tool call inputs + outputs across the run, grouped by tool name. Inputs are
  // included so the judge can tie a result to its request (e.g.
  // get_weather(city=Paris) → 18°C), which a bare output may not make explicit.
  if (group) {
    for (const [name, io] of indexGroupToolIO(group)) {
      if (!io.outputs || io.outputs.length === 0) continue
      const outTxt = formatToolIOList(io.outputs)
      if (!outTxt) continue
      const inTxt = io.inputs && io.inputs.length > 0 ? formatToolIOList(io.inputs) : null
      const head = inTxt ? `Tool "${name}" (input: ${inTxt})` : `Tool "${name}"`
      blocks.push(`${head} returned:\n${outTxt}`)
    }
  }

  // MCP tool results reachable from this event.
  const mcpResults = extractMcpResults(event)
  for (const call of extractMcpToolCalls(event, mcpResults)) {
    if (call.output === undefined || call.output === null) continue
    const out =
      typeof call.output === "string" ? call.output : safeJson(call.output)
    const label = call.server ? `${call.name} (MCP server: ${call.server})` : `${call.name} (MCP)`
    blocks.push(`Tool "${label}" returned:\n${out}`)
  }

  if (blocks.length === 0) return ""
  return "Tool & MCP results the agent retrieved during this run:\n\n" + blocks.join("\n\n")
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}
