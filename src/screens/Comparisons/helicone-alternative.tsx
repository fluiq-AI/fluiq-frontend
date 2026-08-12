import ComparisonPage, { type CompetitorData } from "./ComparisonPage"

export const data: CompetitorData = {
  slug: "helicone-alternative",
  name: "Helicone",
  metaTitle: "Fluiq vs Helicone: An Alternative With No Proxy Overhead",
  metaDescription: "Fluiq vs Helicone: Fluiq runs as an SDK with no proxy latency, covers 13+ frameworks beyond OpenAI, and adds security scanning and LLM-as-judge evals.",
  canonicalPath: "/helicone-alternative",
  heroHeadline: "The Helicone Alternative: No Proxy, No Latency Tax",
  heroSub: "Helicone routes your traffic through a proxy to log requests. Fluiq instruments the SDK directly, zero latency overhead, full agent trace trees, security scanning, and evals for every framework you use.",
  stats: [
    { value: "0 ms", label: "proxy latency, SDK-based, not a gateway" },
    { value: "13+", label: "frameworks beyond OpenAI" },
    { value: "1 call", label: "to add security on every LLM request" },
  ],
  features: [
    { feature: "SDK-based (no proxy / base_url change)", fluiq: "yes", competitor: "no", competitorNote: "routes via Helicone gateway" },
    { feature: "Zero added latency", fluiq: "yes", competitor: "no", competitorNote: "extra network hop per request" },
    { feature: "OpenAI tracing", fluiq: "yes", competitor: "yes" },
    { feature: "Anthropic, Gemini tracing", fluiq: "yes", competitor: "partial" },
    { feature: "LangChain, CrewAI, LangGraph tracing", fluiq: "yes", competitor: "no" },
    { feature: "Full agent span tree", fluiq: "yes", competitor: "no" },
    { feature: "Prompt injection & jailbreak blocking", fluiq: "yes", competitor: "no" },
    { feature: "PII detection & redaction", fluiq: "yes", competitor: "no" },
    { feature: "LLM-as-judge evals", fluiq: "yes", competitor: "no" },
    { feature: "Agentic evaluation (whole-run: tools, trajectory, coordination)", fluiq: "yes", competitor: "no" },
    { feature: "Multi-model judge jury with audit trail", fluiq: "yes", competitor: "no" },
    { feature: "Whole-trajectory dataset capture (tools, MCP, media)", fluiq: "yes", competitor: "partial", competitorNote: "request datasets for fine-tuning export" },
    { feature: "Run-vs-run regression comparison on datasets", fluiq: "yes", competitor: "no" },
    { feature: "End-user feedback & team annotations", fluiq: "yes", competitor: "partial", competitorNote: "request-level ratings, no team annotation workflow" },
    { feature: "Transparent judge prompts (exact prompt & version stamped on every score)", fluiq: "yes", competitor: "no" },
    { feature: "CI/CD eval gates", fluiq: "yes", competitor: "no" },
    { feature: "Cost tracking per model", fluiq: "yes", competitor: "yes" },
    { feature: "Prompt management", fluiq: "yes", competitor: "yes" },
    { feature: "p50/p95/p99 latency histograms", fluiq: "yes", competitor: "yes" },
  ],
  competitorPros: [
    "Extremely fast setup, change one base_url and you get immediate request logging with no SDK changes.",
    "Works with any HTTP client that targets the OpenAI-compatible API, including non-Python environments.",
    "Clean dashboard with good cost analytics and user session tracking.",
    "Prompt templates and experimentation UI are well-designed for product teams.",
  ],
  fluiqAdvantages: [
    "No proxy, Fluiq patches the SDK at the import level. There's no extra network hop, no TLS termination latency, no single point of failure in your request path.",
    "Full agent trace trees: Fluiq traces multi-step LangGraph, CrewAI, and Google ADK pipelines end-to-end, not just individual OpenAI calls.",
    "Built-in security: prompt injection blocking, PII redaction, jailbreak detection, and secret leak scanning, all server-side, not accessible to attackers via the public SDK.",
    "LLM-as-judge evals run inline on every production call, flagging hallucination and toxicity automatically.",
"Agentic evaluation scores the whole run, tools and trajectory included, not just the request/response pair a proxy can see.",
  ],
  migrationBefore: {
    label: "Before, Helicone (proxy setup)",
    code: `from openai import OpenAI

# Must override base_url and inject auth header
client = OpenAI(
    base_url="https://oai.hconeai.com/v1",
    default_headers={
        "Helicone-Auth": "Bearer hc_...",
    },
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": query}],
)`,
  },
  migrationAfter: {
    label: "After, Fluiq (SDK-based)",
    code: `import fluiq
fluiq.instrument(api_key="fl_...")

# Standard client, no base_url override, no extra headers
from openai import OpenAI
client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": query}],
)`,
  },
  migrationNote: "Remove the base_url override and Helicone-Auth header. Restore the standard OpenAI client and add two Fluiq lines at the top.",
  pricing: {
    asOf: "July 2026",
    fluiq: [
      { plan: "Free", price: "$0", note: "Unlimited traces, 100 evals and 1,000 security scans a month. Bring your own provider keys." },
      { plan: "Starter", price: "$29/mo", note: "2,000 evals, 50k security scans, unlimited retention, multi-model judge jury." },
      { plan: "Team", price: "$149/mo", note: "10,000 evals, 500k security scans, SSO, dataset batch runs." },
      { plan: "Growth", price: "$499/mo", note: "50,000 evals, 2M security scans, priority support." },
    ],
    competitor: [
      { plan: "Hobby", price: "$0", note: "10,000 requests, 1 GB storage, 7-day retention, 10 logs/min." },
      { plan: "Pro", price: "$79/mo", note: "Usage-based above the free allowance, 1-month retention." },
      { plan: "Team", price: "$799/mo", note: "Higher ingestion ceiling, 3-month retention." },
      { plan: "Enterprise", price: "Custom", note: "Retention forever, bulk discounts." },
    ],
    takeaway:
      "Helicone prices by logged request and caps retention hard on the lower tiers, which is the gateway-and-logging shape rather than an evaluation product. Fluiq keeps traces unlimited and retention unlimited from $29, and charges for evaluation instead. If all you need is a proxy with a log view, Helicone is cheaper; if you need to know whether the agent was actually right, that is not what request pricing measures.",
  },
}

export default function HeliconeAlternative() {
  return <ComparisonPage data={data} />
}
