import ComparisonPage, { type CompetitorData } from "./ComparisonPage"

export const data: CompetitorData = {
  slug: "langsmith-alternative",
  name: "LangSmith",
  metaTitle: "Fluiq vs LangSmith: An Alternative for Production LLM Apps",
  metaDescription: "Fluiq vs LangSmith: Fluiq adds security scanning, caching, and support for frameworks beyond LangChain. Two lines of Python replace the tracing boilerplate.",
  canonicalPath: "/langsmith-alternative",
  heroHeadline: "The LangSmith Alternative Built Beyond LangChain",
  heroSub: "LangSmith is excellent if your stack is LangChain. Fluiq auto-instruments OpenAI, Anthropic, Gemini, LangGraph, CrewAI, Google ADK, and 7 more, plus adds security scanning and response caching LangSmith doesn't touch.",
  stats: [
    { value: "2 lines", label: "of Python to instrument any LLM app" },
    { value: "13+", label: "framework integrations (not just LangChain)" },
    { value: "0 ms", label: "added latency, SDK only, no proxy" },
  ],
  features: [
    { feature: "2-line auto-instrumentation", fluiq: "yes", competitor: "no", competitorNote: "requires @traceable decorators" },
    { feature: "OpenAI, Anthropic, Gemini support", fluiq: "yes", competitor: "partial", competitorNote: "best with LangChain" },
    { feature: "LangChain & LangGraph tracing", fluiq: "yes", competitor: "yes" },
    { feature: "CrewAI / Google ADK / MCP tracing", fluiq: "yes", competitor: "no" },
    { feature: "Full agent span tree", fluiq: "yes", competitor: "yes" },
    { feature: "Per-node token & USD cost tracking", fluiq: "yes", competitor: "yes" },
    { feature: "Prompt injection & jailbreak blocking", fluiq: "yes", competitor: "no" },
    { feature: "PII detection & redaction", fluiq: "yes", competitor: "no" },
    { feature: "Trace-driven response caching", fluiq: "yes", competitor: "no" },
    { feature: "LLM-as-judge evals", fluiq: "yes", competitor: "yes" },
    { feature: "Agentic evaluation (whole-run: tools, trajectory, coordination)", fluiq: "yes", competitor: "partial", competitorNote: "trajectory evals exist; no layered run judging or judge jury" },
    { feature: "Multi-model judge jury with audit trail", fluiq: "yes", competitor: "no" },
    { feature: "Whole-trajectory dataset capture (tools, MCP, media)", fluiq: "yes", competitor: "partial", competitorNote: "run-linked datasets without full tool/MCP/media capture" },
    { feature: "Run-vs-run regression comparison on datasets", fluiq: "yes", competitor: "yes" },
    { feature: "End-user feedback & team annotations", fluiq: "yes", competitor: "yes" },
    { feature: "Transparent judge prompts (exact prompt & version stamped on every score)", fluiq: "yes", competitor: "no", competitorNote: "evaluator prompts are definable, but scores don't record the rendered prompt" },
    { feature: "CI/CD eval gates", fluiq: "yes", competitor: "yes" },
    { feature: "Prompt management", fluiq: "yes", competitor: "yes" },
    { feature: "Free tier (no credit card)", fluiq: "yes", competitor: "yes" },
  ],
  competitorPros: [
    "Native, battle-tested integration with LangChain and LangGraph, if your entire stack lives there, it's the deepest option.",
    "Mature debugging tools with side-by-side trace comparison and annotation workflows.",
    "Strong evaluation suite including human feedback loops and dataset versioning.",
    "Widely adopted with a large community and extensive documentation.",
  ],
  fluiqAdvantages: [
    "Auto-instruments every major LLM framework, OpenAI, Anthropic, Gemini, LangChain, LangGraph, CrewAI, Google ADK, MCP, and more, not just the LangChain ecosystem.",
    "Two lines to full instrumentation. No @traceable decorators, no manual span management.",
    "Built-in security layer: prompt injection blocking, PII redaction, and jailbreak detection on every call, LangSmith has none of this.",
    "Trace-driven Redis caching reduces repeated LLM calls to milliseconds and cuts API costs.",
    "Every eval score records the exact judge prompt and version that produced it, and each org can edit the judge prompts their evaluations use, so no score is a black box.",
    "Closed eval loop out of the box: grade datasets against expected outputs, diff any two runs to catch regressions, collect end-user feedback with fluiq.feedback(), and gate CI with python -m fluiq.ci.",
    "Single SDK covers observability, security, caching, and evals, not four separate integrations.",
  ],
  migrationBefore: {
    label: "Before, LangSmith",
    code: `from langsmith import traceable
from langsmith.wrappers import wrap_openai
from openai import OpenAI

# Must wrap the client AND decorate every function
client = wrap_openai(OpenAI())

@traceable
def run_pipeline(query: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": query}],
    )
    return response.choices[0].message.content`,
  },
  migrationAfter: {
    label: "After, Fluiq",
    code: `import fluiq
fluiq.instrument(api_key="fl_...")  # that's it

# Use the standard OpenAI client, no wrappers, no decorators
from openai import OpenAI
client = OpenAI()

def run_pipeline(query: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": query}],
    )
    return response.choices[0].message.content`,
  },
  migrationNote: "Remove wrap_openai and @traceable. Fluiq patches the SDK at the import level, your existing code works unchanged.",
  pricing: {
    asOf: "July 2026",
    fluiq: [
      { plan: "Free", price: "$0", note: "Unlimited traces, 100 evals and 1,000 security scans a month. Bring your own provider keys." },
      { plan: "Starter", price: "$29/mo", note: "2,000 evals, 50k security scans, unlimited retention, multi-model judge jury." },
      { plan: "Team", price: "$149/mo", note: "10,000 evals, 500k security scans, response caching, SSO." },
      { plan: "Growth", price: "$499/mo", note: "50,000 evals, 2M security scans, priority support." },
    ],
    competitor: [
      { plan: "Developer", price: "$0", note: "One seat, up to 5,000 base traces a month, then pay-as-you-go." },
      { plan: "Plus", price: "$39/seat/mo", note: "Up to 10,000 base traces a month, then pay-as-you-go." },
      { plan: "Enterprise", price: "Custom", note: "Negotiated volume, self-hosting available." },
    ],
    takeaway:
      "LangSmith charges per seat and per trace, and its evaluators run on an API key you paste in, so judge tokens land on your OpenAI bill separately. Fluiq does not charge per seat or per trace at all: tracing is unlimited on every plan and you pay for evaluation volume, with judge tokens included. A five-person team on LangSmith Plus starts at $195/mo before traces; the equivalent on Fluiq is $149 flat.",
  },
}

export default function LangSmithAlternative() {
  return <ComparisonPage data={data} />
}
