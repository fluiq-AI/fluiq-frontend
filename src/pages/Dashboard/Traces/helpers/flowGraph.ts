import dagre from "@dagrejs/dagre"
import {
  Brain01Icon,
  CloudServerIcon,
  CodeIcon,
  Database01Icon,
  File01Icon,
  Folder01Icon,
  SortByDown01Icon,
  Wrench01Icon,
  WorkflowSquare01Icon,
} from "@hugeicons/core-free-icons"
import { Position, type Edge as RFEdge, type Node as RFNode } from "@xyflow/react"

import { FLOW_NODE_HEIGHT, FLOW_NODE_WIDTH } from "../utils/constants"
import {
  extractLlmToolCallNames,
  extractMcpServers,
  extractMcpToolCalls,
  extractTokens,
  formatToolIOList,
  indexGroupMcpResults,
  indexGroupToolIO,
} from "./extractors"
import type { ToolIO, ToolSelectFn, TokenUsage, TraceGroup, TraceNode, TraceRecord } from "../utils/types"
import { isGoogleAdkAgent, isGoogleAdkLeafAgent } from "./treeBuilder"
import {
  extractTooltipIO,
  getLanggraphNode,
  getStr,
  isFailed,
  isRunning,
  toolSelectionKey,
} from "../utils"

export type CacheEntry = {
  kind: string | null
  hits: number
  misses: number
  total: number
  toolNames?: string[]
  mcpNames?: string[]
}

export type RerankerEntry = {
  reranker: string
  inputCount: number | null
  outputCount: number | null
}

export type FlowNodeData = {
  label: string
  sublabel: string | null
  icon: typeof Folder01Icon
  failed: boolean
  running: boolean
  selected: boolean
  count: number
  request: string | null
  response: string | null
  tokens: TokenUsage | null
  suppressTooltip: boolean
  onSelect: () => void
  cacheEntries?: CacheEntry[]
  rerankerEntries?: RerankerEntry[]
  nodeHeight?: number
}

export type TraceFlowNode = RFNode<FlowNodeData, "trace">

export function layoutFlowNodes(
  nodes: TraceFlowNode[],
  edges: RFEdge[],
): TraceFlowNode[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "TB", nodesep: 24, ranksep: 56 })
  for (const n of nodes) {
    g.setNode(n.id, { width: FLOW_NODE_WIDTH, height: n.data.nodeHeight ?? FLOW_NODE_HEIGHT })
  }
  for (const e of edges) {
    // Skip loop-back edges so dagre's top-down ranking is driven purely by
    // forward execution flow; the loop-back edge is purely visual.
    if (e.sourceHandle === "loop-source") continue
    g.setEdge(e.source, e.target)
  }
  dagre.layout(g)
  return nodes.map((n) => {
    const pos = g.node(n.id)
    const h = n.data.nodeHeight ?? FLOW_NODE_HEIGHT
    return {
      ...n,
      position: {
        x: pos.x - FLOW_NODE_WIDTH / 2,
        y: pos.y - h / 2,
      },
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
    }
  })
}

function shouldSequenceChildren(node: TraceNode): boolean {
  if (node.children.length < 2) return false
  const ev = node.trace.event
  const type = getStr(ev, "type")
  if (type !== "chain" && type !== "agent") return false
  const fn = getStr(ev, "function") ?? ""
  // Don't auto-sequence runnables that explicitly fan out children in parallel.
  if (/parallel|map|branch/i.test(fn)) return false
  return true
}

function anyDescendantIsLanggraphNode(node: TraceNode): boolean {
  for (const c of node.children) {
    if (getLanggraphNode(c.trace.event)) return true
    if (anyDescendantIsLanggraphNode(c)) return true
  }
  return false
}

function collectTopmostLanggraphNodes(
  node: TraceNode,
  out: TraceNode[],
): void {
  for (const c of node.children) {
    if (getLanggraphNode(c.trace.event)) {
      out.push(c)
    } else {
      collectTopmostLanggraphNodes(c, out)
    }
  }
}

function summarizeLgInner(node: TraceNode): string | null {
  // The LG-tagged span (e.g. the `answer` chain wrapper) is opaque in the
  // graph, but we want to surface what runs inside it (the model name for an
  // LLM-backed node, the tool names for a `tools` node) as a sublabel so the
  // box conveys "what happens here" without expanding it.
  let model: string | null = null
  const tools: string[] = []
  const seen = new Set<string>()
  const walk = (n: TraceNode) => {
    for (const c of n.children) {
      const ev = c.trace.event
      const t = getStr(ev, "type")
      if (t === "llm" && model === null) {
        model = getStr(ev, "model")
      } else if (t === "tool") {
        const fn = getStr(ev, "function")
        if (fn && !seen.has(fn)) {
          seen.add(fn)
          tools.push(fn)
        }
      }
      walk(c)
    }
  }
  walk(node)
  if (model && tools.length > 0) return `${model} \u00B7 ${tools.join(", ")}`
  if (model) return model
  if (tools.length > 0) return tools.join(", ")
  return null
}

