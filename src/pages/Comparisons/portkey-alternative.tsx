import ComparisonPage, { type CompetitorData } from "./ComparisonPage"

const data: CompetitorData = {
  slug: "portkey-alternative",
  name: "Portkey",
  metaTitle: "Fluiq vs Portkey — The Portkey Alternative Without the Gateway Latency",
  metaDescription: "Comparing Fluiq vs Portkey. Fluiq is SDK-based with no gateway overhead, adds full agent trace trees, security scanning, and LLM-as-judge evals that Portkey's gateway model doesn't support.",
  canonicalPath: "/portkey-alternative",
  heroHeadline: "The Portkey Alternative: Deep Traces, No Gateway Tax",
  heroSub: "Portkey is an LLM gateway for routing and fallbacks. Fluiq instruments the SDK directly — giving you full agent trace trees, security scanning, and inline evals with zero proxy latency and no routing configuration.",
  stats: [
    { value: "0 ms", label: "gateway latency — SDK-only instrumentation" },
    { value: "Full", label: "agent span trees across all frameworks" },
    { value: "Server-side", label: "security — not SDK-accessible" },
  ],
  features: [
    { feature: "SDK-based (no gateway / API key swap)", fluiq: "yes", competitor: "no", competitorNote: "requires Portkey client + API key" },
    { feature: "Zero added latency", fluiq: "yes", competitor: "no", competitorNote: "gateway round-trip per request" },
    { feature: "Full agent span trees", fluiq: "yes", competitor: "no", competitorNote: "logs calls, not spans" },
    { feature: "LangChain, CrewAI, Google ADK tracing", fluiq: "yes", competitor: "partial" },
    { feature: "Per-node token & cost breakdown", fluiq: "yes", competitor: "yes" },
    { feature: "Prompt injection & jailbreak blocking", fluiq: "yes", competitor: "no" },
    { feature: "PII detection & redaction", fluiq: "yes", competitor: "no" },
    { feature: "Trace-driven response caching", fluiq: "yes", competitor: "partial", competitorNote: "semantic cache via gateway" },
    { feature: "LLM-as-judge evals", fluiq: "yes", competitor: "no" },
    { feature: "CI/CD eval gates", fluiq: "yes", competitor: "no" },
    { feature: "Dataset management", fluiq: "yes", competitor: "no" },
    { feature: "Prompt management", fluiq: "yes", competitor: "yes" },
    { feature: "Load balancing & fallbacks", fluiq: "no", competitor: "yes" },
  ],
  competitorPros: [
    "Excellent LLM routing: automatic fallbacks, load balancing across providers, and retry logic without code changes.",
    "Provider-agnostic gateway — swap models or add fallbacks without touching application code.",
    "Good virtual key management for controlling API access across teams.",
    "Semantic cache via the gateway helps reduce repeated calls for similar prompts.",
  ],
  fluiqAdvantages: [
    "No gateway — Fluiq patches the SDK directly. Your request goes straight to OpenAI/Anthropic/Gemini with zero extra network hops.",
    "Full agent trace trees: Fluiq maps every LLM call, tool use, and agent handoff into a structured span tree across LangGraph, CrewAI, Google ADK, and more.",
    "Security layer: prompt injection blocking, PII redaction, jailbreak scoring, and secret leak detection run server-side on every call — not accessible via the public SDK.",
    "LLM-as-judge evals run inline in production — not just in offline eval scripts — and can block low-quality responses before they reach users.",
    "Dataset and prompt management baked into the same SDK, not bolted on through a gateway.",
  ],
  migrationBefore: {
    label: "Before — Portkey",
    code: `from portkey_ai import Portkey

portkey = Portkey(
    api_key="pk_...",
    virtual_key="openai-vk-...",
)

response = portkey.chat.completions.create(
    messages=[{"role": "user", "content": query}],
    model="gpt-4o",
)
result = response.choices[0].message.content`,
  },
  migrationAfter: {
    label: "After — Fluiq",
    code: `import fluiq
fluiq.instrument(api_key="fl_...")

# Use the standard OpenAI client — no gateway, no virtual keys
from openai import OpenAI
client = OpenAI()

response = client.chat.completions.create(
    messages=[{"role": "user", "content": query}],
    model="gpt-4o",
)
result = response.choices[0].message.content`,
  },
  migrationNote: "Replace the Portkey client with the standard OpenAI client. If you need load-balancing across providers, those are typically handled at the infrastructure layer.",
}

export default function PortkeyAlternative() {
  return <ComparisonPage data={data} />
}
