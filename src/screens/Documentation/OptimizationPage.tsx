"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { MagicWand01Icon, ZapIcon } from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { Code, PageHeading } from "./_docComponents"
import { useDocLang, byLang } from "./LanguageContext"

export default function OptimizationPage() {
  const { lang } = useDocLang()
  const isTs = lang === "typescript"
  return (
    <>
<div className="space-y-4">
      <PageHeading
        icon={MagicWand01Icon}
        title="Optimization"
        description="Call fluiq.optimize() after instrument() to enable trace-driven Redis caching. Fluiq's backend analyses your historical traces, identifies which LLM calls repeat most, and provisions a dedicated Redis instance for your account. On the first call the SDK fetches that profile and begins serving repeated prompts from cache — saving both latency and LLM spend with no extra code."
      />

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <p className="font-semibold text-amber-700 dark:text-amber-400">Team plan and above</p>
        <p className="mt-1 text-muted-foreground">
          <code className="font-mono text-foreground">fluiq.optimize()</code> requires a Team, Growth, or Enterprise plan. Calling it on a Free account logs a warning and skips caching — tracing continues normally, your application is never interrupted.
        </p>
      </div>

      <p className="font-medium">Setup</p>
      <Code>{byLang(
        lang,
        `import fluiq

fluiq.instrument(api_key="fl_...")
fluiq.optimize()

# All LLM calls from this point are transparently intercepted.
# Repeated (model, messages) pairs are served from Redis instantly —
# no LLM API call is made and your spend drops accordingly.`,
        `import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });
fluiq.optimize();

// All LLM calls from this point are transparently intercepted.
// Repeated (model, messages) pairs are served from Redis instantly —
// no LLM API call is made and your spend drops accordingly.`,
      )}</Code>

      <p className="font-medium">How it works</p>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>On the first LLM call after startup the SDK fetches your <strong className="text-foreground">optimization profile</strong> from the Fluiq backend.</li>
        <li>The profile contains which models to cache, the suggested TTL, and the connection URL for your dedicated Redis instance.</li>
        <li>Subsequent calls with an identical <code className="font-mono text-foreground">(model, messages)</code> combination are served from Redis instantly — your LLM provider is never contacted.</li>
        <li>Real responses are cached automatically — there is nothing extra to instrument.</li>
        <li>The dashboard <span className="text-foreground">Optimization</span> tab shows cache hit rate and estimated spend saved alongside your traces.</li>
      </ol>

      <p className="font-medium">Modes</p>
      <div className="grid gap-3 text-sm">
        {[
          {
            name: `"cache"`,
            badge: "default",
            body: "Full Redis caching enabled. Repeated calls matching the backend profile are served from Redis before the LLM API is called. Real responses are stored automatically.",
          },
          {
            name: `"observe"`,
            badge: "optional",
            body: "No interception. The SDK records what would have been a cache hit so you can review potential savings — latency and spend — before opting into full caching.",
          },
        ].map((m) => (
          <div key={m.name} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
            <HugeiconsIcon icon={ZapIcon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
            <div>
              <p className="font-mono text-sm text-foreground">
                {m.name}
                <Badge variant={m.badge === "default" ? "muted" : "outline"} className="ml-2">{m.badge}</Badge>
              </p>
              <p className="mt-1 text-muted-foreground">{m.body}</p>
            </div>
          </div>
        ))}
      </div>
      <Code>{byLang(
        lang,
        `fluiq.optimize(mode="observe")   # review savings first
fluiq.optimize(mode="cache")     # then enable full caching`,
        `fluiq.optimize({ mode: "observe" }); // review savings first
fluiq.optimize({ mode: "cache" });   // then enable full caching`,
      )}</Code>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
        <p className="font-medium">Fail-open by design</p>
        <p className="mt-1 text-muted-foreground">
          If the profile endpoint is unreachable, returns an error, or Redis is unavailable, every LLM call proceeds normally to your provider. The cache layer never blocks your application.
        </p>
      </div>

      <p className="font-medium">MCP tool caching</p>
      <p className="text-sm text-muted-foreground">
        When MCP servers are in use, <code className="font-mono text-foreground">fluiq.optimize()</code> transparently caches two expensive operations on every MCP <code className="font-mono text-foreground">{isTs ? "Client" : "ClientSession"}</code>:
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <code className="font-mono text-foreground">{isTs ? "listTools()" : "list_tools()"}</code> — response cached in Redis keyed by server URL. Automatically invalidated when <code className="font-mono text-foreground">{isTs ? "client.connect()" : "session.initialize()"}</code> is called (server restart).
        </li>
        <li>
          <code className="font-mono text-foreground">{isTs ? "callTool({ name, arguments })" : "call_tool(name, arguments)"}</code> — result cached keyed by <code className="font-mono text-foreground">(server_url, tool_name, sorted_arguments)</code>. Error results are never cached.
        </li>
      </ul>
      <p className="text-sm text-muted-foreground">
        Hit and miss counts appear in the Optimize dashboard under <strong className="text-foreground">mcp_list_tools</strong> and <strong className="text-foreground">mcp_call</strong> in the "By cache type" breakdown.
      </p>
      <Code>{byLang(
        lang,
        `# No extra code required — MCP caching is transparent once optimize() is called.
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async with streamablehttp_client("https://your-mcp-server/mcp") as (r, w, _):
    async with ClientSession(r, w) as session:
        await session.initialize()
        tools = await session.list_tools()   # cached after first call
        result = await session.call_tool("search", {"query": "fluiq"})  # cached`,
        `// No extra code required — MCP caching is transparent once optimize() is called.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(
  new URL("https://your-mcp-server/mcp"),
);
const client = new Client({ name: "my-app", version: "1.0.0" });
await client.connect(transport);
const tools = await client.listTools();              // cached after first call
const result = await client.callTool({               // cached
  name: "search",
  arguments: { query: "fluiq" },
});`,
      )}</Code>

      <p className="font-medium">Provider prompt caching</p>
      <p className="text-sm text-muted-foreground">
        In addition to Fluiq's own Redis layer, <code className="font-mono text-foreground">fluiq.optimize()</code> unlocks each provider's built-in prefix caching and surfaces the saved token counts in every trace.
      </p>

      <div className="space-y-3 text-sm">
        {[
          {
            provider: "Anthropic",
            detail: "cache_control injected automatically",
            body: "Every messages.create() and messages.stream() call receives cache_control: {\"type\": \"ephemeral\"} on the system prompt and last tool definition. Anthropic silently ignores it on blocks below ~1,024 tokens, so injection is always safe. Cached token counts (prompt_cache_read_tokens, prompt_cache_creation_tokens) appear in every trace.",
          },
          {
            provider: "OpenAI",
            detail: "automatic for prompts ≥ 1,024 tokens",
            body: "No configuration required. OpenAI caches eligible prompts automatically. Fluiq captures usage.prompt_tokens_details.cached_tokens from every response as prompt_cached_tokens.",
          },
          {
            provider: "Gemini",
            detail: "explicit CachedContent (user-managed)",
            body: `Create a CachedContent object via the Gemini API and pass it to ${isTs ? "generateContent" : "generate_content"}. Fluiq captures the cached content token count from every response as prompt_cached_tokens.`,
          },
        ].map((p) => (
          <div key={p.provider} className="rounded-xl border border-border/60 bg-muted/30 p-3">
            <p className="font-mono text-sm text-foreground">
              {p.provider}
              <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">{p.detail}</span>
            </p>
            <p className="mt-1 text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        All three providers feed the <strong className="text-foreground">Prompt Caching</strong> card on the Optimize dashboard, which shows total cached tokens read, Anthropic cache-write overhead, and hit rate across instrumented calls.
      </p>
    </div>
    </>
  )
}
