import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiMagicIcon,
  ArrowRight02Icon,
  BookOpen01Icon,
  CheckmarkCircle02Icon,
  Github01Icon,
  PythonIcon,
  RocketIcon,
  SparklesIcon,
  TestTube01Icon,
  ZapIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const sections = [
  { id: "quickstart", title: "Quickstart" },
  { id: "tracing", title: "Custom tracing" },
  { id: "integrations", title: "Auto-instrumentation" },
  { id: "configuration", title: "Configuration" },
  { id: "self-hosting", title: "Self-hosting" },
  { id: "next-steps", title: "Next steps" },
]

const integrations = [
  {
    name: "OpenAI",
    blurb: "Patches chat completions, responses, parse, streaming, embeddings, images, and audio \u2014 sync and async.",
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
    blurb: "Patches google-genai and Vertex AI \u2014 generation, streaming, and count_tokens, sync and async.",
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
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-muted/60 p-4 font-mono text-sm leading-relaxed text-foreground">
      <code>{children}</code>
    </pre>
  )
}

function Documentation() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <HugeiconsIcon icon={AiMagicIcon} size={16} />
            </span>
            <span className="font-heading text-lg font-semibold tracking-tight">Fluiq</span>
            <Badge variant="muted" className="ml-1">Docs</Badge>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link to="/" className="hover:text-foreground">Platform</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/documentation" className="text-foreground">Documentation</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href="https://github.com" target="_blank" rel="noreferrer">
                <HugeiconsIcon icon={Github01Icon} />
                GitHub
              </a>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">
                Get API key
                <HugeiconsIcon icon={ArrowRight02Icon} />
              </Link>
            </Button>
          </div>
        </div>
      </header>

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
              Two lines of Python instrument any AI agent or LLM pipeline. Auto-traced integrations for OpenAI, Anthropic, Gemini, LangChain, and MCP, plus a <code className="font-mono text-foreground">@trace</code> decorator for everything else.
            </p>
          </div>

          <section id="quickstart" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={RocketIcon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Quickstart</h2>
            </div>
            <p className="text-muted-foreground">Install the package, grab an API key, and call <code className="font-mono text-foreground">instrument()</code> once at startup.</p>

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
                    Create a free account and copy your key from the dashboard. <Link to="/signup" className="font-medium text-foreground hover:underline">Sign up &rarr;</Link>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">3</span>
                <div className="grow">
                  <p className="font-medium">Instrument once at startup</p>
                  <Code>{`from fluiq import instrument

instrument(api_key="fl_...")

# Every OpenAI / Anthropic / Gemini / LangChain / MCP
# call from this point on is traced automatically.`}</Code>
                </div>
              </div>
            </div>
          </section>

          <section id="tracing" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={TestTube01Icon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Custom tracing</h2>
            </div>
            <p className="text-muted-foreground">
              Wrap any Python function with <code className="font-mono text-foreground">@trace</code> to record inputs, outputs, latency, and errors. Async functions are detected and awaited automatically. Nested calls preserve parent / child relationships.
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
              Inputs and outputs are serialized with <code className="font-mono text-foreground">str()</code>. Use <code className="font-mono text-foreground">__repr__</code> on your domain objects to control what shows up in the dashboard.
            </p>
          </section>

          <section id="integrations" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={SparklesIcon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Auto-instrumentation</h2>
            </div>
            <p className="text-muted-foreground">
              <code className="font-mono text-foreground">instrument()</code> patches every supported provider it can find on import. If a provider isn't installed, the corresponding patch is skipped silently \u2014 you never need feature flags.
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
          </section>

          <section id="configuration" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={ZapIcon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Configuration</h2>
            </div>
            <p className="text-muted-foreground">
              <code className="font-mono text-foreground">instrument()</code> accepts three parameters. Only <code className="font-mono text-foreground">api_key</code> is required.
            </p>
            <Code>{`def instrument(
    api_key: str,
    version: str = "v1",
    endpoint: str = "https://api.fluiq.dev/api",
) -> None: ...`}</Code>
            <div className="grid gap-3 text-sm">
              {[
                { name: "api_key", required: true, body: "Your workspace API key. Find it in the dashboard under Settings \u2192 API keys." },
                { name: "version", required: false, body: "Trace schema version. Pin this in production so server-side schema bumps are opt-in." },
                { name: "endpoint", required: false, body: "Override the ingest URL. Point this at your VPC deployment for self-hosted setups." },
              ].map((p) => (
                <div key={p.name} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
                  <div>
                    <p className="font-mono text-sm text-foreground">
                      {p.name}
                      {p.required ? (
                        <Badge variant="muted" className="ml-2">required</Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2">optional</Badge>
                      )}
                    </p>
                    <p className="mt-1 text-muted-foreground">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              The SDK reads no environment variables on its own \u2014 wire <code className="font-mono text-foreground">os.getenv("FLUIQ_API_KEY")</code> in if you want one.
            </p>
          </section>

          <section id="self-hosting" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Github01Icon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Self-hosting</h2>
            </div>
            <p className="text-muted-foreground">
              The SDK is open source. Point it at your own ingest service by passing a custom <code className="font-mono text-foreground">endpoint</code>.
            </p>
            <Code>{`from fluiq import instrument

instrument(
    api_key="fl_...",
    endpoint="https://traces.internal.acme.com/api",
)`}</Code>
            <p className="text-sm text-muted-foreground">
              VPC and on-prem deployments of the Fluiq backend are part of the Enterprise tier. <Link to="/pricing" className="font-medium text-foreground hover:underline">See pricing &rarr;</Link>
            </p>
          </section>

          <section id="next-steps" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={RocketIcon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Next steps</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Open the dashboard</CardTitle>
                  <CardDescription>Watch traces stream in, inspect costs by node, and configure Slack alerts.</CardDescription>
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
                  <CardTitle className="text-base">Add the GitHub Action</CardTitle>
                  <CardDescription>Gate every PR on hallucination, faithfulness, and relevancy thresholds.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="https://github.com" target="_blank" rel="noreferrer">
                      <HugeiconsIcon icon={Github01Icon} />
                      View on GitHub
                    </a>
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

