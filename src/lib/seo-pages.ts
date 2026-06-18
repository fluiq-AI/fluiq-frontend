import type { PageSeo } from "@/lib/seo"

const ISPART = { "@id": "https://getfluiq.com" }

/** Per-route SEO descriptors ported from the SPA's <Helmet> tags. */
export const SEO = {
  home: {
    title: "Fluiq: The AI Ops Stack for LLM Applications",
    description:
      "Fluiq is the unified ops layer for LLM applications: security scanning, intelligent caching, deep observability, and automated evaluation on every single request.",
    keywords:
      "AI Ops, LLM monitoring, AI observability, prompt injection detection, LLM cost tracking, LLM evaluation, LLM caching, OpenAI tracing, Anthropic tracing, LangChain monitoring, AI security, hallucination detection",
    path: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Fluiq",
      url: "https://getfluiq.com",
      logo: "https://getfluiq.com/logo.svg",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      programmingLanguage: "Python",
      description:
        "Fluiq is the AI Ops stack for production LLM applications. It auto-instruments OpenAI, Anthropic, Gemini, LangChain, LangGraph, Google ADK, CrewAI, MCP, and major vector databases. Two lines of Python add tracing, security scanning, response caching, and LLM-as-judge evaluation to any LLM app.",
      featureList: [
        "Automatic LLM call tracing with full span tree",
        "Per-node token attribution and USD cost tracking at provider rates",
        "p50/p95/p99 latency histograms per agent and model",
        "Real-time trace streaming to dashboard",
        "Pre-call prompt injection and jailbreak blocking",
        "PII detection: credit cards, SSNs, IBAN, emails, phone numbers, IP addresses, names",
        "Secret and high-entropy string redaction",
        "Semantic attack scoring with warn and block modes",
        "Trace-driven server-side Redis response caching",
        "Cache observe mode to measure savings without caching",
        "Configurable TTL and per-model cache scoping",
        "LLM-as-judge evaluation: hallucination, faithfulness, relevance, toxicity, coherence, completeness",
        "Evaluation warn and block modes with configurable thresholds",
        "CI/CD GitHub Actions eval gates",
        "Prompt template management with environment-based deployment",
        "Prompt playground with LLM-as-judge scoring",
        "Agent-level cost and latency aggregation",
        "Cost anomaly alerts to Slack",
        "Dataset management for regression testing",
        "API key management",
      ],
      applicationSubCategory:
        "AI Ops, LLM Monitoring, AI Security, LLM Evaluation, Response Caching",
      softwareVersion: "latest",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description:
          "Free tier: 50,000 traces per month, 1000 LLM-as-judge evaluations per month, 1 seat, 14-day retention. No credit card required.",
      },
      author: { "@type": "Organization", name: "Fluiq", url: "https://getfluiq.com" },
      sameAs: ["https://github.com/fluiq-AI/fluiq-sdk"],
    },
  },

  pricing: {
    title: "Pricing - Fluiq",
    description:
      "Fluiq pricing: start free with 50,000 traces/month and 1,000 evaluations. Upgrade to Team ($49/mo) for caching and unlimited traces, Growth ($149/mo) for security scanning, or Enterprise for VPC, SSO & custom SLAs.",
    keywords:
      "Fluiq pricing, LLM monitoring pricing, LLM observability cost, free LLM tracing, AI ops pricing, LLM evaluation pricing, LLM security pricing",
    path: "/pricing",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Fluiq Pricing",
      description:
        "Fluiq pricing plans: start free with 50,000 traces/month and 1,000 evaluations/month, upgrade to Team ($49/mo), Growth ($149/mo) for security scanning, or Enterprise for VPC, SSO and custom SLAs.",
      url: "https://getfluiq.com/pricing",
      isPartOf: ISPART,
    },
  },

  contact: {
    title: "Contact - Fluiq",
    description:
      "Get in touch with the Fluiq team for sales enquiries, integration support, feature requests, and partnerships. We reply within one business day.",
    keywords:
      "contact Fluiq, Fluiq support, Fluiq sales, LLM observability support, Fluiq integrations, Fluiq partnerships",
    path: "/contact",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Contact Fluiq",
      description:
        "Contact the Fluiq team for sales enquiries, integration support, feature requests, and partnership discussions. Replies within one business day.",
      url: "https://getfluiq.com/contact",
      isPartOf: ISPART,
    },
  },

  privacy: {
    title: "Privacy Policy — Fluiq",
    description:
      "Fluiq's privacy policy: what data we collect, how we use LLM trace data, data retention, and your rights under GDPR and CCPA.",
    keywords:
      "Fluiq privacy policy, data collection, GDPR, CCPA, LLM trace data privacy, data retention",
    path: "/privacy",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Privacy Policy — Fluiq",
      description:
        "Fluiq's privacy policy: what data we collect, how we use LLM trace data, data retention, and your rights under GDPR and CCPA.",
      url: "https://getfluiq.com/privacy",
      isPartOf: ISPART,
    },
  },

  terms: {
    title: "Terms of Service — Fluiq",
    description:
      "Fluiq's terms of service: acceptable use, data ownership, API usage, billing, and enterprise agreements.",
    keywords:
      "Fluiq terms of service, acceptable use, data ownership, API usage, billing, enterprise agreements",
    path: "/terms",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Terms of Service — Fluiq",
      description:
        "Fluiq's terms of service: acceptable use, data ownership, API usage, billing, and enterprise agreements.",
      url: "https://getfluiq.com/terms",
      isPartOf: ISPART,
    },
  },
} satisfies Record<string, PageSeo>

