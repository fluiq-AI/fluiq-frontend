import ComparisonPage, { type CompetitorData } from "./ComparisonPage"

export const data: CompetitorData = {
  slug: "langsmith-alternative",
  name: "LangSmith",
  metaTitle: "Fluiq vs LangSmith, The LangSmith Alternative for Production LLM Apps",
  metaDescription: "Comparing Fluiq vs LangSmith. Fluiq adds security scanning, caching, and multi-framework support beyond LangChain, in two lines of Python, with no tracing boilerplate.",
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
}

export default function LangSmithAlternative() {
  return <ComparisonPage data={data} />
}
