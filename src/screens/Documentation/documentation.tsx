import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { SiteNavbar } from "@/components/SiteNavbar"
import {
  ArrowRight02Icon,
  BookOpen01Icon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  DollarCircleIcon,
  MagicWand01Icon,
  PythonIcon,
  RocketIcon,
  SecurityCheckIcon,
  SparklesIcon,
  TestTube01Icon,
  WorkflowSquare01Icon,
  ZapIcon,
  FileScriptIcon ,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CodeBlock } from "@/components/code-block"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const sections = [
  { id: "quickstart",    title: "Quickstart" },
  { id: "observability", title: "Observability" },
  { id: "optimization",  title: "Optimization" },
  { id: "security",      title: "Security" },
  { id: "evaluation",    title: "Evaluation" },
  { id: "prompts",       title: "Prompts" },
  { id: "configuration", title: "Configuration" },
  { id: "next-steps",    title: "Next steps" },
]

const integrations = [
  {
    name: "OpenAI",
    blurb: "Patches chat completions, responses, parse, streaming, embeddings, images, and audio — sync and async.",
    code: `import openai
from fluiq import instrument

instrument(api_key="fl_...")

client = openai.OpenAI()
client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)`,
  },
  {
    name: "Anthropic",
    blurb: "Patches the Messages API and the Beta client, sync and async.",
    code: `import anthropic
from fluiq import instrument

instrument(api_key="fl_...")

client = anthropic.Anthropic()
client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=512,
    messages=[{"role": "user", "content": "Hello"}],
)`,
  },
  {
    name: "Gemini & Vertex AI",
    blurb: "Patches google-genai and Vertex AI — generation, streaming, and count_tokens, sync and async.",
    code: `from google import genai
from fluiq import instrument

instrument(api_key="fl_...")

client = genai.Client()
client.models.generate_content(
    model="gemini-2.5-pro",
    contents="Hello",
)`,
  },
  {
    name: "LangChain",
    blurb: "Patches the LangChain runtime so chains, agents, and retrievers emit traces automatically.",
    code: `from langchain_openai import ChatOpenAI
from fluiq import instrument

instrument(api_key="fl_...")

llm = ChatOpenAI(model="gpt-4o")
llm.invoke("Hello")`,
  },
  {
    name: "MCP",
    blurb: "Wraps MCP client initialize so tool calls flowing through Model Context Protocol servers are traced.",
    code: `from fluiq import instrument

instrument(api_key="fl_...")

# Any MCP client.initialize() call is now traced
# alongside the LLM that invokes the tool.`,
  },
]

function Code({ children }: { children: string }) {
  return <CodeBlock>{children}</CodeBlock>
}

