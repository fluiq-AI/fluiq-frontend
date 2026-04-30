import type { FunctionView } from "./types"
import {
  extractErrorView,
  extractFunctionView,
  extractMcpCalls,
  extractMcpServers,
  extractRequestMessages,
  extractSystemInstruction,
  extractThinking,
  extractTokens,
  extractToolLatencies,
  extractTools,
} from "./extractors"
import { isContentEmpty, safeStringify } from "./utils"
import {
  DrawerSection,
  EmptyBlock,
  ErrorSection,
} from "./DrawerPrimitives"
import { SmartContent } from "./SmartContent"

export function TraceUiView({ event }: { event: Record<string, unknown> }) {
  const errorView = extractErrorView(event)
  const functionView = extractFunctionView(event)
  if (functionView) {
    return <FunctionUiView view={functionView} errorView={errorView} />
  }

  const requestMessages = extractRequestMessages(event)
  const responseContent = event["response"]
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
      <DrawerSection title="Request prompt">
        {requestMessages.length === 0 ? (
          <EmptyBlock>No request prompt found.</EmptyBlock>
        ) : (
          <div className="space-y-2">
            {requestMessages.map((m, idx) => (
              <div
                key={idx}
                className="rounded-md border border-border/60 bg-muted/30 p-3"
              >
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {m.role}
                </div>
                <SmartContent value={m.content} latencies={toolLatencies} />
              </div>
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
        {isContentEmpty(responseContent) ? (
          <EmptyBlock>No response.</EmptyBlock>
        ) : (
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <SmartContent value={responseContent} latencies={toolLatencies} />
          </div>
        )}
      </DrawerSection>

      {tools.length > 0 ? (
        <DrawerSection title="Tools available">
          <div className="space-y-2">
            {tools.map((t, idx) => (
              <div
                key={idx}
                className="rounded-md border border-border/60 bg-muted/30 p-3"
              >
                <div className="font-mono text-xs font-medium">{t.name}</div>
                {t.description ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t.description}
                  </div>
                ) : null}
                {t.input_schema !== undefined ? (
                  <pre className="mt-2 overflow-x-auto rounded bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
                    {safeStringify(t.input_schema)}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        </DrawerSection>
      ) : null}

      {mcpServers.length > 0 ? (
        <DrawerSection title="MCP servers">
          <div className="space-y-2">
            {mcpServers.map((s, idx) => (
              <div
                key={idx}
                className="rounded-md border border-border/60 bg-muted/30 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-mono text-xs font-medium">{s.name}</div>
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
                </div>
                {s.url ? (
                  <div className="mt-1 wrap-break-word font-mono text-[11px] text-muted-foreground">
                    {s.url}
                  </div>
                ) : null}
                {s.tools && s.tools.length > 0 ? (
                  <div className="mt-2 space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Tools ({s.tools.length})
                    </div>
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
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
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

function FunctionUiView({
  view,
  errorView,
}: {
  view: FunctionView
  errorView?: { message: string | null; traceback: string | null } | null
}) {
  return (
    <div className="space-y-5">
      {errorView ? (
        <ErrorSection
          message={errorView.message}
          traceback={errorView.traceback}
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
            <div className="whitespace-pre-wrap wrap-break-word font-mono text-xs">
              {view.input}
            </div>
          </div>
        ) : (
          <EmptyBlock>No input.</EmptyBlock>
        )}
      </DrawerSection>

      <DrawerSection title="Output">
        {view.output ? (
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <div className="whitespace-pre-wrap wrap-break-word text-xs">
              {view.output}
            </div>
          </div>
        ) : (
          <EmptyBlock>No output.</EmptyBlock>
        )}
      </DrawerSection>
    </div>
  )
}
