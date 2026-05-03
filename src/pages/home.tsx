import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  EyeIcon,
  TestTube01Icon,
  RocketIcon,
  ZapIcon,
  ShieldIcon,
  SparklesIcon,
  Github01Icon,
  PythonIcon,
  Database01Icon,
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  ActivityIcon,
  DollarCircleIcon,
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

const pillars = [
  {
    icon: EyeIcon,
    tag: "Observe",
    title: "Cost Intelligence",
    description:
      "Real-time token spend per agent node, latency percentiles, and anomaly alerts the moment cost or p99 spikes.",
    points: [
      "Per-node token attribution",
      "p50 / p95 / p99 latency tracking",
      "Slack alerts on cost & latency anomalies",
    ],
  },
  {
    icon: TestTube01Icon,
    tag: "Test",
    title: "Regression Testing",
    description:
      "Hallucination, faithfulness, and relevancy evals that gate every PR. Production failures auto-become permanent regression tests.",
    points: [
      "GitHub Action gates merges on eval thresholds",
      "Auto-generated tests from production traces",
      "Side-by-side GPT-4o / Claude / Gemini runs",
    ],
  },
  {
    icon: RocketIcon,
    tag: "Optimize",
    title: "Performance Recommendations",
    description:
      "Semantic caching, smart model routing, and embedding deduplication recommendations \u2014 applied with one click and a rollback button.",
    points: [
      "Semantic cache impact estimates",
      "Auto-route simple queries to cheaper models",
      "Embedding deduplication across the pipeline",
    ],
  },
]

const frameworks = [
  "LangChain",
  "LangGraph",
  "LlamaIndex",
  "CrewAI",
  "OpenAI SDK",
  "Anthropic SDK",
  "Gemini SDK",
  "Custom Pipelines",
]

const benchmarks = [
  {
    icon: ActivityIcon,
    metric: "Cache hit rate",
    body: "Your cache hit rate is 0.31. The top 25% of similar pipelines achieve 0.71. Here is what they changed.",
  },
  {
    icon: ZapIcon,
    metric: "p99 latency",
    body: "Your p99 latency is 2.4s. The median for your query volume and document size is 680ms.",
  },
  {
    icon: ShieldIcon,
    metric: "Hallucination rate",
    body: "Hallucination rate increased 2.1% after Thursday's deploy. Correlated with your chunking parameter change.",
  },
]


