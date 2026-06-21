import type { ReactNode } from "react"
import {
  EyeIcon,
  ShieldIcon,
  ZapIcon,
  TestTube01Icon,
  AiContentGenerator01Icon,
  Notification01Icon,
} from "@hugeicons/core-free-icons"
import {
  TracesMockup,
  SecurityMockup,
  OptimizationMockup,
  EvalMockup,
  PromptsMockup,
  AlertsMockup,
} from "@/pages/Home/components/DashboardMockups"

export type PillarSlug =
  | "observability"
  | "security"
  | "optimization"
  | "evaluation"
  | "prompts"
  | "alerts"

export interface Capability {
  kicker: string
  title: string
  body: string
}

export interface Pillar {
  slug: PillarSlug
  route: string
  /** Short name used in the nav and cross-links. */
  name: string
  /** One-line summary used in cross-link cards. */
  summary: string
  icon: unknown
  /** Eyebrow label above the hero headline. */
  eyebrow: string
  /** Plan availability, shown as a quiet mono pill. */
  plan: string
  /** Hero headline, with the one cobalt-emphasised span baked in. */
  headline: ReactNode
  /** Hero sub-paragraph. Kept under 20 words. */
  lede: string
  Mockup: () => ReactNode
  /** Matching docs page. */
  docHref: string
  capabilities: Capability[]
  mechanism: {
    heading: string
    points: string[]
    file: string
    code: string
    signature: string
  }
}

const cobalt = "text-[#1860D3] dark:text-[#6FA8FF]"

export const PILLAR_ORDER: PillarSlug[] = [
  "observability",
  "security",
  "optimization",
  "evaluation",
  "prompts",
  "alerts",
]

