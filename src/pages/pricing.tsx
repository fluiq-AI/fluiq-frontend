import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight02Icon,
  Building01Icon,
  CheckmarkCircle02Icon,
  GiftIcon,
  Github01Icon,
  RocketIcon,
  SparklesIcon,
  ChartLineData01Icon,
  ShieldKeyIcon,
  UserIcon,
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
import { cn } from "@/lib/utils"

const tiers = [
  {
    name: "Free",
    icon: GiftIcon,
    price: "$0",
    cadence: "forever",
    description: "Instrument your first pipeline and ship with confidence.",
    cta: { label: "Start for free", to: "/signup" },
    featured: false,
    note: "5M traces is a lifetime cap — not monthly. Dashboards stay read-only after you hit it.",
    features: [
      "5M traces (lifetime total)",
      "1,000 LLM-as-judge evaluations",
      "1 seat",
      "Tracing, evals & dashboards",
      "GitHub Action for PR eval gates",
      "7-day trace retention",
      "Community support",
    ],
  },
  {
    name: "Starter",
    icon: UserIcon,
    price: "$149",
    cadence: "per workspace / month",
    description: "Unlimited tracing for solo developers and small teams who've outgrown the free tier.",
    cta: { label: "Start 14-day trial", to: "/signup" },
    featured: false,
    features: [
      "Unlimited tracing",
      "3,000 LLM-as-judge evaluations",
      "3 seats",
      "Tracing, evals & dashboards",
      "GitHub Action for PR eval gates",
      "30-day trace retention",
      "Priority email support",
    ],
  },
  {
    name: "Team",
    icon: RocketIcon,
    price: "$499",
    cadence: "per workspace / month",
    description: "See how your pipeline compares to 10,000 similar deployments — and apply the fixes in one click.",
    cta: { label: "Start 14-day trial", to: "/signup" },
    featured: true,
    features: [
      "Unlimited tracing",
      "10,000 LLM-as-judge evaluations",
      "5 seats included ($49 / extra seat)",
      "Cross-pipeline benchmarks",
      "Optimization engine & one-click apply",
      "Anomaly alerts to Slack",
      "90-day trace retention",
      "Priority email support",
    ],
  },
  {
    name: "Growth",
    icon: ChartLineData01Icon,
    price: "$1,499",
    cadence: "per workspace / month",
    description: "Higher eval throughput and longer retention for production-scale RAG and agent fleets.",
    cta: { label: "Start 14-day trial", to: "/signup" },
    featured: false,
    features: [
      "Unlimited tracing",
      "100,000 LLM-as-judge evaluations",
      "15 seats included ($39 / extra seat)",
      "Everything in Team",
      "Custom evaluators & metric pipelines",
      "180-day trace retention",
      "Priority Slack support",
    ],
  },
  {
    name: "Enterprise",
    icon: Building01Icon,
    price: "Custom",
    cadence: "annual contract",
    description: "Compliance, on-prem deployment, and a dedicated success engineer.",
    cta: { label: "Talk to sales", to: "#contact" },
    featured: false,
    features: [
      "Unlimited tracing & evaluations",
      "Unlimited seats & workspaces",
      "SSO / SAML & SCIM",
      "VPC or on-prem deployment",
      "Custom data retention & residency",
      "Audit logs & role-based access",
      "Dedicated Slack channel & SLA",
    ],
  },
]

const faqs = [
  {
    q: "What counts as a trace?",
    a: "One traced span — typically one LLM call, one retriever call, or one decorated function invocation. A single end-to-end agent run usually emits 5–20 traces.",
  },
  {
    q: "What counts as an evaluation?",
    a: "One LLM-as-judge scoring call — e.g. a context-relevance score over a retrieved chunk set, or a hallucination check on an answer. Each retrieval trace runs one evaluation by default; you can disable auto-eval per workspace.",
  },
  {
    q: "What happens after I hit 5M traces on the free tier?",
    a: "Tracing pauses and your dashboards stay accessible read-only. You can upgrade to Starter or Team at any time to resume ingestion — no data is lost. The 5M cap is a lifetime total, not a monthly limit.",
  },
  {
    q: "What is the difference between Starter and Team?",
    a: "Starter is for solo developers and small teams who need unlimited tracing beyond the free cap but don't yet need cross-pipeline benchmarks or the optimization engine. Team unlocks the moat features: peer benchmarking against similar pipelines and one-click optimization recommendations.",
  },
  {
    q: "What happens after I hit my evaluation limit?",
    a: "Auto-evaluation pauses for the rest of the cycle, but tracing keeps running. Existing scores stay queryable in the dashboard. Upgrade tiers (or contact us) to lift the cap.",
  },
  {
    q: "What is fluiq.secure() and how is it priced?",
    a: "fluiq.secure() is an optional add-on that wraps your pipeline with PII detection, prompt injection scanning, and secret leak prevention — all before data reaches Fluiq's ingest. It's available as a $199/month add-on on Team and Growth plans, and is included in Enterprise. Contact us to enable it on your workspace.",
  },
  {
    q: "Do you support self-hosting?",
    a: "VPC and on-prem deployments are part of the Enterprise tier. The SDK is open source and can ship traces to your own backend if you prefer.",
  },
  {
    q: "Can I switch frameworks later?",
    a: "Yes. Fluiq instruments at the function-call level, so the same SDK works across LangChain, LangGraph, LlamaIndex, CrewAI, raw OpenAI / Anthropic / Gemini SDKs, and custom pipelines.",
  },
]