function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Fluiq" className="size-7" />
            <span className="font-heading text-lg font-semibold tracking-tight">Fluiq</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#pillars" className="hover:text-foreground">Platform</a>
            <a href="#frameworks" className="hover:text-foreground">Frameworks</a>
            <a href="#benchmarks" className="hover:text-foreground">Benchmarks</a>
            {/*<Link to="/pricing" className="hover:text-foreground">Pricing</Link>*/}
            <Link to="/documentation" className="hover:text-foreground">Documentation</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href="https://github.com/fluiq-AI/fluiq-sdk" target="_blank" rel="noreferrer">
                <HugeiconsIcon icon={Github01Icon} />
                GitHub
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">
                Sign up
                <HugeiconsIcon icon={ArrowRight02Icon} />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="flex flex-col items-center text-center">
            <Badge variant="outline" className="mb-6 gap-1.5 px-3 py-1">
              <HugeiconsIcon icon={SparklesIcon} />
              Framework-agnostic AI pipeline intelligence
            </Badge>
            <h1 className="font-heading max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
              Observe, test, and optimize any AI Agent and LLM Pipeline.
            </h1>
            <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
              Fluiq instruments LangChain, LangGraph, LlamaIndex, CrewAI, raw OpenAI, Anthropic &amp; Gemini SDKs, and custom pipelines with two lines of Python. Cost attribution, regression evals, and cross-pipeline benchmarks in one place.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/documentation">
                  Read the docs
                  <HugeiconsIcon icon={ArrowRight02Icon} />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#pillars">Explore the platform</a>
              </Button>
            </div>

            <div className="mt-12 w-full max-w-2xl rounded-2xl border border-border bg-card p-1 text-left shadow-sm">
              <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
                <HugeiconsIcon icon={PythonIcon} size={14} />
                <span>install &amp; instrument</span>
              </div>
              <CodeBlock>{`pip install fluiq

from fluiq import instrument
instrument()`}</CodeBlock>
            </div>
          </div>
        </div>
      </section>

      <section id="pillars" className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <Badge variant="muted" className="mb-3">Three pillars</Badge>
            <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              One platform from prototype to production.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Replace LangSmith, DeepEval, and three dashboards with a single instrumented pipeline that observes cost, gates regressions, and recommends optimizations.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((p) => (
              <Card key={p.title} className="h-full">
                <CardHeader>
                  <div className="mb-4 grid size-10 place-items-center rounded-xl bg-muted text-foreground">
                    <HugeiconsIcon icon={p.icon} size={20} />
                  </div>
                  <Badge variant="muted" className="w-fit">{p.tag}</Badge>
                  <CardTitle className="mt-1 text-xl">{p.title}</CardTitle>
                  <CardDescription>{p.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2">
                        <HugeiconsIcon
                          icon={CheckmarkCircle02Icon}
                          size={16}
                          className="mt-0.5 shrink-0 text-foreground/70"
                        />
                        <span className="text-muted-foreground">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="frameworks" className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <Badge variant="muted" className="mb-3">Framework-agnostic</Badge>
              <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
                Works with the stack you already shipped.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Fluiq instruments at the function-call level, not the framework level. Any Python function that hits an LLM or a vector database becomes a traced span with one decorator.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {frameworks.map((f) => (
                  <Badge key={f} variant="outline" className="px-3 py-1 text-sm">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>

            <Card className="bg-background">
              <CardHeader>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <HugeiconsIcon icon={PythonIcon} size={14} />
                  <span>custom_pipeline.py</span>
                </div>
              </CardHeader>
              <CardContent>
                <CodeBlock>{`from fluiq import trace

@trace
def answer(question: str) -> str:
    docs = retriever.invoke(question)
    return llm.invoke(prompt(question, docs))`}</CodeBlock>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="benchmarks" className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <Badge variant="muted" className="mb-3 gap-1.5">
              <HugeiconsIcon icon={Database01Icon} />
              Cross-pipeline intelligence
            </Badge>
            <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              Benchmarks against pipelines that look like yours.
            </h2>
            <p className="mt-3 text-muted-foreground">
              See how your cache hit rate, p99 latency, and hallucination frequency compare to statistically similar deployments &mdash; by framework, query volume, and document type &mdash; and what the top quartile does differently.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {benchmarks.map((b) => (
              <Card key={b.metric}>
                <CardHeader>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <HugeiconsIcon icon={b.icon} size={16} />
                    <span className="text-xs uppercase tracking-wide">{b.metric}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-foreground">{b.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <div className="mx-auto mb-4 grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <HugeiconsIcon icon={DollarCircleIcon} size={20} />
          </div>
          <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Free up to 5M traces total.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Tracing, evals, and dashboards are free up to 5M traces. Paid tiers unlock cross-pipeline benchmarks, the optimization engine, and team workspaces.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/documentation">
                Install the SDK
                <HugeiconsIcon icon={ArrowRight02Icon} />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="https://github.com/fluiq-AI/fluiq-sdk" target="_blank" rel="noreferrer">
                <HugeiconsIcon icon={Github01Icon} />
                Star on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Fluiq" className="size-6" />
            <span className="font-heading font-semibold text-foreground">Fluiq</span>
            <span>&middot; Observe, test, optimize, benchmark.</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#pillars" className="hover:text-foreground">Platform</a>
            {/* <Link to="/pricing" className="hover:text-foreground">Pricing</Link> */}
            <Link to="/documentation" className="hover:text-foreground">Documentation</Link>
            <a href="https://github.com/fluiq-AI/fluiq-sdk" target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home