function describeNode(node: TraceNode): {
  label: string
  sublabel: string | null
  icon: typeof Folder01Icon
} {
  const ev = node.trace.event
  const type = getStr(ev, "type")
  const fn = getStr(ev, "function")
  const model = getStr(ev, "model")
  const integration = getStr(ev, "integration") == "OTHERFUNCTION" ? "FUNCTION" : getStr(ev, "integration")
  const lgNode = getLanggraphNode(ev)
  const hasChildren = node.children.length > 0

  if (lgNode) {
    const inner = summarizeLgInner(node)
    return {
      label: lgNode,
      sublabel: inner ?? model ?? fn ?? integration,
      icon: WorkflowSquare01Icon,
    }
  }
  if (type === "agent" || type === "chain") {
    return {
      label: fn ?? (type === "agent" ? "Agent" : "Chain"),
      sublabel: model ?? integration,
      icon: hasChildren ? Folder01Icon : Brain01Icon,
    }
  }
  if (type === "tool") {
    return {
      label: fn ?? "Tool",
      sublabel: integration,
      icon: Wrench01Icon,
    }
  }
  if (type === "llm") {
    const apiStr = getStr(ev, "api")
    if (apiStr === "embeddings") {
      return {
        label: integration ?? "Embeddings",
        sublabel: model ?? null,
        icon: Database01Icon,
      }
    }
    return {
      label: model ?? fn ?? "LLM call",
      sublabel: integration,
      icon: Brain01Icon,
    }
  }
  if (type === "vectorstore") {
    const apiStr = getStr(ev, "api")
    return {
      label: integration?.toLowerCase() ?? "vectorstore",
      sublabel: apiStr,
      icon: Database01Icon,
    }
  }
  if (type === "cache") {
    // Cache spans emitted by EmbeddingCache / PromptCache / DocumentCache /
    // ToolCache via auto_optimize(). Surface the kind ("embedding",
    // "prompt", "document", "tool") and a hit/miss summary so the box
    // conveys the cache outcome at a glance without expanding it.
    const kind = getStr(ev, "cache_kind")
    const hits = ev["cache_hits"]
    const misses = ev["cache_misses"]
    const size = ev["cache_size"]
    let outcome: string | null = null
    if (typeof hits === "number" && typeof misses === "number") {
      const total =
        typeof size === "number" && Number.isFinite(size) ? size : hits + misses
      if (total > 0) {
        if (misses === 0) outcome = `hit (${hits}/${total})`
        else if (hits === 0) outcome = `miss (${misses}/${total})`
        else outcome = `${hits}/${total} hit`
      }
    }
    const label = kind ? `${kind} cache` : "Cache"
    const sublabel = outcome ?? (model ?? null)
    return { label, sublabel, icon: Database01Icon }
  }
  if (type === "rerank") {
    // Rerank spans emitted by TracedReranker around BM25 / cross-encoder /
    // hybrid / MMR. Surface reranker name and the candidate count change
    // (e.g. "20 -> 5") so the box reads as the reranking step it is.
    const reranker = getStr(ev, "reranker") ?? fn ?? "rerank"
    const inN = ev["input_count"]
    const outN = ev["output_count"]
    let sublabel: string | null = null
    if (typeof inN === "number" && typeof outN === "number") {
      sublabel = `${inN} \u2192 ${outN}`
    }
    return { label: reranker, sublabel, icon: SortByDown01Icon }
  }
  if (type === "function" || fn) {
    return {
      label: fn ?? "Function",
      sublabel: integration,
      icon: hasChildren ? Folder01Icon : CodeIcon,
    }
  }
  return {
    label: integration ?? "Trace",
    sublabel: model,
    icon: hasChildren ? Folder01Icon : File01Icon,
  }
}

// Aggregate every `llm` event in the subtree into a single START NODE summary:
// concatenate per-call inputs/outputs (tagged when there is more than one) so
// the hover tooltip shows the full conversation across iterations and child
// agents, and sum prompt/completion/total token counts so the START NODE can
// surface the trace's total cost without the user having to click into each
// LLM box. Returns nulls when the subtree contains no LLM events.
function aggregateLlmStats(node: TraceNode): {
  request: string | null
  response: string | null
  tokens: TokenUsage | null
} {
  const reqs: string[] = []
  const ress: string[] = []
  let prompt = 0
  let completion = 0
  let total = 0
  let any = false
  let count = 0
  const walk = (n: TraceNode) => {
    if (getStr(n.trace.event, "type") === "llm") {
      count += 1
      const io = extractTooltipIO(n.trace.event)
      if (io.request !== null) reqs.push(io.request)
      if (io.response !== null) ress.push(io.response)
      const tk = extractTokens(n.trace.event)
      if (tk) {
        if (typeof tk.prompt === "number") {
          prompt += tk.prompt
          any = true
        }
        if (typeof tk.completion === "number") {
          completion += tk.completion
          any = true
        }
        if (typeof tk.total === "number") {
          total += tk.total
          any = true
        }
      }
    }
    for (const c of n.children) walk(c)
  }
  walk(node)
  const tag = (i: number): string => (count > 1 ? `#${i + 1}\n` : "")
  const request =
    reqs.length > 0 ? reqs.map((r, i) => `${tag(i)}${r}`).join("\n\n") : null
  const response =
    ress.length > 0 ? ress.map((r, i) => `${tag(i)}${r}`).join("\n\n") : null
  let tokens: TokenUsage | null = null
  if (any) {
    const fallbackTotal = prompt + completion
    tokens = {
      prompt: prompt > 0 ? prompt : undefined,
      completion: completion > 0 ? completion : undefined,
      total:
        total > 0 ? total : fallbackTotal > 0 ? fallbackTotal : undefined,
    }
  }
  return { request, response, tokens }
}

