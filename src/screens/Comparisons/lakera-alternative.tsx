import ComparisonPage, { type CompetitorData } from "./ComparisonPage"

export const data: CompetitorData = {
  slug: "lakera-alternative",
  name: "Lakera Guard",
  metaTitle: "Fluiq vs Lakera Guard, The Lakera Alternative With Tracing, Caching & Evals",
  metaDescription: "Comparing Fluiq vs Lakera Guard. Fluiq covers prompt injection and PII detection like Lakera, plus adds full LLM observability, response caching, and automated evals with no extra API call per request.",
  canonicalPath: "/lakera-alternative",
  heroHeadline: "The Lakera Alternative: Security Plus the Full Ops Stack",
  heroSub: "Lakera Guard is focused entirely on security. Fluiq covers the same prompt injection and PII detection, plus adds tracing, caching, and evals, all server-side with no extra round-trip API call per request.",
  stats: [
    { value: "No extra", label: "API call per request, runs server-side" },
    { value: "5-in-1", label: "security, tracing, caching, evals, prompts" },
    { value: "2 lines", label: "to enable everything" },
  ],
  features: [
    { feature: "Prompt injection detection", fluiq: "yes", competitor: "yes" },
    { feature: "Jailbreak & semantic attack scoring", fluiq: "yes", competitor: "yes" },
    { feature: "PII detection & redaction", fluiq: "yes", competitor: "yes" },
    { feature: "No extra API call per request", fluiq: "yes", competitor: "no", competitorNote: "separate Guard API call required" },
    { feature: "Full LLM observability / tracing", fluiq: "yes", competitor: "no" },
    { feature: "Per-node cost & token tracking", fluiq: "yes", competitor: "no" },
    { feature: "Trace-driven response caching", fluiq: "yes", competitor: "no" },
    { feature: "LLM-as-judge evals", fluiq: "yes", competitor: "no" },
    { feature: "CI/CD eval gates", fluiq: "yes", competitor: "no" },
    { feature: "Prompt management", fluiq: "yes", competitor: "no" },
    { feature: "13+ framework integrations", fluiq: "yes", competitor: "partial" },
    { feature: "Warn mode (flag without blocking)", fluiq: "yes", competitor: "yes" },
    { feature: "Block mode (intercept before LLM)", fluiq: "yes", competitor: "yes" },
  ],
  competitorPros: [
    "Purpose-built security with a very high detection rate for prompt injection and jailbreak patterns, one of the most battle-tested models available.",
    "Dedicated, constantly updated threat model trained specifically on adversarial LLM attack patterns.",
    "Clear security-first focus makes it easy to reason about the scope of protection in compliance or audit contexts.",
    "Integrates easily into any HTTP-based LLM stack as a standalone guard step.",
  ],
  fluiqAdvantages: [
    "No extra API round-trip: Fluiq's security scanning runs server-side as part of the trace processing pipeline, your latency profile doesn't change.",
    "Full observability included: trace every LLM call, map agent spans, track token counts, and attribute cost, security alone doesn't tell you what's happening inside your pipelines.",
    "Trace-driven caching: Fluiq learns which prompts repeat and serves them from Redis, Lakera has nothing equivalent.",
    "LLM-as-judge evals run inline in production, flagging hallucination, toxicity, and coherence issues alongside security events.",
    "One SDK, one dashboard: security events, traces, evals, and cost data are all in the same place, not spread across separate tools.",
  ],
  migrationBefore: {
    label: "Before, Lakera Guard",
    code: `import lakera_guard
import openai

guard = lakera_guard.Guard(api_key="lak_...")

def run_safely(query: str) -> str:
    # Extra API call before every LLM request
    result = guard.detect({"messages": [
        {"role": "user", "content": query}
    ]})
    if result.flagged:
        raise ValueError("Blocked by Lakera Guard")

    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": query}],
    )
    return response.choices[0].message.content`,
  },
  migrationAfter: {
    label: "After, Fluiq",
    code: `import fluiq
fluiq.instrument(api_key="fl_...")
fluiq.secure(mode="block")  # server-side guard, no extra round-trip

import openai

def run_safely(query: str) -> str:
    # FluiqSecurityError raised automatically if attack detected
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": query}],
    )
    return response.choices[0].message.content`,
  },
  migrationNote: "Remove the guard.detect() call. fluiq.secure(mode='block') intercepts requests server-side before they reach the LLM, no client-side API call needed.",
}

export default function LakeraAlternative() {
  return <ComparisonPage data={data} />
}