export const PILLARS: Record<PillarSlug, Pillar> = {
  observability: {
    slug: "observability",
    route: "/observability",
    name: "Observability",
    summary: "Trace every call, cost, and latency.",
    icon: EyeIcon,
    eyebrow: "Observability",
    plan: "Free and up",
    headline: (
      <>
        Full trace visibility across every <span className={cobalt}>LLM call</span>
      </>
    ),
    lede: "Every token, latency, and dollar attributed to the exact agent node that spent it. No code changes.",
    Mockup: TracesMockup,
    docHref: "/documentation/observability",
    capabilities: [
      { kicker: "Attribution", title: "Per-node token and cost", body: "Token counts and USD cost at live provider rates, attributed down to the span that spent them." },
      { kicker: "Latency", title: "p50 / p95 / p99", body: "Latency histograms per agent and per model, so you watch the tail, not just the average." },
      { kicker: "Live", title: "Real-time streaming", body: "Traces land on the dashboard as calls complete. Watch a run unfold instead of refreshing." },
    ],
    mechanism: {
      heading: "One decorator turns any call into a span.",
      points: [
        "Patches OpenAI, Anthropic, Gemini, LangChain, and vector stores automatically",
        "Nested calls build a full span tree with parent and child timing",
        "Cost is computed at live provider rates, per model",
      ],
      file: "app.py",
      signature: 'fluiq.instrument(api_key="fl_...")',
      code: `import fluiq

fluiq.instrument(api_key="fl_...")

@fluiq.trace
def answer(question: str) -> str:
    docs = store.search(question, k=5)
    return llm.invoke(prompt(question, docs))

# Traced with cost, latency, and a full span tree`,
    },
  },

  security: {
    slug: "security",
    route: "/security",
    name: "Security",
    summary: "Block attacks, redact PII and secrets.",
    icon: ShieldIcon,
    eyebrow: "Security",
    plan: "Growth plan and up",
    headline: (
      <>
        <span className={cobalt}>Block attacks</span> before they reach your model
      </>
    ),
    lede: "Pre-call scanning stops jailbreaks and injections. Post-call scanning redacts PII and secrets, and inspects the whole trace tree for agentic threats — RAG poisoning, tool misuse, and multi-agent trust attacks.",
    Mockup: SecurityMockup,
    docHref: "/documentation/security",
    capabilities: [
      { kicker: "Pre-call", title: "Injection and jailbreak blocking", body: "Prompt injection, jailbreaks, and skeleton-key attacks are caught before the model call is made." },
      { kicker: "Redaction", title: "PII and secret stripping", body: "Credit cards, SSNs, emails, IBANs, and high-entropy secrets are redacted from stored traces." },
      { kicker: "Agentic", title: "RAG, tool & multi-agent defense", body: "Detects poisoned retrieved docs, sensitive data exfiltrated through tool calls, tools used outside an allowlist, and attacks that cross agent-to-agent boundaries." },
      { kicker: "Resilient", title: "Fails open by design", body: "A scanner error or plan change never blocks traffic. Security degrades to observe, not to an outage." },
    ],
    mechanism: {
      heading: "Guard the prompt, then guard the response — and the whole trace tree.",
      points: [
        "Block mode raises FluiqSecurityError before a high-risk prompt hits the model",
        "Named guardrail policies — block categories, tool allowlist, PII policy — set per call site from the dashboard",
        "The response gate scans model output for PII and secrets",
        "Post-call scanning reads sibling tool outputs, retrieved docs, and the agent DAG to catch indirect injection, RAG poisoning, tool exfiltration, and cross-agent attacks",
      ],
      file: "app.py",
      signature: 'fluiq.secure(mode="block")',
      code: `import fluiq
from fluiq import FluiqSecurityError

fluiq.instrument(api_key="fl_...")
fluiq.secure(mode="block")

try:
    answer(user_input)
except FluiqSecurityError as err:
    return f"Request blocked: {err.reason}"`,
    },
  },

  optimization: {
    slug: "optimization",
    route: "/optimization",
    name: "Optimization",
    summary: "Cache repeated prompts automatically.",
    icon: ZapIcon,
    eyebrow: "Optimization",
    plan: "Team plan and up",
    headline: (
      <>
        Stop paying for duplicate <span className={cobalt}>LLM calls</span>
      </>
    ),
    lede: "Fluiq profiles your real trace history, provisions a cache, and serves repeated prompts automatically.",
    Mockup: OptimizationMockup,
    docHref: "/documentation/optimization",
    capabilities: [
      { kicker: "Server-side", title: "Zero infra to manage", body: "A dedicated cache instance is provisioned for your account. Nothing to deploy or operate." },
      { kicker: "Profiled", title: "Built from real traffic", body: "The cache profile comes from your actual traces, not a generic one-size heuristic." },
      { kicker: "Tunable", title: "TTL and model scope", body: "Set time-to-live and which models are eligible. Observe mode measures savings before you commit." },
    ],
    mechanism: {
      heading: "Measure first. Cache what repeats.",
      points: [
        "Observe mode records would-be hits without intercepting calls",
        "Cache mode serves duplicates from a dedicated instance",
        "Per-model scope and configurable TTL",
      ],
      file: "app.py",
      signature: 'fluiq.optimize(mode="cache")',
      code: `import fluiq

fluiq.instrument(api_key="fl_...")

# "observe" measures savings; "cache" serves duplicates
fluiq.optimize(mode="cache")

# Repeated prompts now resolve from your cache
answer(question)`,
    },
  },

  evaluation: {
    slug: "evaluation",
    route: "/evaluation",
    name: "Evaluation",
    summary: "Score and gate response quality.",
    icon: TestTube01Icon,
    eyebrow: "Evaluation",
    plan: "All plans",
    headline: (
      <>
        Gate responses that fail <span className={cobalt}>quality thresholds</span>
      </>
    ),
    lede: "LLM-as-judge scores every response server-side. Warn to log, or block before bad output reaches users.",
    Mockup: EvalMockup,
    docHref: "/documentation/evaluation",
    capabilities: [
      { kicker: "Metrics", title: "Six judge metrics", body: "Hallucination, faithfulness, relevance, toxicity, coherence, and completeness, scored per response." },
      { kicker: "Thresholds", title: "Per-metric gates", body: "Set a threshold for each metric. Warn mode logs the score; block mode stops the response." },
      { kicker: "Visible", title: "Scored in the dashboard", body: "Every score is stored and shown in the Quality column across your full trace history." },
    ],
    mechanism: {
      heading: "The judge runs server-side, after every call.",
      points: [
        "Warn mode logs scores without changing behavior",
        "Block mode raises FluiqEvalError below threshold",
        "CI gates run the same checks in GitHub Actions",
      ],
      file: "app.py",
      signature: "fluiq.eval(thresholds={...})",
      code: `import fluiq

fluiq.instrument(api_key="fl_...")

fluiq.eval(
    metrics=["hallucination", "relevance", "toxicity"],
    thresholds={"hallucination": 0.8, "relevance": 0.75},
    mode="warn",   # "block" raises FluiqEvalError
)`,
    },
  },

  prompts: {
    slug: "prompts",
    route: "/prompts",
    name: "Prompt Management",
    summary: "Version and deploy prompt templates.",
    icon: AiContentGenerator01Icon,
    eyebrow: "Prompt Management",
    plan: "All plans",
    headline: (
      <>
        Write, version, and <span className={cobalt}>deploy prompts</span> like software
      </>
    ),
    lede: "An IDE-style editor with variable injection, full version history, and per-environment deployment.",
    Mockup: PromptsMockup,
    docHref: "/documentation/prompts",
    capabilities: [
      { kicker: "Templates", title: "{{variable}} injection", body: "Define slots in the editor and fill them at runtime through the SDK." },
      { kicker: "History", title: "Version and restore", body: "Save, browse, and roll back to any past version of a prompt instantly." },
      { kicker: "Deploy", title: "Dev, staging, prod", body: "Promote a prompt per environment and fetch the right snapshot at runtime." },
    ],
    mechanism: {
      heading: "Fetch the deployed prompt at runtime.",
      points: [
        "Edit and version templates in a dedicated editor",
        "Promote per environment without a code change",
        "Compare model outputs side by side on real traces",
      ],
      file: "app.py",
      signature: 'fluiq.fetch_prompt("customer-support", env="production")',
      code: `import fluiq

fluiq.instrument(api_key="fl_...")

p = fluiq.fetch_prompt("customer-support", env="production")
message = p.render(name="Ada", topic="billing")

# p.template, p.model, and p.version are all available`,
    },
  },

  alerts: {
    slug: "alerts",
    route: "/alerts",
    name: "Alerts",
    summary: "Push eval and security events to Slack.",
    icon: Notification01Icon,
    eyebrow: "Alerts",
    plan: "Team plan and up",
    headline: (
      <>
        Get paged the moment <span className={cobalt}>quality or safety</span> slips
      </>
    ),
    lede: "Send eval regressions and security events straight to Slack. Configured in the dashboard — no SDK code or redeploy.",
    Mockup: AlertsMockup,
    docHref: "/documentation/alerts",
    capabilities: [
      { kicker: "Eval", title: "Quality regression alerts", body: "Fire when a watched metric scores below threshold, or when the failure rate over recent evals climbs too high." },
      { kicker: "Security", title: "Attack and leak alerts", body: "Fire on flagged or blocked prompts and responses, filtered by risk level and attack category." },
      { kicker: "Slack", title: "One webhook, no bot", body: "Paste a Slack Incoming Webhook and Fluiq posts server-side. Your URL never reaches the browser." },
      { kicker: "Quiet", title: "Debounced and digestible", body: "Realtime, hourly, or daily digests, with failure-rate alerts debounced so a sustained regression pings you once." },
    ],
    mechanism: {
      heading: "No new scans, no added latency — just delivery.",
      points: [
        "Reads the eval and security results Fluiq already computes for your traces",
        "Eval alerts on score_below and failure_rate_above; security alerts by risk level and category",
        "Configured entirely in Dashboard → Alerts; changes apply within ~60 seconds",
        "Delivery fails open — a webhook outage never interrupts trace processing",
      ],
      file: "dashboard",
      signature: "Dashboard → Alerts",
      code: `# No SDK code required — alerts are configured in the dashboard.
# They fire off the eval and security scans already running:

import fluiq

fluiq.instrument(api_key="fl_...")
fluiq.secure(mode="block")   # security events → Slack
fluiq.eval(thresholds={"faithfulness": 0.8})  # regressions → Slack

# Set the Slack webhook + thresholds in Dashboard → Alerts.`,
    },
  },
}
