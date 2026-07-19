"use client"

import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ChartLineData01Icon,
  DollarCircleIcon,
  PythonIcon,
  Typescript01Icon,
  SparklesIcon,
  TestTube01Icon,
  WorkflowSquare01Icon,
} from "@hugeicons/core-free-icons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Code, PageHeading } from "./_docComponents"
import { useDocLang, byLang } from "./LanguageContext"

const pythonIntegrations = [
  {
    name: "OpenAI",
    blurb: "Patches chat completions, responses, parse, streaming, embeddings, images, and audio, sync and async.",
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
    blurb: "Patches google-genai and Vertex AI: generation, streaming, and count_tokens, sync and async.",
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

const tsIntegrations = [
  {
    name: "OpenAI",
    blurb: "Patches chat completions, the responses API, parse, streaming, embeddings, images, and audio.",
    code: `import OpenAI from "openai";
import { instrument } from "@fluiq/sdk";

instrument({ apiKey: "fl_..." });

const client = new OpenAI();
await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello" }],
});`,
  },
  {
    name: "Anthropic",
    blurb: "Patches the Messages API and the Beta client.",
    code: `import Anthropic from "@anthropic-ai/sdk";
import { instrument } from "@fluiq/sdk";

instrument({ apiKey: "fl_..." });

const client = new Anthropic();
await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 512,
  messages: [{ role: "user", content: "Hello" }],
});`,
  },
  {
    name: "Gemini & Vertex AI",
    blurb: "Patches @google/genai and Vertex AI: generation, streaming, and countTokens.",
    code: `import { GoogleGenAI } from "@google/genai";
import { instrument } from "@fluiq/sdk";

instrument({ apiKey: "fl_..." });

const client = new GoogleGenAI({});
await client.models.generateContent({
  model: "gemini-2.5-pro",
  contents: "Hello",
});`,
  },
  {
    name: "LangChain",
    blurb: "Patches the LangChain runtime so chains, agents, and retrievers emit traces automatically.",
    code: `import { ChatOpenAI } from "@langchain/openai";
import { instrument } from "@fluiq/sdk";

instrument({ apiKey: "fl_..." });

const llm = new ChatOpenAI({ model: "gpt-4o" });
await llm.invoke("Hello");`,
  },
  {
    name: "MCP",
    blurb: "Wraps the MCP client so tool calls flowing through Model Context Protocol servers are traced.",
    code: `import { instrument } from "@fluiq/sdk";

instrument({ apiKey: "fl_..." });

// Any MCP client.connect() / callTool() is now traced
// alongside the LLM that invokes the tool.`,
  },
]

export default function ObservabilityPage() {
  const { lang } = useDocLang()
  const isTs = lang === "typescript"
  const integrations = byLang(lang, pythonIntegrations, tsIntegrations)
  return (
    <>
<div className="space-y-4">
      <PageHeading
        icon={ChartLineData01Icon}
        title="Observability"
        description={`Fluiq captures every LLM call, tool invocation, and retrieval step automatically, including model, messages, response, latency, token usage, and cost. Use the ${isTs ? "trace() wrapper" : "@trace decorator"} to group any ${isTs ? "" : "Python "}function into the same trace tree.`}
      />

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
        <p className="font-medium">Observability is free and unlimited on every tier</p>
        <p className="mt-1 text-muted-foreground">
          There is no cap on traces, spans, or agents. Instrument as much as you
          want on the Free plan without ever hitting a wall. The only paid axis is{" "}
          <span className="font-medium text-foreground">retention</span>: Free keeps
          the last <span className="font-medium text-foreground">14 days</span> of
          traces on a rolling window, and paid plans keep them{" "}
          <span className="font-medium text-foreground">forever</span>. Every plan
          also includes a no-card <span className="font-medium text-foreground">5-day trial</span>{" "}
          of a paid tier so you can try unlimited retention before deciding.
        </p>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <HugeiconsIcon icon={TestTube01Icon} size={16} />
        <p className="font-medium">{isTs ? "trace() wrapper" : "@trace decorator"}</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Wrap any function with <code className="font-mono text-foreground">{isTs ? "trace()" : "@trace"}</code> to record inputs, outputs, latency, and errors. {isTs ? "Sync and async functions are both supported" : "Async functions are detected and awaited automatically"}. Nested calls preserve parent / child relationships.
      </p>
      <Code>{byLang(
        lang,
        `from fluiq import instrument, trace

instrument(api_key="fl_...")

@trace
def retrieve(question: str) -> list[str]:
    return vector_store.similarity_search(question, k=4)

@trace
async def answer(question: str) -> str:
    docs = retrieve(question)                 # nested span
    return await llm.ainvoke(prompt(question, docs))`,
        `import { instrument, trace } from "@fluiq/sdk";

instrument({ apiKey: "fl_..." });

const retrieve = trace((question: string): string[] => {
  return vectorStore.similaritySearch(question, 4);
});

const answer = trace(async (question: string): Promise<string> => {
  const docs = retrieve(question);            // nested span
  return llm.invoke(prompt(question, docs));
});`,
      )}</Code>
      <p className="text-sm text-muted-foreground">
        {isTs ? (
          <>Pass <code className="font-mono text-foreground">{`{ name }`}</code> to override the function name used as the agent identity on the dashboard.</>
        ) : (
          <>Pass <code className="font-mono text-foreground">name=</code> to override the function name used as the agent identity on the dashboard.</>
        )}
      </p>
      <Code>{byLang(
        lang,
        `@trace(name="research_agent")
def run(question: str) -> str:
    ...`,
        `const run = trace(
  async (question: string) => { /* ... */ },
  { name: "research_agent" },
);`,
      )}</Code>

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
        <code className="font-mono text-foreground">instrument()</code> patches every supported provider it can find on import. If a provider isn't installed the patch is skipped silently; you never need feature flags.
      </p>
      <div className="grid gap-4">
        {integrations.map((i) => (
          <Card key={i.name}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={isTs ? Typescript01Icon : PythonIcon} size={14} />
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
        An <em>agent</em> in Fluiq is any function or chain you want to monitor as a single unit of work. Wrap your entrypoint with <code className="font-mono text-foreground">{isTs ? "trace()" : "@trace"}</code> so every nested LLM call and tool invocation is grouped under one root, and aggregated as one row on the Agents dashboard.
      </p>
      <Code>{byLang(
        lang,
        `from fluiq import instrument, trace

instrument(api_key="fl_...")

@trace
def run_research_agent(question: str) -> str:
    plan = planner(question)              # nested @trace
    docs = retrieve(plan)                 # nested @trace
    return synthesize(question, docs)     # nested @trace`,
        `import { instrument, trace } from "@fluiq/sdk";

instrument({ apiKey: "fl_..." });

const runResearchAgent = trace((question: string): string => {
  const plan = planner(question);          // nested trace()
  const docs = retrieve(plan);             // nested trace()
  return synthesize(question, docs);       // nested trace()
});`,
      )}</Code>
      <p className="text-sm text-muted-foreground">
        LangChain, LangGraph, CrewAI, and Google ADK agents are traced automatically without a decorator; the integration emits a root span for the run and child spans for every internal step.
      </p>

      <div className="flex items-center gap-2 pt-4">
        <HugeiconsIcon icon={WorkflowSquare01Icon} size={16} />
        <p className="font-medium">Multi-agent DAGs</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Fan-out / fan-in orchestrations are captured as a true graph, not a flat list. When several agents run in parallel and their outputs join into a single downstream step, Fluiq detects the real dependency edges and renders the run as a DAG in the trace drawer, with fan-out, joins, and loop-backs included.
      </p>
      <ul className="ml-4 list-disc space-y-1.5 text-sm text-muted-foreground">
        <li>
          <span className="font-medium text-foreground">LangGraph</span>: join (fan-in) nodes are resolved from the graph's declared edges captured at <code className="font-mono text-foreground">compile()</code>, so multi-parent steps are exact regardless of the trigger encoding. Each run shows in the Agents view as{" "}
          <code className="font-mono text-foreground">LangGraph(node_a, node_b, …)</code>, named after its nodes.
        </li>
        <li>
          <span className="font-medium text-foreground">CrewAI</span>: task dependencies (<code className="font-mono text-foreground">task.context</code>) become graph edges; a crew shows as <code className="font-mono text-foreground">Crew(agent_1, agent_2, …)</code>.
        </li>
        <li>
          <span className="font-medium text-foreground">Google ADK</span>: <code className="font-mono text-foreground">{`{state_key}`}</code> placeholders in an agent's instruction are resolved to the upstream agents that produced them.
        </li>
      </ul>
      <p className="text-sm text-muted-foreground">
        For custom orchestrations, declare joins yourself with{" "}
        <code className="font-mono text-foreground">fluiq.join_parents(...)</code> so a step that consumes multiple upstream results is rendered with all of its parents.
      </p>
      <p className="text-sm text-muted-foreground">
        Multimodal steps are preserved too: image, audio, and file parts are kept as lightweight media references (kind, mime, size, and a content hash) on the trace without bloating storage.
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
