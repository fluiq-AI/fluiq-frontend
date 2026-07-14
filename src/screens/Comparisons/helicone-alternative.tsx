import ComparisonPage, { type CompetitorData } from "./ComparisonPage"

export const data: CompetitorData = {
  slug: "helicone-alternative",
  name: "Helicone",
  metaTitle: "Fluiq vs Helicone — Alternative With No Proxy Overhead",
  metaDescription: "Fluiq vs Helicone: SDK-based with zero proxy latency, 13+ frameworks beyond OpenAI, plus security scanning and LLM-as-judge evals Helicone doesn't offer.",
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
    { feature: "Trace-driven response caching", fluiq: "yes", competitor: "partial", competitorNote: "cache proxy, no trace-driven profiling" },
    { feature: "LLM-as-judge evals", fluiq: "yes", competitor: "no" },
    { feature: "Agentic evaluation (whole-run: tools, trajectory, coordination)", fluiq: "yes", competitor: "no" },
    { feature: "Multi-model judge jury with audit trail", fluiq: "yes", competitor: "no" },
    { feature: "Whole-trajectory dataset capture (tools, MCP, media)", fluiq: "yes", competitor: "partial", competitorNote: "request datasets for fine-tuning export" },
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
    "Trace-driven caching learns from your actual traffic patterns, not a generic proxy cache.",
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
}

export default function HeliconeAlternative() {
  return <ComparisonPage data={data} />
}