function Pricing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Fluiq" className="size-7" />
            <span className="font-heading text-lg font-semibold tracking-tight">Fluiq</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link to="/" className="hover:text-foreground">Platform</Link>
            <Link to="/pricing" className="text-foreground">Pricing</Link>
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

      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <Badge variant="outline" className="mb-6 gap-1.5 px-3 py-1">
            <HugeiconsIcon icon={SparklesIcon} />
            Simple, usage-based pricing
          </Badge>
          <h1 className="font-heading mx-auto max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Free to start. Scales when your pipelines do.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Tracing, evals, and dashboards are free up to 5M traces and 1,000 evaluations. Lift the cap on Starter; unlock cross-pipeline benchmarks and one-click optimization on Team and above.
          </p>
        </div>
      </section>

      <section className="border-b border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={cn(
                  "relative flex h-full flex-col",
                  tier.featured && "border-foreground shadow-md"
                )}
              >
                {tier.featured && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most popular
                  </Badge>
                )}
                <CardHeader>
                  <div className="mb-3 grid size-10 place-items-center rounded-xl bg-muted text-foreground">
                    <HugeiconsIcon icon={tier.icon} size={20} />
                  </div>
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-heading text-4xl font-semibold tracking-tight">
                      {tier.price}
                    </span>
                    <span className="text-sm text-muted-foreground">{tier.cadence}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <Button
                    className="w-full"
                    variant={tier.featured ? "default" : "outline"}
                    asChild
                  >
                    <Link to={tier.cta.to}>
                      {tier.cta.label}
                      <HugeiconsIcon icon={ArrowRight02Icon} />
                    </Link>
                  </Button>
                  <ul className="space-y-2 text-sm">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <HugeiconsIcon
                          icon={CheckmarkCircle02Icon}
                          size={16}
                          className="mt-0.5 shrink-0 text-foreground/70"
                        />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  {tier.note && (
                    <p className="mt-auto rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                      ⚠ {tier.note}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* fluiq.secure() add-on callout */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <Card className="border-dashed">
            <CardHeader className="flex flex-row items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                <HugeiconsIcon icon={ShieldKeyIcon} size={22} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl">fluiq.secure()</CardTitle>
                  <Badge variant="outline">Add-on · $199 / month</Badge>
                </div>
                <CardDescription className="mt-1.5 text-sm leading-relaxed">
                  A compliance layer for teams handling sensitive data. Wraps your pipeline with PII detection,
                  prompt injection blocking, and secret leak prevention — all before data reaches Fluiq's ingest.
                  Available on Team and Growth. Included in Enterprise.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                {[
                  { label: "PII Detection & Redaction", desc: "Names, emails, SSNs, credit cards — detected and redacted before storage." },
                  { label: "Prompt Injection Blocking", desc: "Catches jailbreak attempts and injection patterns in real time." },
                  { label: "Secret Leak Prevention", desc: "Scans LLM outputs for leaked API keys, tokens, and credentials." },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-muted/40 px-4 py-3">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="mt-1 text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3">
                <Button variant="outline" size="sm" asChild>
                  <Link to="#contact">
                    Contact us to enable
                    <HugeiconsIcon icon={ArrowRight02Icon} />
                  </Link>
                </Button>
                <span className="text-xs text-muted-foreground">Two lines to activate: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">fluiq.secure()</code></span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="font-heading text-center text-3xl font-semibold tracking-tight md:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mt-10 grid gap-4">
            {faqs.map((f) => (
              <Card key={f.q}>
                <CardHeader>
                  <CardTitle className="text-base">{f.q}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{f.a}</CardDescription>
                </CardHeader>
              </Card>
            ))}
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
            <Link to="/" className="hover:text-foreground">Platform</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/documentation" className="hover:text-foreground">Documentation</Link>
            <a href="https://github.com/fluiq-AI/fluiq-sdk" target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Pricing