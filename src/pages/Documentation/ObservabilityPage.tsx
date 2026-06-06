import { Helmet } from "react-helmet-async"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ChartLineData01Icon,
  DollarCircleIcon,
  PythonIcon,
  SparklesIcon,
  TestTube01Icon,
  WorkflowSquare01Icon,
} from "@hugeicons/core-free-icons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Code, PageHeading } from "./_docComponents"

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
    model="claude-sonnet-4-6",
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

export default function ObservabilityPage() {
  return (
    <>
      <Helmet>
        <title>Observability — Fluiq Docs</title>
        <meta name="description" content="Trace every LLM call with per-node token attribution, USD cost tracking, and p50/p95/p99 latency histograms. Real-time streaming to your Fluiq dashboard." />
        <link rel="canonical" href="https://getfluiq.com/documentation/observability" />
        <meta property="og:url" content="https://getfluiq.com/documentation/observability" />
        <meta property="og:title" content="Observability — Fluiq Docs" />
        <meta property="og:description" content="Trace every LLM call with per-node token attribution, USD cost tracking, and p50/p95/p99 latency histograms. Real-time streaming to your Fluiq dashboard." />
      </Helmet>
    <div className="space-y-4">
      <PageHeading
        icon={ChartLineData01Icon}
        title="Observability"
        description="Fluiq captures every LLM call, tool invocation, and retrieval step automatically — including model, messages, response, latency, token usage, and cost. Use the @trace decorator to group any Python function into the same trace tree."
      />

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
    </div>
    </>
  )
}