/** Documentation + Examples pages share the TechArticle shape. */
function techArticle(
  title: string,
  description: string,
  keywords: string,
  path: string,
): PageSeo {
  return {
    title,
    description,
    keywords,
    path,
    ogType: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: title,
      description,
      url: `https://getfluiq.com${path}`,
      isPartOf: ISPART,
    },
  }
}

export const DOC_SEO = {
  quickstart: techArticle(
    "Quickstart — Fluiq Docs",
    "Install the Fluiq SDK and add full LLM observability to your Python app in under 60 seconds. Works with OpenAI, Anthropic, LangChain, and 13+ more.",
    "Fluiq quickstart, LLM observability setup, Python LLM SDK, install Fluiq, LLM tracing tutorial, getting started",
    "/documentation/quickstart",
  ),
  observability: techArticle(
    "Observability — Fluiq Docs",
    "Trace every LLM call with per-node token attribution, USD cost tracking, and p50/p95/p99 latency histograms. Real-time streaming to your Fluiq dashboard.",
    "LLM observability, LLM tracing, token attribution, USD cost tracking, latency histograms, span tree, real-time traces",
    "/documentation/observability",
  ),
  optimization: techArticle(
    "Optimization — Fluiq Docs",
    "Cut LLM costs by caching repeated prompts server-side. fluiq.optimize() analyses your trace history, provisions a cache instance, and serves duplicates automatically.",
    "LLM caching, prompt caching, LLM cost optimization, response caching, Redis LLM cache, reduce LLM costs",
    "/documentation/optimization",
  ),
  security: techArticle(
    "Security — Fluiq Docs",
    "Block prompt injection, jailbreaks, and PII leakage before they reach your model. fluiq.secure() adds pre-call and post-call scanning with zero false positives.",
    "LLM security, prompt injection detection, jailbreak detection, PII redaction, LLM guardrails, secret redaction",
    "/documentation/security",
  ),
  evaluation: techArticle(
    "Evaluation — Fluiq Docs",
    "Score every LLM response for hallucination, faithfulness, relevance, and toxicity using LLM-as-judge. Warn or block based on configurable per-metric thresholds.",
    "LLM evaluation, LLM-as-judge, hallucination detection, faithfulness scoring, relevance scoring, toxicity detection, eval gates",
    "/documentation/evaluation",
  ),
  prompts: techArticle(
    "Prompt Management — Fluiq Docs",
    "Version, deploy, and iterate on prompt templates with an IDE-style editor. Variable injection, environment-based deployment, and side-by-side model comparison.",
    "prompt management, prompt versioning, prompt templates, prompt deployment, prompt playground, prompt engineering",
    "/documentation/prompts",
  ),
  configuration: techArticle(
    "Configuration — Fluiq Docs",
    "Full reference for Fluiq SDK configuration options — API keys, environment variables, log levels, timeout settings, and per-feature toggles.",
    "Fluiq configuration, SDK configuration, API keys, environment variables, LLM SDK settings, feature toggles",
    "/documentation/configuration",
  ),
} satisfies Record<string, PageSeo>

/** Comparison / "X alternative" pages, built from each route's CompetitorData. */
export function comparisonSeo(d: {
  name: string
  metaTitle: string
  metaDescription: string
  canonicalPath: string
}): PageSeo {
  return {
    title: d.metaTitle,
    description: d.metaDescription,
    keywords: `${d.name} alternative, Fluiq vs ${d.name}, ${d.name} comparison, ${d.name} pricing, LLM observability, LLM monitoring`,
    path: d.canonicalPath,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: d.metaTitle,
      description: d.metaDescription,
      url: `https://getfluiq.com${d.canonicalPath}`,
      isPartOf: ISPART,
    },
  }
}

export const EXAMPLE_SEO = {
  observability: techArticle(
    "Observability Examples — Fluiq Docs",
    "Code examples for Fluiq observability: tracing OpenAI, Anthropic, LangChain, LangGraph, CrewAI, Google ADK, and vector database calls.",
    "Fluiq tracing examples, OpenAI tracing code, LangChain tracing, CrewAI tracing examples, LLM observability code, span tree example",
    "/examples/observability",
  ),
  security: techArticle(
    "Security Examples — Fluiq Docs",
    "Code examples for fluiq.secure(): blocking prompt injection, jailbreaks, PII leakage, and skeleton-key attacks across OpenAI, Anthropic, and LangChain.",
    "fluiq.secure examples, prompt injection code, PII redaction example, LLM security code, jailbreak blocking, LLM guardrails example",
    "/examples/security",
  ),
  evaluation: techArticle(
    "Evaluation Examples — Fluiq Docs",
    "Code examples for fluiq.eval(): scoring LLM responses for hallucination, relevance, and toxicity with warn and block modes across major providers.",
    "fluiq.eval examples, LLM evaluation code, hallucination scoring example, LLM-as-judge code, toxicity scoring, eval modes",
    "/examples/evaluation",
  ),
  optimization: techArticle(
    "Optimization Examples — Fluiq Docs",
    "Code examples for fluiq.optimize(): trace-driven LLM response caching with observe mode, configurable TTL, and per-model scope.",
    "fluiq.optimize examples, LLM caching code, response caching example, cache TTL, prompt caching code, observe mode",
    "/examples/optimization",
  ),
  prompts: techArticle(
    "Prompt Management Examples — Fluiq Docs",
    "Code examples for Fluiq prompt management: fetching versioned prompt templates by environment, variable injection, and deployment across dev, staging, and production.",
    "prompt management examples, versioned prompts code, prompt deployment example, variable injection, prompt templates code",
    "/examples/prompts",
  ),
} satisfies Record<string, PageSeo>