function Documentation() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNavbar variant="docs" badge="Docs" active="developer" />

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <nav className="sticky top-24 flex flex-col gap-1 text-sm">
            <span className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              On this page
            </span>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 max-w-3xl">
          <div className="mb-10">
            <Badge variant="outline" className="mb-4 gap-1.5 px-3 py-1">
              <HugeiconsIcon icon={BookOpen01Icon} />
              SDK reference
            </Badge>
            <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
              Fluiq Python SDK
            </h1>
            <p className="mt-3 text-muted-foreground">
              Two lines of Python instrument any AI agent or LLM pipeline. Auto-traced integrations for OpenAI, Anthropic, Gemini, LangChain, and MCP, plus a <code className="font-mono text-foreground">@trace</code> decorator for everything else. Server-side security scanning, Redis caching, and LLM-as-judge evaluations are one method call each — all on Fluiq infrastructure, nothing to deploy.
            </p>
          </div>

          {/* ── QUICKSTART ─────────────────────────────────────────────────── */}
          <section id="quickstart" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={RocketIcon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Quickstart</h2>
            </div>
            <p className="text-muted-foreground">
              Install the package, grab an API key, and call <code className="font-mono text-foreground">instrument()</code> once at startup. Every supported LLM call from that point is traced automatically.
            </p>

            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">1</span>
                <div className="grow">
                  <p className="font-medium">Install</p>
                  <Code>{`pip install fluiq`}</Code>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">2</span>
                <div className="grow">
                  <p className="font-medium">Get an API key</p>
                  <p className="text-muted-foreground">
                    Create a free account and copy your key from the dashboard.{" "}
                    <Link to="/signup" className="font-medium text-foreground hover:underline">Sign up &rarr;</Link>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">3</span>
                <div className="grow">
                  <p className="font-medium">Instrument once at startup</p>
                  <Code>{`import fluiq

                      fluiq.instrument(api_key="fl_...") # or set FLUIQ_API_KEY to environment

                      # Every OpenAI / Anthropic / Gemini / LangChain / MCP
                      # call from this point on is traced automatically.
                      # Optionally add paid features:
                      fluiq.optimize()   # Redis caching — Team+
                      fluiq.secure()     # Security scanning — Growth+`
                      }
                  </Code>
                </div>
              </div>
            </div>
          </section>

          {/* ── OBSERVABILITY ──────────────────────────────────────────────── */}
          <section id="observability" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={ChartLineData01Icon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Observability</h2>
            </div>
            <p className="text-muted-foreground">
              Fluiq captures every LLM call, tool invocation, and retrieval step automatically — including model, messages, response, latency, token usage, and cost. Use the <code className="font-mono text-foreground">@trace</code> decorator to group any Python function into the same trace tree.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <HugeiconsIcon icon={TestTube01Icon} size={16} />
              <p className="font-medium">@trace decorator</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Wrap any function with <code className="font-mono text-foreground">@trace</code> to record inputs, outputs, latency, and errors. Async functions are detected and awaited automatically. Nested calls preserve parent / child relationships.
            </p>
            <Code>{`from fluiq import instrument, trace

instrument(api_key="fl_...")

@trace
def retrieve(question: str) -> list[str]:
    return vector_store.similarity_search(question, k=4)

@trace
async def answer(question: str) -> str:
    docs = retrieve(question)                 # nested span
    return await llm.ainvoke(prompt(question, docs))`}</Code>
            <p className="text-sm text-muted-foreground">
              Pass <code className="font-mono text-foreground">name=</code> to override the function name used as the agent identity on the dashboard.
            </p>
            <Code>{`@trace(name="research_agent")
def run(question: str) -> str:
    ...`}</Code>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
              <p className="font-medium">Fail-open by design</p>
              <p className="mt-1 text-muted-foreground">
                Every span emission is wrapped in a safety guard so a Fluiq SDK error never crashes your application. Network failures, malformed payloads, missing optional dependencies, and dashboard outages are absorbed silently.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <HugeiconsIcon icon={SparklesIcon} size={16} />
              <p className="font-medium">Auto-instrumentation</p>
            </div>
            <p className="text-sm text-muted-foreground">
              <code className="font-mono text-foreground">instrument()</code> patches every supported provider it can find on import. If a provider isn't installed the patch is skipped silently — you never need feature flags.
            </p>
            <div className="grid gap-4">
              {integrations.map((i) => (
                <Card key={i.name}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={PythonIcon} size={14} />
                      <CardTitle className="text-base">{i.name}</CardTitle>
                    </div>
                    <CardDescription>{i.blurb}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Code>{i.code}</Code>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-4">
              <HugeiconsIcon icon={WorkflowSquare01Icon} size={16} />
              <p className="font-medium">Agents</p>
            </div>
            <p className="text-sm text-muted-foreground">
              An <em>agent</em> in Fluiq is any function or chain you want to monitor as a single unit of work. Wrap your entrypoint with <code className="font-mono text-foreground">@trace</code> so every nested LLM call and tool invocation is grouped under one root — and aggregated as one row on the Agents dashboard.
            </p>
            <Code>{`from fluiq import instrument, trace

instrument(api_key="fl_...")

@trace
def run_research_agent(question: str) -> str:
    plan = planner(question)              # nested @trace
    docs = retrieve(plan)                 # nested @trace
    return synthesize(question, docs)     # nested @trace`}</Code>
            <p className="text-sm text-muted-foreground">
              LangChain and LangGraph agents are traced automatically without a decorator — the integration emits a root span for the runnable and child spans for every internal step.
            </p>

            <div className="flex items-center gap-2 pt-4">
              <HugeiconsIcon icon={DollarCircleIcon} size={16} />
              <p className="font-medium">Cost analytics</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Every traced LLM call is priced server-side using the provider's published rates and rolled up across the full agent run. The{" "}
              <Link to="/dashboard/traces" className="font-medium text-foreground hover:underline">Traces</Link>{" "}
              table shows per-call cost; the{" "}
              <Link to="/dashboard/agents" className="font-medium text-foreground hover:underline">Agents</Link>{" "}
              dashboard groups by agent key and reports total cost, avg cost per run, tokens, and latency. Sort by total cost to find your most expensive agents in production.
            </p>
          </section>

          {/* ── OPTIMIZATION ───────────────────────────────────────────────── */}
          <section id="optimization" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={MagicWand01Icon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Optimization</h2>
            </div>
            <p className="text-muted-foreground">
              Call <code className="font-mono text-foreground">fluiq.optimize()</code> after <code className="font-mono text-foreground">instrument()</code> to enable trace-driven Redis caching. Fluiq's backend analyses your historical traces, identifies which LLM calls repeat most, and provisions a dedicated Redis instance for your account. On the first call the SDK fetches that profile and begins serving repeated prompts from cache — saving both latency and LLM spend with no extra code.
            </p>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
              <p className="font-semibold text-amber-700 dark:text-amber-400">Team plan and above</p>
              <p className="mt-1 text-muted-foreground">
                <code className="font-mono text-foreground">fluiq.optimize()</code> requires a Team, Growth, or Enterprise plan. Calling it on a Free account logs a warning and skips caching — tracing continues normally, your application is never interrupted.
              </p>
            </div>

            <p className="font-medium">Setup</p>
            <Code>{`import fluiq

fluiq.instrument(api_key="fl_...")
fluiq.optimize()

# All LLM calls from this point are transparently intercepted.
# Repeated (model, messages) pairs are served from Redis instantly —
# no LLM API call is made and your spend drops accordingly.`}</Code>

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
            <Code>{`fluiq.optimize(mode="observe")   # review savings first
fluiq.optimize(mode="cache")     # then enable full caching`}</Code>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
              <p className="font-medium">Fail-open by design</p>
              <p className="mt-1 text-muted-foreground">
                If the profile endpoint is unreachable, returns an error, or Redis is unavailable, every LLM call proceeds normally to your provider. The cache layer never blocks your application.
              </p>
            </div>
          </section>

          {/* ── SECURITY ───────────────────────────────────────────────────── */}
          <section id="security" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={SecurityCheckIcon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Security</h2>
            </div>
            <p className="text-muted-foreground">
              Call <code className="font-mono text-foreground">fluiq.secure()</code> after <code className="font-mono text-foreground">instrument()</code> to activate server-side security scanning. Every traced prompt and response is scanned for PII, prompt injection, and leaked secrets on Fluiq infrastructure. High-risk content is automatically redacted before persistence — the raw sensitive text is never written to the database.
            </p>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
              <p className="font-semibold text-amber-700 dark:text-amber-400">Growth plan and above</p>
              <p className="mt-1 text-muted-foreground">
                <code className="font-mono text-foreground">fluiq.secure()</code> requires a Growth or Enterprise plan. Calling it on a Free or Team account logs a warning and skips scanning — tracing continues normally, your application is never interrupted.
              </p>
            </div>

            <p className="font-medium">Setup</p>
            <Code>{`import fluiq

fluiq.instrument(api_key="fl_...")
fluiq.secure()

# All LLM calls are now traced and scanned server-side.
# Use mode="block" to reject malicious prompts before the LLM call:
fluiq.secure(mode="block")`}</Code>
            <p className="text-sm text-muted-foreground">
              No extra packages — scanning runs on Fluiq infrastructure, not in your process. Detection patterns are never shipped in the SDK and are improved continuously without requiring an update.
            </p>

            <p className="font-medium">What's scanned</p>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                <span className="text-foreground">PII scanner</span> — running server-side. Detects credit cards, SSNs, IBAN codes, email addresses, phone numbers, IP addresses, names, and popular API key formats. No client dependencies required.
              </li>
              <li>
                <span className="text-foreground">Prompt-injection scanner</span> — detects known jailbreak and instruction-override phrases. Patterns are maintained server-side and updated without SDK releases.
              </li>
              <li>
                <span className="text-foreground">Secret scanner</span> — matches hardcoded credential patterns for OpenAI, Anthropic, AWS, GitHub, and Stripe keys, and flags high-entropy tokens resembling bearer tokens or passwords.
              </li>
            </ul>

            <p className="font-medium">Modes</p>
            <div className="grid gap-3 text-sm">
              {[
                {
                  name: `"warn"`,
                  badge: "default",
                  body: "Post-call scan only. Security fields are written into the stored trace; HIGH-risk content is redacted before persistence. Your LLM calls are never interrupted.",
                },
                {
                  name: `"block"`,
                  badge: "optional",
                  body: 'Pre-call guard enabled. Every prompt is checked before the LLM API call. If the check returns allow=false, a FluiqSecurityError is raised and the call is never made.',
                },
              ].map((m) => (
                <div key={m.name} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                  <HugeiconsIcon icon={SecurityCheckIcon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
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

            <p className="font-medium">Risk levels</p>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Level</th>
                    <th className="px-4 py-2 font-medium">Score</th>
                    <th className="px-4 py-2 font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm">
                  <tr>
                    <td className="px-4 py-2 font-medium text-emerald-600 dark:text-emerald-400">clean</td>
                    <td className="px-4 py-2 font-mono text-muted-foreground">{`< 0.3`}</td>
                    <td className="px-4 py-2 text-muted-foreground">No significant findings</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-blue-600 dark:text-blue-400">low</td>
                    <td className="px-4 py-2 font-mono text-muted-foreground">0.3 – 0.49</td>
                    <td className="px-4 py-2 text-muted-foreground">Weak signal; review recommended</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-amber-600 dark:text-amber-400">medium</td>
                    <td className="px-4 py-2 font-mono text-muted-foreground">0.5 – 0.89</td>
                    <td className="px-4 py-2 text-muted-foreground">Likely PII, injection attempt, or suspicious string detected</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-destructive">high</td>
                    <td className="px-4 py-2 font-mono text-muted-foreground">{`≥ 0.9`}</td>
                    <td className="px-4 py-2 text-muted-foreground">Sensitive data confirmed; prompt and response are auto-redacted before storage</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="font-medium">Audit Logs</p>
            <p className="text-sm text-muted-foreground">
              Every action taken by a user or API key through Fluiq — SDK configuration calls, key creation, policy changes — is written to an append-only audit log backed by ClickHouse. Each row is signed with HMAC-SHA256 so tampering can be detected downstream.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                <span className="text-foreground">10-year retention</span> — rows are never updated or deleted. Meets requirements under the EU AI Act, China AIGC regulations, and the Colorado AI Act.
              </li>
              <li>
                <span className="text-foreground">Event types logged</span> — <code className="font-mono text-foreground">api_key.created</code>, <code className="font-mono text-foreground">api_key.deleted</code>, <code className="font-mono text-foreground">guardrail.updated</code>, <code className="font-mono text-foreground">eval.configured</code>, <code className="font-mono text-foreground">secure.configured</code>, <code className="font-mono text-foreground">optimize.configured</code>, <code className="font-mono text-foreground">user.invited</code>, <code className="font-mono text-foreground">user.removed</code>, and more.
              </li>
              <li>
                <span className="text-foreground">Dashboard access</span> — browse, filter, and export as CSV at <code className="font-mono text-foreground">/dashboard/audit</code>. The <code className="font-mono text-foreground">row_hash</code> field is shown per event for compliance hand-off.
              </li>
              <li>
                <span className="text-foreground">API access</span> — <code className="font-mono text-foreground">GET /api/v1/audit</code> accepts <code className="font-mono text-foreground">event_type</code>, <code className="font-mono text-foreground">actor</code>, <code className="font-mono text-foreground">limit</code> (max 500), and <code className="font-mono text-foreground">offset</code> query parameters. No SDK change needed — the log is maintained automatically.
              </li>
            </ul>

            <p className="font-medium">Guardrail Policies</p>
            <p className="text-sm text-muted-foreground">
              Fine-tune exactly what <code className="font-mono text-foreground">fluiq.secure()</code> blocks for your organisation without changing SDK code. Policies are stored per-org in Postgres and cached in-process for 60 seconds — configuration changes propagate to all new calls within one minute.
            </p>
            <div className="grid gap-3 text-sm">
              {[
                {
                  name: "Block threshold",
                  body: 'Set to "high" (default) to block only confirmed high-risk requests, or "medium" to also block medium-risk findings. Warn threshold is configured independently — requests above it are flagged in traces even when not blocked.',
                },
                {
                  name: "Block categories",
                  body: "Restrict which attack types trigger a block. When empty (default), any detected category blocks. Configure a subset — e.g. only prompt_injection and jailbreak — to warn on PII or secrets without blocking them.",
                },
                {
                  name: "Custom deny / allow lists",
                  body: "Phrase-level overrides checked before any scanner runs. Prompts matching a deny phrase are always blocked; prompts matching an allow phrase skip all scans and proceed immediately.",
                },
                {
                  name: "Webhook alerts",
                  body: "POST a structured JSON payload to any HTTPS endpoint (Slack, Teams, PagerDuty, or custom) whenever a block or warn event fires. Retried up to 3 times with exponential backoff. Configure alert_on risk levels to tune alert volume.",
                },
              ].map((item) => (
                <div key={item.name} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                  <HugeiconsIcon icon={SecurityCheckIcon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="mt-1 text-muted-foreground">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Configure via the dashboard at <code className="font-mono text-foreground">/dashboard/guardrails</code> or programmatically with <code className="font-mono text-foreground">PUT /api/v1/guardrails</code>.
            </p>
          </section>

          {/* ── EVALUATION ─────────────────────────────────────────────────── */}
          <section id="evaluation" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Evaluation</h2>
            </div>
            <p className="text-muted-foreground">
              Add one line to score every LLM response with Fluiq's server-side judge. Set per-metric thresholds and choose whether failures log a warning or block the call from reaching your application.
            </p>

            <Code>{`import fluiq

fluiq.instrument(api_key="fl_...")
fluiq.eval(
    thresholds={
        "hallucination": 0.8,   # score 0–1; 1 = no hallucination
        "faithfulness":  0.7,   # grounded in provided context
        "relevance":     0.75,  # response addresses the question
        "toxicity":      0.9,   # 1 = completely safe
    },
    mode="warn",                # "warn" | "block"
    judge_model="gpt-4o-mini",  # judge model Fluiq uses server-side
)`}</Code>

            <p className="font-medium">Supported metrics</p>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Metric</th>
                    <th className="px-4 py-2 font-medium">What it measures</th>
                    <th className="px-4 py-2 font-medium">Score 1.0 means</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {[
                    ["hallucination", "Factual claims not supported by the prompt/context", "No hallucination — every claim is grounded"],
                    ["faithfulness", "Whether the response stays within the provided context", "Fully grounded — no outside claims added"],
                    ["relevance", "How directly the response addresses the question", "Completely on-topic and direct"],
                    ["toxicity", "Harmful, offensive, or hateful content in the response", "Completely safe and respectful"],
                    ["coherence", "Logical structure and internal consistency", "Perfectly coherent and well-structured"],
                    ["completeness", "Whether the response fully answers the question", "Comprehensive — no key information omitted"],
                  ].map(([metric, desc, best]) => (
                    <tr key={metric}>
                      <td className="px-4 py-2 font-mono text-foreground">{metric}</td>
                      <td className="px-4 py-2 text-muted-foreground">{desc}</td>
                      <td className="px-4 py-2 text-muted-foreground">{best}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="font-medium">Modes</p>
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
                <div>
                  <p className="font-mono text-sm text-foreground">mode="warn" <span className="font-sans text-muted-foreground font-normal">(default)</span></p>
                  <p className="mt-1 text-muted-foreground">
                    Evaluation runs in a background thread after the LLM responds. Your application receives the response immediately. A Python warning is logged for every metric that falls below its threshold — visible in your logs and in the Fluiq dashboard's Quality column.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
                <div>
                  <p className="font-mono text-sm text-foreground">mode="block"</p>
                  <p className="mt-1 text-muted-foreground">
                    Evaluation runs synchronously before returning the response. If any metric is below its threshold, a <code className="font-mono text-foreground">FluiqEvalError</code> is raised instead — the low-quality response never reaches your application. Use in staging or for safety-critical flows.
                  </p>
                </div>
              </div>
            </div>

            <Code>{`from fluiq.exceptions import FluiqEvalError

try:
    response = client.chat.completions.create(...)
except FluiqEvalError as e:
    print(e.failures)   # {"hallucination": 0.42, "relevance": 0.61}
    print(e.scores)     # all metric scores
    # fallback logic here`}</Code>

            <div className="flex items-center gap-2 pt-4">
              <HugeiconsIcon icon={WorkflowSquare01Icon} size={16} />
              <p className="font-medium">GitHub Actions eval gate</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Gate every PR on quality scores stored during your test suite. The workflow below runs your tests (which generate traces evaluated by Fluiq), waits briefly for async evals to land, then queries the Fluiq API and fails the build if any score is below the threshold.
            </p>
            <Code>{`# .github/workflows/fluiq-eval-gate.yml
name: Fluiq Eval Gate

on:
  pull_request:
    branches: [main]

jobs:
  eval-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: pip install -r requirements.txt fluiq

      - name: Run test suite
        env:
          FLUIQ_API_KEY: \${{ secrets.FLUIQ_API_KEY }}
        run: pytest tests/ -x

      - name: Wait for evaluations
        run: sleep 30

      - name: Check evaluation scores
        env:
          FLUIQ_API_KEY: \${{ secrets.FLUIQ_API_KEY }}
          THRESHOLD: \${{ vars.FLUIQ_EVAL_THRESHOLD || '0.7' }}
        run: |
          python - <<'PYEOF'
          import httpx, os, sys
          api_key   = os.environ["FLUIQ_API_KEY"]
          threshold = float(os.environ.get("THRESHOLD", "0.7"))
          resp = httpx.get(
              "https://api.getfluiq.com/api/v1/optimize/evals",
              headers={"x-api-key": api_key},
              params={"window_minutes": 10, "threshold": threshold},
              timeout=15,
          )
          resp.raise_for_status()
          data = resp.json()
          if data["total"] == 0:
              print("No evaluations found — skipping gate.")
              sys.exit(0)
          avg = data.get("avg_score")
          print(f"Evals: {data['total']} total, {data['passed']} passed, {data['failed']} failed  (avg {f'{avg:.2f}' if avg else 'n/a'})")
          if data["failed"] > 0:
              for e in data["entries"]:
                  if e["score"] is not None and e["score"] < threshold:
                      print(f"  FAIL  {e['metric']}: {e['score']:.2f}  trace={e['trace_id']}")
              sys.exit(1)
          print(f"All scores above threshold ({threshold}).")
          PYEOF`}</Code>

            <p className="font-medium">Quotas</p>
            <p className="text-sm text-muted-foreground">
              Each LLM response evaluation consumes one count from your tier's eval budget. Traces continue to ingest normally once the cap is hit — only the auto-eval is skipped.
            </p>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Tier</th>
                    <th className="px-4 py-2 font-medium">Traces</th>
                    <th className="px-4 py-2 font-medium">Evaluations / month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {[
                    ["Free", "50K / mo", "1,000"],
                    ["Team", "Unlimited", "10,000"],
                    ["Growth", "Unlimited", "100,000"],
                    ["Enterprise", "Unlimited", "Unlimited"],
                  ].map(([tier, traces, evals]) => (
                    <tr key={tier}>
                      <td className="px-4 py-2 font-medium">{tier}</td>
                      <td className="px-4 py-2 text-muted-foreground">{traces}</td>
                      <td className="px-4 py-2 text-muted-foreground">{evals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── PROMPTS ────────────────────────────────────────────────────── */}
          <section id="prompts" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={FileScriptIcon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Prompts</h2>
            </div>
            <p className="text-muted-foreground">
              The Prompts dashboard turns every LLM trace into a managed prompt template. Discover prompts from production traffic, edit them with <code className="font-mono text-foreground">{"{{variable}}"}</code> substitution, run LLM-as-judge evaluations in the playground, then promote them to named environments so your SDK can fetch the right version at runtime — with no redeploy required.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <HugeiconsIcon icon={SparklesIcon} size={16} />
              <p className="font-medium">Dashboard workflow</p>
            </div>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li><span className="text-foreground">Discover</span> — the Prompts page surfaces every LLM call from your traces as a row. Click any row to open it in the evaluation playground alongside its full trace tree.</li>
              <li><span className="text-foreground">Edit</span> — refine the template in the editor. Add <code className="font-mono text-foreground">{"{{variable}}"}</code> placeholders; the UI detects them and renders input fields for test values.</li>
              <li><span className="text-foreground">Evaluate</span> — run LLM-as-judge metrics (hallucination, faithfulness, relevance …) on the template + response pair. Results appear inline as scored cards.</li>
              <li><span className="text-foreground">Save</span> — give the prompt a name and a unique slug. Every subsequent edit creates a version snapshot so you can restore any previous state.</li>
              <li><span className="text-foreground">Promote</span> — deploy to <span className="font-medium text-blue-500">development</span>, <span className="font-medium text-amber-500">staging</span>, and <span className="font-medium text-emerald-500">production</span> independently. Each environment stores a full snapshot of the template at promote time, so rolling back is one click.</li>
            </ol>

            <div className="flex items-center gap-2 pt-2">
              <HugeiconsIcon icon={WorkflowSquare01Icon} size={16} />
              <p className="font-medium">Template variables</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Wrap any dynamic value in double curly braces. Variable names must start with a letter or underscore and contain only alphanumeric characters and underscores.
            </p>
            <Code>{`# Prompt template stored in the dashboard:
You are a helpful assistant for {{company}}.
Answer the following question in {{language}}: {{question}}`}</Code>
            <p className="text-sm text-muted-foreground">
              The playground detects variables automatically and renders a labeled input for each one so you can test substitutions before promoting.
            </p>

            <div className="flex items-center gap-2 pt-4">
              <HugeiconsIcon icon={RocketIcon} size={16} />
              <p className="font-medium">Environment-based deployment</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Each named environment stores an independent snapshot — promoting to <code className="font-mono text-foreground">staging</code> never touches <code className="font-mono text-foreground">production</code>. The typical promotion flow:
            </p>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Environment</th>
                    <th className="px-4 py-2 font-medium">Badge</th>
                    <th className="px-4 py-2 font-medium">Intended use</th>
                    <th className="px-4 py-2 font-medium">SDK call</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="px-4 py-2 font-medium text-blue-600 dark:text-blue-400">development</td>
                    <td className="px-4 py-2"><span className="rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] text-blue-600 dark:text-blue-400">dev</span></td>
                    <td className="px-4 py-2 text-muted-foreground">Local iteration and unit tests</td>
                    <td className="px-4 py-2 font-mono text-muted-foreground text-xs">fetch_prompt(slug, env="development")</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-amber-600 dark:text-amber-400">staging</td>
                    <td className="px-4 py-2"><span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-600 dark:text-amber-400">stg</span></td>
                    <td className="px-4 py-2 text-muted-foreground">Integration and regression testing</td>
                    <td className="px-4 py-2 font-mono text-muted-foreground text-xs">fetch_prompt(slug, env="staging")</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-emerald-600 dark:text-emerald-400">production</td>
                    <td className="px-4 py-2"><span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">prod</span></td>
                    <td className="px-4 py-2 text-muted-foreground">Live traffic — the default</td>
                    <td className="px-4 py-2 font-mono text-muted-foreground text-xs">fetch_prompt(slug)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <HugeiconsIcon icon={PythonIcon} size={16} />
              <p className="font-medium">SDK fetch</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Call <code className="font-mono text-foreground">fluiq.fetch_prompt()</code> anywhere in your application to retrieve the deployed template for an environment. The call is authenticated with your API key and returns the snapshot that was promoted — not the current editor draft.
            </p>
            <Code>{`import fluiq

fluiq.instrument(api_key="fl_...")

# Fetch the production snapshot (default):
prompt = fluiq.fetch_prompt("customer-support-reply")

# Fetch a specific environment:
prompt = fluiq.fetch_prompt("customer-support-reply", env="staging")

# Fill template variables and call your LLM:
filled = prompt.render(
    company="Acme Corp",
    language="French",
    question=user_input,
)
response = client.chat.completions.create(
    model=prompt.model or "gpt-4o",
    messages=[{"role": "user", "content": filled}],
)`}</Code>

            <p className="text-sm text-muted-foreground">
              The returned object exposes:
            </p>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Attribute</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {[
                    ["slug",        "str",      "Unique identifier used to fetch the prompt"],
                    ["name",        "str",      "Human-readable display name"],
                    ["template",    "str",      "Raw template string with {{variable}} placeholders"],
                    ["model",       "str | None", "Suggested model saved with the prompt, if any"],
                    ["variables",   "list[str]", "Detected variable names in the template"],
                    ["version",     "int",      "Version number of this environment's snapshot"],
                    ["environment", "str",      "Environment this snapshot was fetched from"],
                    ["deployed_at", "str",      "ISO timestamp of when this version was promoted"],
                  ].map(([attr, type, desc]) => (
                    <tr key={attr}>
                      <td className="px-4 py-2 font-mono text-foreground">{attr}</td>
                      <td className="px-4 py-2 font-mono text-muted-foreground text-xs">{type}</td>
                      <td className="px-4 py-2 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
              <p className="font-medium">Version history</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Every time you save an edited template, the previous version is automatically snapshotted. Open the <span className="font-medium text-foreground">History</span> panel on any saved prompt to browse past versions — each shows its version number, the template preview, the model, and when it was saved. Click <span className="font-medium text-foreground">Restore</span> to roll back; the current state is snapshotted first so no work is ever lost.
            </p>
            <p className="text-sm text-muted-foreground">
              Environments pin to their snapshot independently — restoring v3 to the head does not change what <code className="font-mono text-foreground">production</code> is serving until you explicitly re-promote.
            </p>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
              <p className="font-medium">Decoupled from your deploy pipeline</p>
              <p className="mt-1 text-muted-foreground">
                Because <code className="font-mono text-foreground">fluiq.fetch_prompt()</code> fetches at runtime, you can update a production prompt — fix a hallucination-prone instruction, add a guardrail, tweak tone — in the dashboard without touching your codebase or triggering a new deployment. The change is live the next time your SDK calls <code className="font-mono text-foreground">fetch_prompt()</code>.
              </p>
            </div>
          </section>

          {/* ── CONFIGURATION ──────────────────────────────────────────────── */}
          <section id="configuration" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={ZapIcon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Configuration</h2>
            </div>
            <p className="text-muted-foreground">
              Four top-level functions configure the SDK. <code className="font-mono text-foreground">instrument()</code> is required; <code className="font-mono text-foreground">optimize()</code>, <code className="font-mono text-foreground">secure()</code>, and <code className="font-mono text-foreground">eval()</code> are optional paid features.
            </p>

            <p className="font-medium">fluiq.instrument()</p>
            <Code>{`fluiq.instrument(
    api_key  = "fl_...",          # required — or set FLUIQ_API_KEY env var
    endpoint = "https://...",     # optional — override for self-hosted
    version  = "v1",              # optional — pin for stable schema
)`}</Code>
            <p className="text-sm text-muted-foreground">
              The SDK reads <code className="font-mono text-foreground">FLUIQ_API_KEY</code> and <code className="font-mono text-foreground">FLUIQ_API_ENDPOINT</code> from the environment automatically, so <code className="font-mono text-foreground">instrument()</code> can be called with no arguments in CI and production environments that set those variables.
            </p>

            <p className="font-medium mt-2">fluiq.optimize()</p>
            <Code>{`fluiq.optimize(
    mode = "cache",    # "cache" (default) | "observe"
)`}</Code>
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
                <div>
                  <p className="font-mono text-sm text-foreground">
                    mode
                    <Badge variant="outline" className="ml-2">Team+ required</Badge>
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <code className="font-mono text-foreground">"cache"</code> — full Redis caching enabled (default).{" "}
                    <code className="font-mono text-foreground">"observe"</code> — records what would be hits without intercepting calls.
                    Must be called after <code className="font-mono text-foreground">instrument()</code>. Fails open — if the backend is unreachable or the plan check fails, all LLM calls proceed normally.
                  </p>
                </div>
              </div>
            </div>

            <p className="font-medium mt-2">fluiq.secure()</p>
            <Code>{`fluiq.secure(
    mode = "warn",     # "warn" (default) | "block"
)`}</Code>
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
                <div>
                  <p className="font-mono text-sm text-foreground">
                    mode
                    <Badge variant="outline" className="ml-2">Growth+ required</Badge>
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <code className="font-mono text-foreground">"warn"</code> — post-call scan only; security metadata enriched on the trace (default).{" "}
                    <code className="font-mono text-foreground">"block"</code> — pre-call guard; raises <code className="font-mono text-foreground">FluiqSecurityError</code> before the LLM call when a HIGH-risk prompt is detected.
                    Must be called after <code className="font-mono text-foreground">instrument()</code>. Fails open — a plan downgrade or endpoint outage never blocks your LLM calls.
                  </p>
                </div>
              </div>
            </div>

            <p className="font-medium mt-2">fluiq.fetch_prompt()</p>
            <Code>{`fluiq.fetch_prompt(
    slug  = "my-prompt",       # required — the unique identifier
    env   = "production",      # optional — "development" | "staging" | "production" (default)
)`}</Code>
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
                <div>
                  <p className="font-mono text-sm text-foreground">slug / env</p>
                  <p className="mt-1 text-muted-foreground">
                    Fetches the environment snapshot promoted via the Prompts dashboard. Requires <code className="font-mono text-foreground">instrument()</code> to have been called first (uses the same API key). Returns a prompt object with <code className="font-mono text-foreground">.template</code>, <code className="font-mono text-foreground">.model</code>, <code className="font-mono text-foreground">.variables</code>, <code className="font-mono text-foreground">.version</code>, and a <code className="font-mono text-foreground">.render(**kwargs)</code> method for variable substitution. Falls back to the legacy <code className="font-mono text-foreground">is_deployed</code> flag for prompts promoted before environment support was added.
                  </p>
                </div>
              </div>
            </div>

            <p className="font-medium mt-2">fluiq.eval()</p>
            <Code>{`fluiq.eval(
    thresholds   = {"hallucination": 0.8, "relevance": 0.7},
    metrics      = ["hallucination", "relevance", "toxicity"],
    mode         = "warn",          # "warn" (default) | "block"
    judge_model  = "gpt-4o-mini",
)`}</Code>
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
                <div>
                  <p className="font-mono text-sm text-foreground">thresholds / metrics / mode / judge_model</p>
                  <p className="mt-1 text-muted-foreground">
                    Runs Fluiq's LLM-as-judge server-side after every LLM call. Supported metrics: <code className="font-mono text-foreground">hallucination</code>, <code className="font-mono text-foreground">faithfulness</code>, <code className="font-mono text-foreground">relevance</code>, <code className="font-mono text-foreground">toxicity</code>, <code className="font-mono text-foreground">coherence</code>, <code className="font-mono text-foreground">completeness</code>.{" "}
                    <code className="font-mono text-foreground">"warn"</code> logs when a score is below threshold (default).{" "}
                    <code className="font-mono text-foreground">"block"</code> raises <code className="font-mono text-foreground">FluiqEvalError</code> before returning the response.
                    Scores are stored in ClickHouse and visible in the dashboard's Quality column across all previous traces.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── NEXT STEPS ─────────────────────────────────────────────────── */}
          <section id="next-steps" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={RocketIcon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Next steps</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Open the dashboard</CardTitle>
                  <CardDescription>Watch traces stream in, inspect costs by node, and review quality scores.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/login">
                      Go to dashboard
                      <HugeiconsIcon icon={ArrowRight02Icon} />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add the eval gate</CardTitle>
                  <CardDescription>Gate every PR on hallucination, faithfulness, and relevancy thresholds.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="#evaluation">
                      See eval gate setup
                      <HugeiconsIcon icon={ArrowRight02Icon} />
                    </a>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Enable optimization</CardTitle>
                  <CardDescription>One method call activates Redis caching driven by your trace history.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/signup">
                      Upgrade to Team
                      <HugeiconsIcon icon={ArrowRight02Icon} />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Manage prompts</CardTitle>
                  <CardDescription>Discover, edit, evaluate, and promote prompt templates to dev, staging, and production.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/dashboard/prompts">
                      Open Prompts
                      <HugeiconsIcon icon={ArrowRight02Icon} />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default Documentation