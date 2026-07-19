import ComparisonPage, { type CompetitorData } from "./ComparisonPage"

export const data: CompetitorData = {
  slug: "braintrust-alternative",
  name: "Braintrust",
  metaTitle: "Fluiq vs Braintrust: Observability + Security Alternative",
  metaDescription: "Fluiq vs Braintrust: production LLM tracing, security scanning, and caching alongside evals. Everything Braintrust covers, plus the production ops layer.",
  canonicalPath: "/braintrust-alternative",
  heroHeadline: "The Braintrust Alternative: Evals Plus the Full Ops Stack",
  heroSub: "Braintrust is a strong evaluation platform. Fluiq adds production tracing, security scanning, and response caching alongside evals, all from two lines of Python, with no manual scoring scaffolding.",
  stats: [
    { value: "Inline", label: "evals on every production LLM call" },
    { value: "Auto", label: "tracing, no @traced decorators needed" },
    { value: "Built-in", label: "security on top of evals" },
  ],
  features: [
    { feature: "Production LLM tracing (auto)", fluiq: "yes", competitor: "no", competitorNote: "eval-focused, limited tracing" },
    { feature: "2-line setup, no decorators", fluiq: "yes", competitor: "no", competitorNote: "requires @traced or manual logging" },
    { feature: "13+ framework integrations", fluiq: "yes", competitor: "partial" },
    { feature: "Full agent span trees", fluiq: "yes", competitor: "no" },
    { feature: "Per-node token & cost tracking", fluiq: "yes", competitor: "partial" },
    { feature: "Prompt injection & jailbreak blocking", fluiq: "yes", competitor: "no" },
    { feature: "PII detection & redaction", fluiq: "yes", competitor: "no" },
    { feature: "Trace-driven response caching", fluiq: "yes", competitor: "no" },
    { feature: "LLM-as-judge evals", fluiq: "yes", competitor: "yes" },
    { feature: "Agentic evaluation (whole-run: tools, trajectory, coordination)", fluiq: "yes", competitor: "partial", competitorNote: "agent evals without multi-model jury or DAG-aware layers" },
    { feature: "Multi-model judge jury with audit trail", fluiq: "yes", competitor: "no" },
    { feature: "Whole-trajectory dataset capture (tools, MCP, media)", fluiq: "yes", competitor: "partial", competitorNote: "datasets are IO-centric; no pinned tool/MCP trajectories" },
    { feature: "Eval warn / block modes (inline)", fluiq: "yes", competitor: "no" },
    { feature: "Run-vs-run regression comparison on datasets", fluiq: "yes", competitor: "yes" },
    { feature: "End-user feedback & team annotations", fluiq: "yes", competitor: "yes" },
    { feature: "Transparent judge prompts (exact prompt & version stamped on every score)", fluiq: "yes", competitor: "partial", competitorNote: "code scorers are inspectable; LLM-judge scores don't carry the rendered prompt" },
    { feature: "CI/CD eval gates", fluiq: "yes", competitor: "yes" },
    { feature: "Dataset management", fluiq: "yes", competitor: "yes" },
    { feature: "Prompt management", fluiq: "yes", competitor: "yes" },
  ],
  competitorPros: [
    "Best-in-class evaluation UX, Braintrust's playground and scoring interface are genuinely excellent for prompt iteration.",
    "Strong human-in-the-loop annotation workflows with side-by-side diff views.",
    "Dataset versioning and regression testing suite are mature and well thought-out.",
    "Good CI integration with the ability to gate on eval thresholds.",
  ],
  fluiqAdvantages: [
    "Production-first: Fluiq auto-instruments every LLM call at the SDK level, you get full trace trees, latency histograms, and cost attribution without writing a single logging call.",
    "Inline eval modes: fluiq.eval(mode='warn') flags low-scoring responses on the trace; mode='block' intercepts them before they reach users.",
    "Security included: prompt injection blocking, PII redaction, jailbreak scoring, and secret leak prevention run on every production call, not just in eval scripts.",
    "Response caching: trace-driven Redis caching serves repeated prompts instantly, cutting LLM spend without any code changes.",
    "Transparent judging: every score records the exact judge prompt and version behind it, and each org can edit those prompts — then diff any two dataset runs to see what regressed, and gate CI with python -m fluiq.ci.",
    "Two lines replace an entire boilerplate setup, no manual span context, no custom scorers to wire up.",
  ],
  migrationBefore: {
    label: "Before, Braintrust",
    code: `import braintrust
from braintrust import traced, init_logger

logger = init_logger(project="my-project", api_key="bt_...")

@traced
def run_pipeline(query: str) -> str:
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": query}],
    )
    result = response.choices[0].message.content
    # manual scoring
    logger.log(scores={"quality": score_quality(result)})
    return result`,
  },
  migrationAfter: {
    label: "After, Fluiq",
    code: `import fluiq
fluiq.instrument(api_key="fl_...")
fluiq.eval(mode="warn")   # automatic LLM-as-judge on every call

# @trace for named agent spans (optional)
from fluiq import trace

@trace
def run_pipeline(query: str) -> str:
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": query}],
    )
    return response.choices[0].message.content`,
  },
  migrationNote: "Remove init_logger, @traced, and manual score calls. Fluiq runs LLM-as-judge automatically on every traced response.",
}

export default function BraintrustAlternative() {
  return <ComparisonPage data={data} />
}
