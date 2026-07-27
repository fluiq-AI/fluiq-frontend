import type { ReactNode } from "react"
import {
  EyeIcon,
  ShieldIcon,
  ZapIcon,
  TestTube01Icon,
  AiContentGenerator01Icon,
  Notification01Icon,
  Database01Icon,
} from "@hugeicons/core-free-icons"
import {
  TracesMockup,
  SecurityMockup,
  OptimizationMockup,
  EvalMockup,
  PromptsMockup,
  AlertsMockup,
  DatasetsMockup,
} from "@/pages/Home/components/DashboardMockups"

export type PillarSlug =
  | "observability"
  | "security"
  | "optimization"
  | "evaluation"
  | "datasets"
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
  "datasets",
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
    plan: "Free · unlimited on every plan",
    headline: (
      <>
        Full trace visibility across every <span className={cobalt}>LLM call</span>
      </>
    ),
    lede: "Every token, latency, and dollar attributed to the exact agent node that spent it. Unlimited traces on every plan; retention is the only paid axis.",
    Mockup: TracesMockup,
    docHref: "/documentation/observability",
    capabilities: [
      { kicker: "Attribution", title: "Per-node token and cost", body: "Token counts and USD cost at live provider rates, attributed down to the span that spent them." },
      { kicker: "Latency", title: "p50 / p95 / p99", body: "Latency histograms per agent and per model, so you watch the tail, not just the average." },
      { kicker: "Multi-agent", title: "Real DAGs, not flat lists", body: "Fan-outs, joins, and loop-backs across LangGraph, CrewAI, and Google ADK render as the graph your agents actually executed." },
      { kicker: "Live", title: "Real-time streaming", body: "Traces land on the dashboard as calls complete. Watch a run unfold instead of refreshing." },
      { kicker: "Migration", title: "Bring your history with you", body: "Import existing traces from LangSmith, Langfuse, Phoenix, or Braintrust, so switching does not mean starting from an empty dashboard." },
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
    plan: "All plans · 1,000 scans free",
    headline: (
      <>
        <span className={cobalt}>Block attacks</span> before they reach your model
      </>
    ),
    lede: "Pre-call scanning stops jailbreaks and injections. Post-call scanning redacts PII and secrets, and inspects the whole trace tree for agentic threats: RAG poisoning, tool misuse, and multi-agent trust attacks.",
    Mockup: SecurityMockup,
    docHref: "/documentation/security",
    capabilities: [
      { kicker: "Pre-call", title: "Injection and jailbreak blocking", body: "Prompt injection, jailbreaks, and skeleton-key attacks are caught before the model call is made." },
      { kicker: "Redaction", title: "PII and secret stripping", body: "Credit cards, SSNs, emails, IBANs, and high-entropy secrets are redacted from stored traces." },
      { kicker: "Agentic", title: "RAG, tool & multi-agent defense", body: "Detects poisoned retrieved docs, sensitive data exfiltrated through tool calls, tools used outside an allowlist, and attacks that cross agent-to-agent boundaries." },
      { kicker: "Multimodal", title: "Images scanned too", body: "Media attached to a call is scanned alongside the text, so an attack hidden in an image is not a blind spot." },
      { kicker: "Tunable", title: "Your own guardrail policies", body: "Set your own categories and risk thresholds per organisation instead of accepting the defaults." },
      { kicker: "Resilient", title: "Fails open by design", body: "A scanner error or plan change never blocks traffic. Security degrades to observe, not to an outage." },
    ],
    mechanism: {
      heading: "Guard the prompt, the response, and the whole trace tree.",
      points: [
        "Block mode raises FluiqSecurityError before a high-risk prompt hits the model",
        "Named guardrail policies (block categories, tool allowlist, PII policy) set per call site from the dashboard",
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
      { kicker: "Insights", title: "See the saving before you cache", body: "Repeated prompts are ranked by what caching them would save, alongside your top-spending models, slowest calls, and where errors cluster." },
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
    summary: "Score responses and whole agent runs.",
    icon: TestTube01Icon,
    eyebrow: "Evaluation",
    plan: "All plans",
    headline: (
      <>
        Gate responses that fail <span className={cobalt}>quality thresholds</span>
      </>
    ),
    lede: "LLM-as-judge scores every response server-side. Agentic evaluation judges whole runs: tool choice, trajectory, and multi-agent coordination.",
    Mockup: EvalMockup,
    docHref: "/documentation/evaluation",
    capabilities: [
      { kicker: "Metrics", title: "Six judge metrics", body: "Hallucination, faithfulness, relevance, toxicity, coherence, and completeness, scored per response." },
      { kicker: "Thresholds", title: "Per-metric gates", body: "Set a threshold for each metric. Warn mode logs the score; block mode stops the response." },
      { kicker: "Agentic", title: "Whole-run evaluation", body: "Layered judging of a full agent run: deterministic checks, tool-selection quality, trajectory against the goal, and multi-agent coordination across fan-outs and joins." },
      { kicker: "Jury", title: "Multi-model judge panel", body: "Borderline verdicts convene a jury of different judge models and aggregate their votes, with every member's score and reasoning kept for audit." },
      { kicker: "Your call", title: "Pick the judge, or the whole jury", body: "Choose which model scores a run, and which models sit on the panel, per evaluation or per dataset batch." },
      { kicker: "Your keys", title: "Bring your own provider key", body: "Save an OpenAI, Anthropic, or Google key and judge tokens bill to your account at the rate you already negotiated." },
      { kicker: "Auditable", title: "Every score shows its prompt", body: "Each result carries the exact judge prompt and version that produced it, so a shifting metric is traceable to a prompt change." },
    ],
    mechanism: {
      heading: "The judge runs server-side. Opt in with one call.",
      points: [
        "instrument() only traces; scoring starts when you call fluiq.eval()",
        "Warn mode logs scores; block mode raises FluiqEvalError below threshold",
        "Run Agentic Eval on any root trace to judge the whole run: tools, trajectory, coordination",
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

  datasets: {
    slug: "datasets",
    route: "/datasets",
    name: "Datasets",
    summary: "Golden sets that capture whole agent runs.",
    icon: Database01Icon,
    eyebrow: "Datasets",
    plan: "All plans",
    headline: (
      <>
        Regression-test agents on <span className={cobalt}>real trajectories</span>
      </>
    ),
    lede: "Curate golden datasets from production traffic. Each example pins the whole agent run (every step, tool, and MCP call) forever.",
    Mockup: DatasetsMockup,
    docHref: "/documentation/datasets",
    capabilities: [
      { kicker: "Capture", title: "Whole-trajectory examples", body: "Add any run from the trace drawer and Fluiq pins its full trajectory (LLM calls, agent steps, tool and MCP calls, media), independent of trace retention." },
      { kicker: "Sync", title: "Connect Agents", body: "Link a traced agent to a dataset and every run it has ever made is imported and deduplicated, and future runs keep appending automatically." },
      { kicker: "Batch", title: "Agentic eval & security runs", body: "Re-run agentic evaluation or the full security scan over every example and get a scored report: the regression gate for prompt and model changes." },
      { kicker: "Enriched", title: "Live quality signals", body: "Each example carries its run's eval scores, security verdicts, and cost, backfilled automatically as workers finish." },
      { kicker: "Regression", title: "Compare any two runs", body: "Diff one batch run against another to see exactly which examples got worse, which is the point of keeping a golden set." },
    ],
    mechanism: {
      heading: "Pin a run once. Evaluate it forever.",
      points: [
        "Add to Dataset on a root trace snapshots the entire run, media included",
        "Batch runs feed pinned trajectories to the same agentic evaluator used on live traffic",
        "Examples stay evaluable after the source trace ages out of retention",
      ],
      file: "app.py",
      signature: 'POST /datasets/{id}/examples',
      code: `# Link a run to a dataset via the API (or one click in the UI)
requests.post(f"{BASE}/datasets/{ds_id}/examples", headers=H, json={
    "input": "Refund my last order",
    "expected_output": "Opened refund #4821",
    # the whole trajectory is pinned from the run's root trace
    "metadata": {"source_trace_id": "0f9c...e21"},
})`,
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
      { kicker: "Reuse", title: "A prompt can be a judge", body: "Save a prompt as a judge and reference it by slug from fluiq.eval() to score your evaluations with your own criteria." },
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
    plan: "Paid plans",
    headline: (
      <>
        Get paged the moment <span className={cobalt}>quality or safety</span> slips
      </>
    ),
    lede: "Send eval regressions and security events straight to Slack. Configured in the dashboard, with no SDK code or redeploy.",
    Mockup: AlertsMockup,
    docHref: "/documentation/alerts",
    capabilities: [
      { kicker: "Eval", title: "Quality regression alerts", body: "Fire when a watched metric scores below threshold, or when the failure rate over recent evals climbs too high." },
      { kicker: "Security", title: "Attack and leak alerts", body: "Fire on flagged or blocked prompts and responses, filtered by risk level and attack category." },
      { kicker: "Slack", title: "One webhook, no bot", body: "Paste a Slack Incoming Webhook and Fluiq posts server-side. Your URL never reaches the browser." },
      { kicker: "Quiet", title: "Debounced and digestible", body: "Realtime, hourly, or daily digests, with failure-rate alerts debounced so a sustained regression pings you once." },
    ],
    mechanism: {
      heading: "No new scans and no added latency, just delivery.",
      points: [
        "Reads the eval and security results Fluiq already computes for your traces",
        "Eval alerts on score_below and failure_rate_above; security alerts by risk level and category",
        "Configured entirely in Dashboard → Alerts; changes apply within ~60 seconds",
        "Delivery fails open: a webhook outage never interrupts trace processing",
      ],
      file: "dashboard",
      signature: "Dashboard → Alerts",
      code: `# No SDK code required; alerts are configured in the dashboard.
# They fire off the eval and security scans already running:

import fluiq

fluiq.instrument(api_key="fl_...")
fluiq.secure(mode="block")   # security events → Slack
fluiq.eval(thresholds={"faithfulness": 0.8})  # regressions → Slack

# Set the Slack webhook + thresholds in Dashboard → Alerts.`,
    },
  },
}
