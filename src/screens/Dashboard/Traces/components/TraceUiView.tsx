import type { FunctionView } from "../utils/types"
import {
  extractErrorView,
  extractFunctionView,
  extractMcpCalls,
  extractMcpServers,
  extractRequestMessages,
  extractResponseToolCalls,
  extractSystemInstruction,
  extractThinking,
  extractTokens,
  extractToolLatencies,
  extractTools,
} from "../helpers/extractors"
import type { RequestMessage, ToolLatencyMap } from "../utils/types"
import { getLanggraphNode, isContentEmpty, safeStringify } from "../utils"
import {
  DrawerSection,
  EmptyBlock,
  ErrorSection,
} from "./DrawerPrimitives"
import { JsonBlock, MessageToolCallCard, SmartContent } from "./SmartContent"
// MessageToolCallCard renders both history-turn calls (MessageCard) and the
// current turn's response tool calls (Response section).

export function TraceUiView({ event }: { event: Record<string, unknown> }) {
  const errorView = extractErrorView(event)
  const functionView = extractFunctionView(event)
  const langgraphNode = getLanggraphNode(event)
  if (functionView) {
    return (
      <FunctionUiView
        view={functionView}
        errorView={errorView}
        event={event}
        langgraphNode={langgraphNode}
      />
    )
  }

  const requestMessages = extractRequestMessages(event)
  const responseContent = event["response"]
  const responseToolCalls = extractResponseToolCalls(event)
  const tokens = extractTokens(event)
  const systemInstruction = extractSystemInstruction(event)
  const tools = extractTools(event)
  const toolLatencies = extractToolLatencies(event)
  const thinking = extractThinking(event)
  const mcpServers = extractMcpServers(event)
  const mcpCalls = extractMcpCalls(event)

  return (
    <div className="space-y-5">
      {errorView ? (
        <ErrorSection
          message={errorView.message}
          traceback={errorView.traceback}
        />
      ) : null}
      {langgraphNode ? (
        <LanggraphStateSection
          node={langgraphNode}
          input={event["input"]}
          output={event["output"]}
        />
      ) : null}
      <DrawerSection title="Request prompt">
        {requestMessages.length === 0 ? (
          <EmptyBlock>No request prompt found.</EmptyBlock>
        ) : (
          <div className="space-y-2">
            {requestMessages.map((m, idx) => (
              <MessageCard key={idx} message={m} latencies={toolLatencies} />
            ))}
          </div>
        )}
      </DrawerSection>

      {thinking.length > 0 ? (
        <DrawerSection title="Thinking">
          <div className="space-y-2">
            {thinking.map((t, idx) => (
              <div
                key={idx}
                className="rounded-md border border-border/60 bg-muted/30 p-3"
              >
                <div className="whitespace-pre-wrap wrap-break-word text-xs">
                  {t}
                </div>
              </div>
            ))}
          </div>
        </DrawerSection>
      ) : null}

      <DrawerSection title="Response">
        {isContentEmpty(responseContent) && responseToolCalls.length === 0 ? (
          <EmptyBlock>No response.</EmptyBlock>
        ) : (
          <div className="space-y-2">
            {!isContentEmpty(responseContent) ? (
              <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                <SmartContent value={responseContent} latencies={toolLatencies} />
              </div>
            ) : null}
            {responseToolCalls.map((call, idx) => (
              <MessageToolCallCard key={idx} call={call} latencies={toolLatencies} />
            ))}
          </div>
        )}
      </DrawerSection>

      {tools.length > 0 ? (
        <DrawerSection title={`Tools available (${tools.length})`}>
          {/* Accordion: each tool collapses so a long list of large JSON
              schemas doesn't force-scroll the panel. Name + a description
              preview stay visible; the schema expands on demand. */}
          <div className="space-y-1.5">
            {tools.map((t, idx) => (
              <details
                key={idx}
                className="group rounded-md border border-border/60 bg-muted/30"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 select-none">
                  <span className="text-[10px] text-muted-foreground transition-transform group-open:rotate-90">
                    {"▶"}
                  </span>
                  <span className="font-mono text-xs font-medium">{t.name}</span>
                  {t.description ? (
                    <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground group-open:hidden">
                      {t.description}
                    </span>
                  ) : null}
                </summary>
                <div className="px-3 pb-3">
                  {t.description ? (
                    <div className="mb-2 text-xs text-muted-foreground">
                      {t.description}
                    </div>
                  ) : null}
                  {t.input_schema !== undefined ? (
                    <JsonBlock value={t.input_schema} />
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        </DrawerSection>
      ) : null}

      {mcpServers.length > 0 ? (
        <DrawerSection title={`MCP servers (${mcpServers.length})`}>
          {/* Accordion mirrors "Tools available": the server header (name,
              version, type, tool count) stays visible; url + exposed tools
              expand on demand so a server with many tools stays compact. */}
          <div className="space-y-1.5">
            {mcpServers.map((s, idx) => (
              <details
                key={idx}
                className="group rounded-md border border-border/60 bg-muted/30"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 select-none">
                  <span className="text-[10px] text-muted-foreground transition-transform group-open:rotate-90">
                    {"▶"}
                  </span>
                  <span className="font-mono text-xs font-medium">{s.name}</span>
                  {s.version ? (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      v{s.version}
                    </span>
                  ) : null}
                  {s.type ? (
                    <span className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {s.type}
                    </span>
                  ) : null}
                  {s.tools && s.tools.length > 0 ? (
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {s.tools.length} tool{s.tools.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </summary>
                <div className="px-3 pb-3">
                  {s.url ? (
                    <div className="mb-2 wrap-break-word font-mono text-[11px] text-muted-foreground">
                      {s.url}
                    </div>
                  ) : null}
                  {s.tools && s.tools.length > 0 ? (
                    <div className="space-y-1.5">
                      {s.tools.map((t, tIdx) => (
                        <div
                          key={tIdx}
                          className="rounded-md border border-border/60 bg-background p-2"
                        >
                          <div className="font-mono text-[11px] font-medium">
                            {t.name}
                          </div>
                          {t.description ? (
                            <div className="mt-1 whitespace-pre-wrap wrap-break-word text-[11px] text-muted-foreground">
                              {t.description}
                            </div>
                          ) : null}
                          {t.input_schema !== undefined ? (
                            <div className="mt-1.5">
                              <JsonBlock value={t.input_schema} />
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        </DrawerSection>
      ) : null}

      {mcpCalls.length > 0 ? (
        <DrawerSection title="MCP calls">
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <SmartContent value={mcpCalls} latencies={toolLatencies} />
          </div>
        </DrawerSection>
      ) : null}

      <DrawerSection title="Tokens">
        {tokens ? (
          <div className="grid grid-cols-3 gap-2">
            {(["prompt", "completion", "total"] as const).map((k) => (
              <div
                key={k}
                className="rounded-md border border-border/60 bg-muted/30 px-3 py-2"
              >
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {k}
                </div>
                <div className="mt-0.5 font-mono text-sm">
                  {tokens[k] ?? "\u2014"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyBlock>No token data.</EmptyBlock>
        )}
      </DrawerSection>

      {systemInstruction ? (
        <DrawerSection title="System instruction">
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <div className="whitespace-pre-wrap wrap-break-word text-xs">
              {systemInstruction}
            </div>
          </div>
        </DrawerSection>
      ) : null}
    </div>
  )
}

// A single request-prompt message. Beyond plain content it surfaces the
// provider-native extras that the flat {role, content} model used to drop:
// assistant `reasoning_content`, outgoing `tool_calls`, and the
// name/tool_call_id linkage on tool-result messages. Without these, OpenAI
// tool-calling turns (content === null) rendered as empty boxes.
function MessageCard({
  message,
  latencies,
}: {
  message: RequestMessage
  latencies?: ToolLatencyMap
}) {
  const hasContent = !isContentEmpty(message.content)
  const hasToolCalls = (message.toolCalls?.length ?? 0) > 0
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {message.role}
        </span>
        {message.name ? (
          <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
            {message.name}
          </span>
        ) : null}
        {message.toolCallId ? (
          <span className="font-mono text-[10px] text-muted-foreground">
            {message.toolCallId}
          </span>
        ) : null}
      </div>

      {message.reasoningContent ? (
        <div className="mb-2 rounded border-l-2 border-border/60 bg-background/60 px-2.5 py-1.5">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Reasoning
          </div>
          <div className="whitespace-pre-wrap wrap-break-word text-xs text-muted-foreground">
            {message.reasoningContent}
          </div>
        </div>
      ) : null}

      {hasContent ? (
        <SmartContent value={message.content} latencies={latencies} />
      ) : !message.reasoningContent && !hasToolCalls ? (
        <div className="text-xs text-muted-foreground">(no content)</div>
      ) : null}

      {hasToolCalls ? (
        <div className="mt-2 space-y-2">
          {message.toolCalls!.map((call, idx) => (
            <MessageToolCallCard key={idx} call={call} latencies={latencies} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function FunctionUiView({
  view,
  errorView,
  event,
  langgraphNode,
}: {
  view: FunctionView
  errorView?: { message: string | null; traceback: string | null } | null
  event?: Record<string, unknown>
  langgraphNode?: string | null
}) {
  return (
    <div className="space-y-5">
      {errorView ? (
        <ErrorSection
          message={errorView.message}
          traceback={errorView.traceback}
        />
      ) : null}
      {langgraphNode && event ? (
        <LanggraphStateSection
          node={langgraphNode}
          input={event["input"]}
          output={event["output"]}
        />
      ) : null}
      <DrawerSection title="Function">
        <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 font-mono text-xs">
          {view.name}
        </div>
      </DrawerSection>

      <DrawerSection title="Input">
        {view.input ? (
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <SmartContent value={view.input} />
          </div>
        ) : (
          <EmptyBlock>No input.</EmptyBlock>
        )}
      </DrawerSection>

      <DrawerSection title="Output">
        {view.output ? (
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <SmartContent value={view.output} />
          </div>
        ) : (
          <EmptyBlock>No output.</EmptyBlock>
        )}
      </DrawerSection>
    </div>
  )
}

// LangGraph chain/tool/agent traces carry their pregel state on `input` /
// `output` as dicts (e.g. {topic, outline, draft, summary}). The default
// extractors don't surface dict-shaped IO, so render each top-level key in
// its own labeled block when a `langgraph_node` tag is present.
function LanggraphStateSection({
  node,
  input,
  output,
}: {
  node: string
  input: unknown
  output: unknown
}) {
  const hasInput = !isContentEmpty(input)
  const hasOutput = !isContentEmpty(output)
  if (!hasInput && !hasOutput) return null
  return (
    <DrawerSection title={`State \u00b7 ${node}`}>
      <div className="space-y-3">
        {hasInput ? (
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Input
            </div>
            <StateValue value={input} />
          </div>
        ) : null}
        {hasOutput ? (
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Output
            </div>
            <StateValue value={output} />
          </div>
        ) : null}
      </div>
    </DrawerSection>
  )
}

function StateValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return null
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return (
      <div className="rounded-md border border-border/60 bg-muted/30 p-3">
        <div className="whitespace-pre-wrap wrap-break-word text-xs">
          {String(value)}
        </div>
      </div>
    )
  }
  if (Array.isArray(value)) {
    return (
      <pre className="overflow-x-auto rounded-md border border-border/60 bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
        {safeStringify(value)}
      </pre>
    )
  }
  const rec = value as Record<string, unknown>
  const keys = Object.keys(rec)
  if (keys.length === 0) return <EmptyBlock>(empty)</EmptyBlock>
  return (
    <div className="space-y-2">
      {keys.map((k) => (
        <div
          key={k}
          className="rounded-md border border-border/60 bg-muted/30 p-3"
        >
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {k}
          </div>
          <StateFieldValue value={rec[k]} />
        </div>
      ))}
    </div>
  )
}

function StateFieldValue({ value }: { value: unknown }) {
  if (typeof value === "string") {
    return (
      <div className="whitespace-pre-wrap wrap-break-word text-xs">
        {value}
      </div>
    )
  }
  if (value === null || value === undefined) {
    return <div className="text-xs text-muted-foreground">{"\u2014"}</div>
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return <div className="font-mono text-xs">{String(value)}</div>
  }
  return (
    <pre className="overflow-x-auto rounded bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
      {safeStringify(value)}
    </pre>
  )
}