export function buildFlowElements(
  group: TraceGroup,
  selectedNodeId: string | null,
  onSelectTrace: (t: TraceRecord) => void,
  toolSel?: { selectedToolKey: string | null; onSelectTool: ToolSelectFn },
): { nodes: TraceFlowNode[]; edges: RFEdge[] } {
  type ViewOverride = {
    label: string
    sublabel: string | null
    icon: typeof Folder01Icon
  }
  type StartStats = {
    request: string | null
    response: string | null
    tokens: TokenUsage | null
  }
  type Bucket = {
    first: TraceNode
    latest: TraceNode
    failed: boolean
    running: boolean
    count: number
    traceIds: Set<string>
    iterations: TraceNode[]
    view?: ViewOverride
    startStats?: StartStats
    ioOverride?: { request: string | null; response: string | null }
    toolSelect?: {
      key: string
      parentTrace: TraceRecord
      name: string
      input: unknown
      output: unknown
      server?: string
    }
    cacheEntries?: CacheEntry[]
    rerankerEntries?: RerankerEntry[]
    nodeHeight?: number
  }
  const buckets = new Map<string, Bucket>()
  // Tool input/output correlated across the group's llm spans, keyed by tool
  // name. Lets synthetic embedded-tool nodes (which carry the LLM's trace, not
  // a tool span) show the call's arguments and its returned result.
  const toolIO = indexGroupToolIO(group)
  // MCP tool results keyed by call id (Anthropic results arrive separately).
  const mcpResults = indexGroupMcpResults(group)
  const order: string[] = []
  const orderIndex = new Map<string, number>()
  const edgeKeys = new Set<string>()
  const edges: RFEdge[] = []

  const recordNode = (
    flowId: string,
    t: TraceNode,
    view?: ViewOverride,
  ) => {
    let b = buckets.get(flowId)
    if (!b) {
      b = {
        first: t,
        latest: t,
        failed: false,
        running: false,
        count: 0,
        traceIds: new Set(),
        iterations: [],
        view,
      }
      buckets.set(flowId, b)
      orderIndex.set(flowId, order.length)
      order.push(flowId)
    }
    if (b.traceIds.has(t.id)) return
    b.latest = t
    b.count += 1
    b.traceIds.add(t.id)
    b.iterations.push(t)
    if (isFailed(t.trace.event)) b.failed = true
    // The latest iteration's status drives the visual: a node that retried
    // after a failure and is running again should show the spinner, not the
    // red border. Failed remains sticky (set above) so a fully-failed node
    // still surfaces its error indicator after the run completes.
    b.running = isRunning(b.latest.trace.event)
  }

  const recordEdge = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    const key = `${sourceId}->${targetId}`
    if (edgeKeys.has(key)) return
    edgeKeys.add(key)
    const sIdx = orderIndex.get(sourceId) ?? -1
    const tIdx = orderIndex.get(targetId) ?? -1
    const isLoopback = tIdx >= 0 && sIdx >= 0 && tIdx < sIdx
    edges.push({
      id: key,
      source: sourceId,
      target: targetId,
      // Loop-back edges route through right-side handles so they don't
      // overlap the forward edge between the same two nodes.
      sourceHandle: isLoopback ? "loop-source" : undefined,
      targetHandle: isLoopback ? "loop-target" : undefined,
      type: "smoothstep",
      animated: isLoopback,
      style: isLoopback
        ? { strokeDasharray: "5 4", stroke: "var(--color-primary)" }
        : undefined,
    })
  }

  // A flow node id collapses repeated executions of the same logical step
  // into one visual box so iterations become loop-back edges instead of
  // duplicate boxes. LangGraph keys by `langgraph_node`; GoogleADK keys by
  // the agent's stable `function` name (so each iteration of writer/critic
  // inside a LoopAgent merges).
  const flowIdFor = (node: TraceNode, scope: string): string => {
    const ev = node.trace.event
    const lg = getLanggraphNode(ev)
    if (lg) return `lg:${scope}:${lg}`
    if (isGoogleAdkAgent(ev)) {
      const fn = getStr(ev, "function")
      if (fn) return `gadk:${scope}:${fn}`
    }
    return node.id
  }

  // A LangGraph `tools` node runs one or more concrete tool calls per
  // invocation; merging every invocation under a single `tools` box hides
  // the fact that different tools were used. When an LG node contains tool
  // descendants we surface the tools themselves as the visual nodes,
  // bucketed by tool function name so two `get_weather` calls still merge
  // but `get_weather` and `get_population` render as separate boxes.
  const expandLgForFlow = (
    lgNode: TraceNode,
    scope: string,
  ): { node: TraceNode; flowId: string }[] => {
    const tools: TraceNode[] = []
    const walk = (n: TraceNode) => {
      for (const c of n.children) {
        if (getStr(c.trace.event, "type") === "tool") tools.push(c)
        else walk(c)
      }
    }
    walk(lgNode)
    if (tools.length === 0) {
      return [{ node: lgNode, flowId: flowIdFor(lgNode, scope) }]
    }
    return tools.map((t) => {
      const fn = getStr(t.trace.event, "function") ?? t.id
      return { node: t, flowId: `tool:${scope}:${fn}` }
    })
  }

  // A GoogleADK leaf LlmAgent is rendered as a single opaque box (so that
  // LoopAgent iterations collapse into one), but its tool calls are still
  // meaningful and should appear as their own flow nodes. Walk the agent's
  // tool descendants and emit one flow node per unique tool function,
  // bucketed under the agent's flow id so iterations across a LoopAgent
  // merge into one tool box per name rather than spawning duplicates.
  const expandGadkLeafTools = (
    agentNode: TraceNode,
    agentFlowId: string,
  ): void => {
    const walk = (n: TraceNode) => {
      for (const c of n.children) {
        if (getStr(c.trace.event, "type") === "tool") {
          const fn = getStr(c.trace.event, "function") ?? c.id
          const toolFlowId = `gadktool:${agentFlowId}:${fn}`
          recordNode(toolFlowId, c)
          recordEdge(agentFlowId, toolFlowId)
        } else {
          walk(c)
        }
      }
    }
    walk(agentNode)
  }

  // MCP servers used by an LLM call live as metadata on the LLM event itself
  // (Anthropic `mcp_servers=`, OpenAI Responses `tools=[{type:"mcp",...}]`,
  // Gemini sessions). They are not separate trace events, so they would be
  // invisible in the architecture view despite being meaningful integration
  // points. Surface each unique MCP server (by name) as its own flow node
  // attached to the visible parent — mirroring how tools are rendered. For
  // opaque containers (LangGraph node, GoogleADK leaf agent) we walk the
  // entire subtree so MCP servers used inside the opaque box still surface;
  // for transparent nodes we only inspect the node itself since descendants
  // get their own visit and would otherwise double-emit.
  const expandMcpServers = (
    node: TraceNode,
    parentFlowId: string,
    includeSubtree: boolean,
  ): void => {
    const seen = new Set<string>()
    const visitForMcp = (n: TraceNode) => {
      for (const s of extractMcpServers(n.trace.event)) {
        if (seen.has(s.name)) continue
        seen.add(s.name)
        const flowId = `mcp:${parentFlowId}:${s.name}`
        const synthetic: TraceNode = {
          id: `${n.id}__mcp__${s.name}`,
          trace: n.trace,
          children: [],
        }
        const sublabelParts: string[] = []
        if (s.url) sublabelParts.push(s.url)
        else if (s.type) sublabelParts.push(s.type)
        if (s.tools && s.tools.length > 0) {
          sublabelParts.push(`${s.tools.length} tool${s.tools.length === 1 ? "" : "s"}`)
        }
        recordNode(flowId, synthetic, {
          label: s.name,
          sublabel: sublabelParts.length > 0 ? sublabelParts.join(" \u2022 ") : "MCP",
          icon: CloudServerIcon as typeof Folder01Icon,
        })
        recordEdge(parentFlowId, flowId)
      }
      if (includeSubtree) {
        for (const c of n.children) visitForMcp(c)
      }
    }
    visitForMcp(node)
  }

  // Tool calls embedded on an LLM event (OpenAI `tool_calls`, Anthropic
  // `tool_uses`, Gemini `function_calls`) when the user's tool function isn't
  // @trace-decorated. The tool execution itself emits no trace span, so the
  // call would otherwise be invisible between two LLM boxes. Each unique tool
  // name is bucketed under the LLM's flow id so repeated invocations of the
  // same tool across iterations collapse into one box.
  const expandLlmToolCalls = (
    node: TraceNode,
    parentFlowId: string,
  ): void => {
    const names = extractLlmToolCallNames(node.trace.event)
    for (const name of names) {
      const flowId = `llmtool:${parentFlowId}:${name}`
      const synthetic: TraceNode = {
        id: `${node.id}__llmtool__${name}`,
        trace: node.trace,
        children: [],
      }
      recordNode(flowId, synthetic, {
        label: name,
        sublabel: "Tool",
        icon: Wrench01Icon as typeof Folder01Icon,
      })
      // Attach the call's arguments (input) and its correlated result (output)
      // so the node's hover tooltip is as useful as a real tool span's, and
      // make the node selectable (clicking opens the tool's detail panel).
      const io: ToolIO | undefined = toolIO.get(name)
      const b = buckets.get(flowId)
      if (b) {
        if (io) {
          b.ioOverride = {
            request: formatToolIOList(io.inputs),
            response: formatToolIOList(io.outputs),
          }
        }
        b.toolSelect = {
          key: toolSelectionKey(node.trace.event, node.id, name),
          parentTrace: node.trace,
          name,
          input: io ? (io.inputs.length === 1 ? io.inputs[0] : io.inputs) : undefined,
          output: io ? (io.outputs.length === 1 ? io.outputs[0] : io.outputs) : undefined,
        }
      }
      recordEdge(parentFlowId, flowId)
    }
  }

  // MCP tool calls invoked by an LLM call (OpenAI `mcp_call` items / Anthropic
  // `mcp_tool_use` blocks). Like embedded tool calls these aren't trace spans,
  // so we surface each as its own selectable node (input = call arguments,
  // output = the MCP result). Each call nests UNDER its MCP server node (the
  // integration point created by expandMcpServers) when that node exists,
  // matching the user's mental model of "server → calls"; otherwise it falls
  // back to attaching directly under the LLM so nothing disappears.
  const expandMcpToolCalls = (
    node: TraceNode,
    parentFlowId: string,
  ): void => {
    for (const call of extractMcpToolCalls(node.trace.event, mcpResults)) {
      const flowId = `mcptool:${parentFlowId}:${call.name}`
      const synthetic: TraceNode = {
        id: `${node.id}__mcptool__${call.name}`,
        trace: node.trace,
        children: [],
      }
      recordNode(flowId, synthetic, {
        label: call.name,
        sublabel: call.server ? `MCP · ${call.server}` : "MCP tool",
        icon: CloudServerIcon as typeof Folder01Icon,
      })
      const b = buckets.get(flowId)
      if (b) {
        b.ioOverride = {
          request: formatToolIOList([call.input]),
          response: call.output !== undefined ? formatToolIOList([call.output]) : null,
        }
        b.toolSelect = {
          key: toolSelectionKey(node.trace.event, node.id, call.name),
          parentTrace: node.trace,
          name: call.name,
          input: call.input,
          output: call.output,
          server: call.server,
        }
      }
      // Nest under the matching server node when present (expandMcpServers runs
      // first in `visit`), else fall back to the LLM.
      const serverFlowId = call.server
        ? `mcp:${parentFlowId}:${call.server}`
        : undefined
      const attachTo =
        serverFlowId && buckets.has(serverFlowId) ? serverFlowId : parentFlowId
      recordEdge(attachTo, flowId)
    }
  }

  const visit = (
    node: TraceNode,
    parentFlowId: string | null,
    parentScope: string,
  ) => {
    const ev = node.trace.event
    const isLg = getLanggraphNode(ev) !== null
    const isGadkLeaf = isGoogleAdkLeafAgent(node)
    const type = getStr(ev, "type")
    const myFlowId = flowIdFor(node, parentScope)
    recordNode(myFlowId, node)
    if (parentFlowId !== null) recordEdge(parentFlowId, myFlowId)

    // A LangGraph node is opaque: its descendants (the LLM call inside an
    // `agent` node, the tool span inside a `tools` node) inherit the same
    // langgraph_node metadata and would otherwise spawn duplicate boxes.
    // Render the LG span itself and stop — its IO/latency are already on the
    // span, surfaced via the drawer when the user clicks the box.
    if (isLg) {
      expandMcpServers(node, myFlowId, true)
      return
    }

    // A GoogleADK LlmAgent is opaque for the same reason: each iteration of
    // a LoopAgent emits a fresh LLM (and possibly tool) child trace. Without
    // this short-circuit, a 3-iteration writer/critic loop would spawn three
    // distinct LLM boxes per agent instead of merging them into the writer
    // and critic boxes themselves. Per-iteration LLM IO is rolled up into
    // the agent box's tooltip and the drawer; tool descendants are surfaced
    // as their own flow nodes (bucketed by tool function name) so users can
    // see which tools the agent invoked.
    if (isGadkLeaf) {
      expandGadkLeafTools(node, myFlowId)
      expandMcpServers(node, myFlowId, true)
      return
    }

    // MCP servers attached directly to this node's event (e.g. a standalone
    // Anthropic/OpenAI Responses LLM call). Descendants will be visited
    // separately and surface their own MCP servers under their own boxes.
    expandMcpServers(node, myFlowId, false)

    // Tool calls embedded on an LLM event whose tool function isn't
    // @trace-decorated (e.g. plain Python `fake_weather` invoked between
    // two chat.completions.create calls). The SDK never emits a `tool`
    // span for those, so the call is otherwise invisible in the flow.
    expandLlmToolCalls(node, myFlowId)
    expandMcpToolCalls(node, myFlowId)

    // A compound reranker (e.g. hybrid) that contains sub-reranker children
    // (bm25, cross-encoder, mmr …) is treated as opaque: the children are
    // folded into the parent node rather than spawned as separate flow nodes.
    if (type === "rerank") {
      const subRankers = node.children.filter(
        (c) => getStr(c.trace.event, "type") === "rerank",
      )
      if (subRankers.length > 0) {
        const subNames = subRankers
          .map(
            (c) =>
              getStr(c.trace.event, "reranker") ?? getStr(c.trace.event, "function"),
          )
          .filter((n): n is string => n !== null)
        const b = buckets.get(myFlowId)
        if (b) {
          const rerankerName =
            getStr(ev, "reranker") ?? getStr(ev, "function") ?? "rerank"
          b.view = {
            label: rerankerName,
            sublabel: subNames.join(" + "),
            icon: SortByDown01Icon as typeof Folder01Icon,
          }
        }
        return
      }
    }

    // LangGraph wrapper: a chain/agent whose descendants carry langgraph_node
    // tags. Pregel inserts one RunnableSequence wrapper per iteration between
    // the compiled graph and the actual nodes; we skip those wrappers and
    // pull every topmost langgraph_node descendant directly under this box,
    // sequencing them in execution order so repeated iterations collapse
    // into loop-back edges instead of stacking sibling boxes.
    if (
      (type === "chain" || type === "agent") &&
      anyDescendantIsLanggraphNode(node)
    ) {
      const lgChildren: TraceNode[] = []
      collectTopmostLanggraphNodes(node, lgChildren)
      let prevFlowId = myFlowId
      for (const c of lgChildren) {
        for (const exp of expandLgForFlow(c, myFlowId)) {
          recordNode(exp.flowId, exp.node)
          recordEdge(prevFlowId, exp.flowId)
          prevFlowId = exp.flowId
        }
      }
      return
    }

    const children = node.children
    if (children.length === 0) return
    const childScope = myFlowId

    if (shouldSequenceChildren(node)) {
      // Sequence children in execution order; repeated logical ids dedupe
      // into loop-back edges. Children are already timestamp-sorted in
      // buildTraceTree so iteration order matches execution order.
      let prevFlowId = myFlowId
      for (const c of children) {
        const cFlowId = flowIdFor(c, childScope)
        recordNode(cFlowId, c)
        recordEdge(prevFlowId, cFlowId)
        prevFlowId = cFlowId
        if (getLanggraphNode(c.trace.event)) {
          expandMcpServers(c, cFlowId, true)
          continue
        }
        if (isGoogleAdkLeafAgent(c)) {
          expandGadkLeafTools(c, cFlowId)
          expandMcpServers(c, cFlowId, true)
          continue
        }
        expandLlmToolCalls(c, cFlowId)
        expandMcpToolCalls(c, cFlowId)
        for (const gc of c.children) visit(gc, cFlowId, cFlowId)
      }
      return
    }

    for (const c of children) visit(c, myFlowId, childScope)
  }
  visit(group.root, null, group.root.id)

  // Single "Fluiq Caching" node aggregating all LLM (prompt) and embedding
  // buckets that carry cache_hit data from fluiq.optimize(). A single node is
  // inserted before the first affected bucket; each affected bucket's parent
  // edge is re-routed through it: parent(s) → Fluiq Caching → affected buckets.
  {
    const parentOf = new Map<string, string>()
    for (const e of edges) {
      if (e.sourceHandle !== "loop-source") parentOf.set(e.target, e.source)
    }

    const optimizedFlowIds = order.filter((flowId) => {
      const b = buckets.get(flowId)
      if (!b) return false
      const type = getStr(b.first.trace.event, "type")
      if (type !== "llm" && type !== "embedding" && type !== "vectorstore") return false
      return b.iterations.some(
        (it) => typeof it.trace.event["cache_hit"] === "boolean",
      )
    })

    if (optimizedFlowIds.length > 0) {
      let promptHits = 0
      let promptMisses = 0
      let embeddingHits = 0
      let embeddingMisses = 0
      // vectorstore kind → { hits, misses } — one row per unique integration
      const vsMap = new Map<string, { hits: number; misses: number }>()
      // unique tool/MCP names seen across all cached LLM (prompt) hits
      const promptToolNames = new Set<string>()
      const promptMcpNames = new Set<string>()

      for (const flowId of optimizedFlowIds) {
        const b = buckets.get(flowId)!
        const type = getStr(b.first.trace.event, "type")
        const api = getStr(b.first.trace.event, "api")
        const isEmbeddingBucket = type === "embedding" || (type === "llm" && api === "embeddings")
        for (const it of b.iterations) {
          const ch = it.trace.event["cache_hit"]
          if (isEmbeddingBucket) {
            if (ch === true) embeddingHits++
            else if (ch === false) embeddingMisses++
          } else if (type === "vectorstore") {
            const integration = (
              getStr(it.trace.event, "integration") || "vectorstore"
            ).toLowerCase()
            const row = vsMap.get(integration) ?? { hits: 0, misses: 0 }
            if (ch === true) row.hits++
            else if (ch === false) row.misses++
            vsMap.set(integration, row)
          } else {
            if (ch === true) {
              promptHits++
              for (const name of extractLlmToolCallNames(it.trace.event)) {
                promptToolNames.add(name)
              }
              for (const s of extractMcpServers(it.trace.event)) {
                promptMcpNames.add(s.name)
              }
            } else if (ch === false) promptMisses++
          }
        }
      }

      const cacheEntries: CacheEntry[] = []
      const promptTotal = promptHits + promptMisses
      if (promptTotal > 0) {
        const toolNames = promptToolNames.size > 0 ? [...promptToolNames] : undefined
        const mcpNames = promptMcpNames.size > 0 ? [...promptMcpNames] : undefined
        cacheEntries.push({ kind: "prompt", hits: promptHits, misses: promptMisses, total: promptTotal, toolNames, mcpNames })
      }
      const embeddingTotal = embeddingHits + embeddingMisses
      if (embeddingTotal > 0) {
        cacheEntries.push({ kind: "embedding", hits: embeddingHits, misses: embeddingMisses, total: embeddingTotal })
      }
      for (const [kind, { hits, misses }] of vsMap) {
        const total = hits + misses
        if (total > 0) cacheEntries.push({ kind, hits, misses, total })
      }

      if (cacheEntries.length > 0) {
        const firstBucket = buckets.get(optimizedFlowIds[0])!
        const nodeHeight = Math.max(
          FLOW_NODE_HEIGHT,
          44 + cacheEntries.reduce(
            (sum, e) =>
              sum +
              32 +
              (e.toolNames && e.toolNames.length > 0 ? 20 : 0) +
              (e.mcpNames && e.mcpNames.length > 0 ? 20 : 0),
            0,
          ),
        )
        const fluiqCacheFlowId = "fluiq-caching"

        const syntheticNode: TraceNode = {
          id: `${firstBucket.first.id}__fluiq_cache__`,
          trace: firstBucket.first.trace,
          children: [],
        }

        const cachedKinds = cacheEntries
          .filter((e) => e.hits > 0)
          .map((e) =>
            e.kind === "embedding"
              ? "Embedding Cached"
              : e.kind === "prompt"
              ? "Prompt Cached"
              : "Query Cached",
          )
        const sublabel = cachedKinds.length > 0 ? cachedKinds.join(" · ") : null

        const mergedTraceIds = new Set<string>()
        for (const flowId of optimizedFlowIds) {
          for (const id of buckets.get(flowId)!.traceIds) mergedTraceIds.add(id)
        }

        buckets.set(fluiqCacheFlowId, {
          first: syntheticNode,
          latest: syntheticNode,
          failed: false,
          running: false,
          count: optimizedFlowIds.length,
          traceIds: mergedTraceIds,
          iterations: [syntheticNode],
          view: {
            label: "Fluiq Caching",
            sublabel,
            icon: Database01Icon as typeof Folder01Icon,
          },
          cacheEntries,
          nodeHeight,
        })

        const firstIdx = order.indexOf(optimizedFlowIds[0])
        order.splice(firstIdx, 0, fluiqCacheFlowId)
        orderIndex.clear()
        order.forEach((id, i) => orderIndex.set(id, i))

        for (const flowId of optimizedFlowIds) {
          const parentFlowId = parentOf.get(flowId)
          if (parentFlowId !== undefined) {
            const directKey = `${parentFlowId}->${flowId}`
            const idx = edges.findIndex((e) => e.id === directKey)
            if (idx >= 0) {
              edgeKeys.delete(directKey)
              edges.splice(idx, 1)
            }
            const p2cKey = `${parentFlowId}->${fluiqCacheFlowId}`
            if (!edgeKeys.has(p2cKey)) {
              edgeKeys.add(p2cKey)
              edges.push({ id: p2cKey, source: parentFlowId, target: fluiqCacheFlowId, type: "smoothstep" })
            }
          }
          const c2bKey = `${fluiqCacheFlowId}->${flowId}`
          if (!edgeKeys.has(c2bKey)) {
            edgeKeys.add(c2bKey)
            edges.push({ id: c2bKey, source: fluiqCacheFlowId, target: flowId, type: "smoothstep" })
          }
        }
      }
    }
  }

  // Merge sibling cache nodes that share the same parent into one consolidated
  // box. This only applies to non-sequenced children (in sequenced layouts the
  // caches form a chain and each has a different "parent" in the edge graph).
  {
    const parentOf = new Map<string, string>()
    for (const e of edges) {
      if (e.sourceHandle !== "loop-source") parentOf.set(e.target, e.source)
    }

    const cacheFlowIds = new Set<string>()
    for (const [flowId, bucket] of buckets) {
      if (getStr(bucket.first.trace.event, "type") === "cache") {
        cacheFlowIds.add(flowId)
      }
    }

    const cachesByParent = new Map<string, string[]>()
    for (const cFlowId of cacheFlowIds) {
      const parent = parentOf.get(cFlowId)
      if (parent === undefined) continue
      let list = cachesByParent.get(parent)
      if (!list) {
        list = []
        cachesByParent.set(parent, list)
      }
      list.push(cFlowId)
    }

    for (const [parentFlowId, cacheIds] of cachesByParent) {
      if (cacheIds.length < 2) continue

      cacheIds.sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0))

      const entries: CacheEntry[] = []
      let anyFailed = false
      let anyRunning = false
      const mergedTraceIds = new Set<string>()
      const mergedIterations: TraceNode[] = []

      for (const cId of cacheIds) {
        const b = buckets.get(cId)!
        if (b.failed) anyFailed = true
        if (b.running) anyRunning = true

        let totalHits = 0
        let totalMisses = 0
        let totalSize = 0
        let kind: string | null = null

        for (const it of b.iterations) {
          const ev = it.trace.event
          if (kind === null) kind = getStr(ev, "cache_kind")
          const h = typeof ev["cache_hits"] === "number" ? (ev["cache_hits"] as number) : 0
          const m = typeof ev["cache_misses"] === "number" ? (ev["cache_misses"] as number) : 0
          const sz =
            typeof ev["cache_size"] === "number" && Number.isFinite(ev["cache_size"] as number)
              ? (ev["cache_size"] as number)
              : h + m
          totalHits += h
          totalMisses += m
          totalSize += sz
          mergedIterations.push(it)
          mergedTraceIds.add(it.id)
        }
        entries.push({
          kind,
          hits: totalHits,
          misses: totalMisses,
          total: Math.max(totalSize, totalHits + totalMisses),
        })
      }

      const mergedFlowId = `merged-cache:${parentFlowId}`
      const nodeHeight = Math.max(FLOW_NODE_HEIGHT, 44 + 32 * entries.length)
      const firstBucket = buckets.get(cacheIds[0])!

      buckets.set(mergedFlowId, {
        first: firstBucket.first,
        latest: mergedIterations[mergedIterations.length - 1],
        failed: anyFailed,
        running: anyRunning,
        count: 1,
        traceIds: mergedTraceIds,
        iterations: mergedIterations,
        view: { label: "Cache", sublabel: null, icon: Database01Icon },
        cacheEntries: entries,
        nodeHeight,
      })

      const sortedRemoveIndices = cacheIds
        .map((id) => order.indexOf(id))
        .filter((i) => i >= 0)
        .sort((a, b) => a - b)
      const insertAt = sortedRemoveIndices[0]
      for (let i = sortedRemoveIndices.length - 1; i >= 0; i--) {
        order.splice(sortedRemoveIndices[i], 1)
      }
      order.splice(insertAt, 0, mergedFlowId)
      orderIndex.clear()
      order.forEach((id, i) => orderIndex.set(id, i))

      for (const cId of cacheIds) buckets.delete(cId)

      const edgesToRemove = new Set(cacheIds.map((cId) => `${parentFlowId}->${cId}`))
      for (let i = edges.length - 1; i >= 0; i--) {
        if (edgesToRemove.has(edges[i].id)) {
          edgeKeys.delete(edges[i].id)
          edges.splice(i, 1)
        }
      }
      const mergedEdgeKey = `${parentFlowId}->${mergedFlowId}`
      edgeKeys.add(mergedEdgeKey)
      edges.push({ id: mergedEdgeKey, source: parentFlowId, target: mergedFlowId, type: "smoothstep" })
    }
  }

  // Merge sibling reranker nodes that share the same parent into one consolidated
  // box, same treatment as cache nodes above.
  {
    const parentOf = new Map<string, string>()
    for (const e of edges) {
      if (e.sourceHandle !== "loop-source") parentOf.set(e.target, e.source)
    }

    const rerankerFlowIds = new Set<string>()
    for (const [flowId, bucket] of buckets) {
      if (getStr(bucket.first.trace.event, "type") === "rerank") {
        rerankerFlowIds.add(flowId)
      }
    }

    const rerankersByParent = new Map<string, string[]>()
    for (const rFlowId of rerankerFlowIds) {
      const parent = parentOf.get(rFlowId)
      if (parent === undefined) continue
      let list = rerankersByParent.get(parent)
      if (!list) {
        list = []
        rerankersByParent.set(parent, list)
      }
      list.push(rFlowId)
    }

    for (const [parentFlowId, rerankerIds] of rerankersByParent) {
      if (rerankerIds.length < 2) continue

      rerankerIds.sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0))

      const entries: RerankerEntry[] = []
      let anyFailed = false
      let anyRunning = false
      const mergedTraceIds = new Set<string>()
      const mergedIterations: TraceNode[] = []

      for (const rId of rerankerIds) {
        const b = buckets.get(rId)!
        if (b.failed) anyFailed = true
        if (b.running) anyRunning = true

        let totalInput = 0
        let totalOutput = 0
        let hasInput = false
        let hasOutput = false
        let rerankerName: string | null = null

        for (const it of b.iterations) {
          const ev = it.trace.event
          if (rerankerName === null) {
            rerankerName = getStr(ev, "reranker") ?? getStr(ev, "function") ?? "rerank"
          }
          const inN = ev["input_count"]
          const outN = ev["output_count"]
          if (typeof inN === "number") {
            totalInput += inN
            hasInput = true
          }
          if (typeof outN === "number") {
            totalOutput += outN
            hasOutput = true
          }
          mergedIterations.push(it)
          mergedTraceIds.add(it.id)
        }

        entries.push({
          reranker: rerankerName ?? "rerank",
          inputCount: hasInput ? totalInput : null,
          outputCount: hasOutput ? totalOutput : null,
        })
      }

      const mergedFlowId = `merged-rerank:${parentFlowId}`
      const nodeHeight = Math.max(FLOW_NODE_HEIGHT, 44 + 22 * entries.length)
      const firstBucket = buckets.get(rerankerIds[0])!

      buckets.set(mergedFlowId, {
        first: firstBucket.first,
        latest: mergedIterations[mergedIterations.length - 1],
        failed: anyFailed,
        running: anyRunning,
        count: 1,
        traceIds: mergedTraceIds,
        iterations: mergedIterations,
        view: { label: "Rerank", sublabel: null, icon: SortByDown01Icon },
        rerankerEntries: entries,
        nodeHeight,
      })

      const sortedRemoveIndices = rerankerIds
        .map((id) => order.indexOf(id))
        .filter((i) => i >= 0)
        .sort((a, b) => a - b)
      const insertAt = sortedRemoveIndices[0]
      for (let i = sortedRemoveIndices.length - 1; i >= 0; i--) {
        order.splice(sortedRemoveIndices[i], 1)
      }
      order.splice(insertAt, 0, mergedFlowId)
      orderIndex.clear()
      order.forEach((id, i) => orderIndex.set(id, i))

      for (const rId of rerankerIds) buckets.delete(rId)

      const edgesToRemove = new Set(rerankerIds.map((rId) => `${parentFlowId}->${rId}`))
      for (let i = edges.length - 1; i >= 0; i--) {
        if (edgesToRemove.has(edges[i].id)) {
          edgeKeys.delete(edges[i].id)
          edges.splice(i, 1)
        }
      }
      const mergedEdgeKey = `${parentFlowId}->${mergedFlowId}`
      edgeKeys.add(mergedEdgeKey)
      edges.push({ id: mergedEdgeKey, source: parentFlowId, target: mergedFlowId, type: "smoothstep" })
    }
  }

  // Surface a "START NODE" at the top of the flow that aggregates the trace's
  // cross-cutting summary (every LLM call's request/response and the total
  // token usage). LangGraph and chain/agent-rooted integrations (GoogleADK,
  // CrewAI, LlamaIndex, ...) already have a wrapper at the top of the tree,
  // so we attach the start metadata to that bucket and relabel it. Standalone
  // LLM integrations (Anthropic, OpenAI, Gemini called directly without a
  // chain/agent wrapper) have an `llm` event as the root; for those we
  // synthesize a START NODE flow node and parent the real root under it so
  // the visual treatment matches across integrations.
  if (order.length > 0) {
    const rootEv = group.root.trace.event
    const rootType = getStr(rootEv, "type")
    const rootIntegration = getStr(rootEv, "integration") == "OTHERFUNCTION" ? "FUNCTION" : getStr(rootEv, "integration")
    const stats = aggregateLlmStats(group.root)
    if (rootType === "chain" || rootType === "agent") {
      const rootBucket = buckets.get(order[0])
      if (rootBucket) rootBucket.startStats = stats
    } else {
      const startFlowId = "__start__"
      const startBucket: Bucket = {
        first: group.root,
        latest: group.root,
        failed: false,
        running: isRunning(group.root.trace.event),
        count: 1,
        traceIds: new Set([group.root.id]),
        iterations: [group.root],
        view: {
          label: "START NODE",
          sublabel: rootIntegration,
          icon: WorkflowSquare01Icon,
        },
        startStats: stats,
      }
      buckets.set(startFlowId, startBucket)
      // Prepend so the START NODE renders at the top of the flow.
      order.unshift(startFlowId)
      orderIndex.clear()
      order.forEach((id, i) => orderIndex.set(id, i))
      // Connect START NODE to every real node that has no incoming edge yet.
      // In a single-root trace that is just the trace root; in a parallel-root
      // trace (multiple concurrent top-level workers) it fans out to all of them.
      const hasIncoming = new Set(edges.map((e) => e.target))
      for (let i = 1; i < order.length; i++) {
        const rId = order[i]
        if (!hasIncoming.has(rId)) {
          const edgeKey = `${startFlowId}->${rId}`
          if (!edgeKeys.has(edgeKey)) {
            edgeKeys.add(edgeKey)
            edges.push({
              id: edgeKey,
              source: startFlowId,
              target: rId,
              type: "smoothstep",
            })
          }
        }
      }
    }
  }

  // Drop nodes with no edges — they're orphaned and clutter the canvas.
  // Only filter when there are edges; a single-node trace has none and should
  // still render.
  if (edges.length > 0) {
    const connected = new Set<string>()
    for (const e of edges) {
      connected.add(e.source)
      connected.add(e.target)
    }
    for (let i = order.length - 1; i >= 0; i--) {
      if (!connected.has(order[i])) {
        buckets.delete(order[i])
        order.splice(i, 1)
      }
    }
    orderIndex.clear()
    order.forEach((id, i) => orderIndex.set(id, i))
  }

  const nodes: TraceFlowNode[] = order.map((flowId) => {
    const b = buckets.get(flowId)!
    const view = b.view ?? describeNode(b.first)
    // START NODE buckets carry pre-aggregated stats (every LLM call's IO
    // concatenated, total tokens summed) so the tooltip shows the trace's
    // overall summary instead of just the wrapper span's own IO.
    const isStart = b.startStats !== undefined
    const reqParts: string[] = []
    const resParts: string[] = []
    let tokens: TokenUsage | null = null
    if (isStart && b.startStats) {
      if (b.startStats.request !== null) reqParts.push(b.startStats.request)
      if (b.startStats.response !== null) resParts.push(b.startStats.response)
      tokens = b.startStats.tokens
    } else if (b.ioOverride) {
      // Synthetic embedded-tool node: use the correlated tool IO rather than
      // the underlying LLM trace's IO (which extractTooltipIO would return).
      if (b.ioOverride.request !== null) reqParts.push(b.ioOverride.request)
      if (b.ioOverride.response !== null) resParts.push(b.ioOverride.response)
    } else if (b.view === undefined) {
      // Append every iteration's IO so loops surface each call instead of
      // hiding all but the latest behind the merged box. Synthetic nodes
      // (e.g. MCP servers) suppress this since their iterations all wrap the
      // same underlying LLM trace and would just duplicate that trace's IO.
      const multi = b.iterations.length > 1
      b.iterations.forEach((it, iIdx) => {
        const io = extractTooltipIO(it.trace.event)
        const tag = multi ? `#${iIdx + 1}\n` : ""
        if (io.request !== null) reqParts.push(`${tag}${io.request}`)
        if (io.response !== null) resParts.push(`${tag}${io.response}`)
      })
    }
    const request = reqParts.length > 0 ? reqParts.join("\n\n") : null
    const response = resParts.length > 0 ? resParts.join("\n\n") : null
    const label = isStart ? "START NODE" : view.label
    const isMergedNode = b.cacheEntries !== undefined || b.rerankerEntries !== undefined
    // Synthetic tool nodes select the tool (overlay detail); all others select
    // their underlying trace. Tool selection is highlighted by key match.
    const ts = b.toolSelect
    const selected = ts
      ? toolSel?.selectedToolKey != null && toolSel.selectedToolKey === ts.key
      : selectedNodeId !== null && b.traceIds.has(selectedNodeId)
    const onSelect =
      ts && toolSel
        ? () => toolSel.onSelectTool(ts.parentTrace, ts.name, ts.input, ts.output, ts.server)
        : () => onSelectTrace(b.latest.trace)
    return {
      id: flowId,
      type: "trace",
      position: { x: 0, y: 0 },
      width: FLOW_NODE_WIDTH,
      height: b.nodeHeight ?? FLOW_NODE_HEIGHT,
      data: {
        label,
        sublabel: view.sublabel,
        icon: view.icon,
        failed: b.failed,
        running: b.running && !b.failed,
        count: b.count,
        selected,
        request,
        response,
        tokens,
        suppressTooltip: isMergedNode,
        onSelect,
        cacheEntries: b.cacheEntries,
        rerankerEntries: b.rerankerEntries,
        nodeHeight: b.nodeHeight,
      },
    }
  })
  return { nodes, edges }
}
