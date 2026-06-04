import ComparisonPage, { type CompetitorData } from "./ComparisonPage"

const data: CompetitorData = {
  slug: "langfuse-alternative",
  name: "Langfuse",
  metaTitle: "Fluiq vs Langfuse — The Langfuse Alternative With Security & Caching Built In",
  metaDescription: "Comparing Fluiq vs Langfuse. Fluiq requires zero manual spans, adds prompt injection blocking and Redis caching, and runs fully managed — no self-hosting required.",
  canonicalPath: "/langfuse-alternative",
  heroHeadline: "The Langfuse Alternative: Zero Manual Spans, Security Included",
  heroSub: "Langfuse is a solid open-source observability platform. Fluiq auto-instruments the same frameworks with zero manual span calls, adds server-side security scanning, and runs fully managed — no infra to maintain.",
  stats: [
    { value: "Zero", label: "manual span calls — fully automatic" },
    { value: "Managed", label: "cloud, no self-hosting required" },
    { value: "Built-in", label: "security scanning on every trace" },
  ],
  features: [
    { feature: "Auto-instrumentation (no manual spans)", fluiq: "yes", competitor: "no", competitorNote: "requires @observe decorators" },
    { feature: "OpenAI, Anthropic, Gemini support", fluiq: "yes", competitor: "yes" },
    { feature: "LangChain / LangGraph tracing", fluiq: "yes", competitor: "yes" },
    { feature: "CrewAI / MCP / Google ADK tracing", fluiq: "yes", competitor: "partial" },
    { feature: "Full agent span tree", fluiq: "yes", competitor: "yes" },
    { feature: "Prompt injection & jailbreak blocking", fluiq: "yes", competitor: "no" },
    { feature: "PII detection & redaction", fluiq: "yes", competitor: "no" },
    { feature: "Trace-driven response caching", fluiq: "yes", competitor: "no" },
    { feature: "LLM-as-judge evals", fluiq: "yes", competitor: "yes" },
    { feature: "CI/CD eval gates", fluiq: "yes", competitor: "yes" },
    { feature: "Prompt management", fluiq: "yes", competitor: "yes" },
    { feature: "Fully managed cloud (no self-hosting)", fluiq: "yes", competitor: "partial", competitorNote: "self-host or paid cloud" },
    { feature: "Cost tracking per model", fluiq: "yes", competitor: "yes" },
  ],
  competitorPros: [
    "Open-source and self-hostable — full control over data residency and no vendor lock-in.",
    "Active community with frequent releases and strong GitHub presence.",
    "Good Python and JS/TS SDKs with broad framework coverage via decorators.",
    "Transparent pricing and generous self-hosted option for budget-conscious teams.",
  ],
  fluiqAdvantages: [
    "Zero manual spans — Fluiq patches the SDK at import time, so all LLM calls are traced without decorators or context management.",
    "Security layer baked in: prompt injection detection, jailbreak scoring, PII redaction, and secret leak prevention run server-side on every call.",
    "Trace-driven Redis caching: Fluiq mines your trace history and serves repeated prompts from cache, cutting API costs without code changes.",
    "Fully managed — no Docker Compose, no Postgres to maintain, no infrastructure cost to carry.",
    "One SDK covers the entire LLM ops stack: trace, secure, cache, and evaluate.",
  ],
  migrationBefore: {
    label: "Before — Langfuse",
    code: `from langfuse.openai import openai          # patched client
from langfuse.decorators import observe, langfuse_context

@observe()
def run_pipeline(query: str):
    langfuse_context.update_current_observation(
        input=query,
        model="gpt-4o",
    )
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": query}],
    )
    return response.choices[0].message.content`,
  },
  migrationAfter: {
    label: "After — Fluiq",
    code: `import fluiq
fluiq.instrument(api_key="fl_...")

# Use the official OpenAI client — no wrapped imports, no decorators
from openai import OpenAI
client = OpenAI()

def run_pipeline(query: str):
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": query}],
    )
    return response.choices[0].message.content`,
  },
  migrationNote: "Replace langfuse.openai imports and @observe decorators. Fluiq instruments the standard SDK — no context managers needed.",
}

export default function LangfuseAlternative() {
  return <ComparisonPage data={data} />
}
