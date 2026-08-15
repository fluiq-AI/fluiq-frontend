import type { PageSeo } from "@/lib/seo"
import { CANONICAL_HOST, CANONICAL_ORIGIN, siblingOrigin } from "@/lib/site-url"

/**
 * These descriptors are static, so absolute URLs are authored against the
 * canonical origin. `<JsonLd>` rewrites them to the host serving the request,
 * which is what keeps canonicals correct when the site answers on several
 * domains. Do not hardcode the origin here; see `@/lib/site-url`.
 */
const SITE = CANONICAL_ORIGIN
const ISPART = { "@id": SITE }
const INFRAGER_APP = siblingOrigin("infrager", CANONICAL_HOST)

/**
 * schema.org BreadcrumbList node (no @context; embed inside an @graph).
 * Pass an ordered trail of [name, path] pairs, root first.
 */
function breadcrumb(trail: Array<[string, string]>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${SITE}${path}`,
    })),
  }
}

/** Standalone BreadcrumbList JSON-LD (with @context) for rendering on its own. */
export function breadcrumbLd(trail: Array<[string, string]>) {
  return { "@context": "https://schema.org", ...breadcrumb(trail) }
}

/** Title-case the last path segment: "/documentation/quickstart" → "Quickstart". */
function leafLabel(path: string): string {
  const seg = path.split("/").filter(Boolean).pop() ?? ""
  return seg
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

/** Reusable Organization node for author/publisher fields. */
const ORG = { "@type": "Organization", name: "Fluiq", url: SITE }

/**
 * Last meaningful content update for docs/examples. Bump this whenever you make
 * a substantive edit. AI answer engines weight fresh content heavily, so the
 * dateModified signal directly affects AEO citation odds.
 */
const DOCS_UPDATED = "2026-06-20"

/**
 * Standalone FAQPage JSON-LD from an array of question/answer pairs. The Q&A
 * must also be visible on the page (Google requirement). Strong AEO asset:
 * specific, factual answers are exactly what answer engines extract and cite.
 */
export function faqPageLd(items: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  }
}

/** Per-route SEO descriptors ported from the SPA's <Helmet> tags. */
export const SEO = {
  home: {
    title: "Fluiq | The Control Plane for AI Agents in Production",
    description:
      "Fluiq blocks prompt attacks, scores agent trajectories, and traces every step of every run. Two lines of Python, one dashboard.",
    keywords:
      "AI agent observability, agent evaluation, AI agent governance, MCP security, LangGraph monitoring, CrewAI tracing, LLM monitoring, AI observability, prompt injection detection, LLM cost tracking, LLM evaluation, agent trajectory evaluation, OpenAI tracing, Anthropic tracing, LangChain monitoring, AI security, hallucination detection",
    path: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Fluiq",
      url: SITE,
      logo: `${SITE}/logo.svg`,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      programmingLanguage: "Python",
      description:
        "Fluiq is the control plane for AI agents in production. It auto-instruments OpenAI, Anthropic, Gemini, LangChain, LangGraph, Google ADK, CrewAI, MCP, and major vector databases. Two lines of Python add tracing, pre-call security blocking, and trajectory-level LLM-as-judge evaluation to any agent or LLM app.",
      featureList: [
        "Automatic LLM call tracing with full span tree",
        "Per-node token attribution and USD cost tracking at provider rates",
        "p50/p95/p99 latency histograms per agent and model",
        "Real-time trace streaming to dashboard",
        "Pre-call prompt injection and jailbreak blocking",
        "PII detection: credit cards, SSNs, IBAN, emails, phone numbers, IP addresses, names",
        "Secret and high-entropy string redaction",
        "Semantic attack scoring with warn and block modes",
        "Agentic evaluation of whole runs: tool selection, trajectory, multi-agent coordination",
        "Multi-model judge jury with per-member audit trail",
        "Whole-trajectory golden datasets, independent of trace retention",
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
        "AI Agent Governance, LLM Monitoring, AI Security, LLM Evaluation, Agentic Evaluation",
      softwareVersion: "latest",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description:
          "Free tier: unlimited traces, 1000 LLM-as-judge evaluations per month, 1 seat, 14-day retention. No credit card required.",
      },
      author: ORG,
      sameAs: ["https://github.com/fluiq-AI/fluiq-sdk"],
    },
  },

  faq: {
    title: "Fluiq FAQ | Pricing, Evaluation, Security & Data",
    description:
      "Answers on Fluiq pricing and billing, how evaluation and the judge jury work, what fluiq.secure() checks, bring-your-own-key, and where your trace data lives.",
    keywords:
      "Fluiq FAQ, LLM observability FAQ, LLM evaluation pricing, AI security scanning, BYOK LLM evals, LLM tracing questions",
    path: "/faq",
  },
  pricing: {
    title: "Fluiq Pricing | Free LLM Observability, Evals & Security",
    description:
      "Start free with unlimited traces, 100 evals and 1,000 security scans. Starter $29/mo, Team $149/mo, Growth $499/mo. Pay per evaluation beyond your allowance, or bring your own provider keys.",
    keywords:
      "Fluiq pricing, LLM monitoring pricing, LLM observability cost, free LLM tracing, AI agent platform pricing, LLM evaluation pricing, LLM security pricing",
    path: "/pricing",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          name: "Fluiq Pricing",
          description:
            "Fluiq pricing plans: start free with unlimited traces, 100 evaluations and 1,000 security scans a month. Starter $29/mo, Team $149/mo, Growth $499/mo, or Enterprise for VPC, SSO and custom SLAs.",
          url: `${SITE}/pricing`,
          isPartOf: ISPART,
        },
        {
          "@type": "Product",
          name: "Fluiq",
          description:
            "The control plane for AI agents: pre-call security blocking, observability, and trajectory-level evaluation.",
          brand: { "@type": "Brand", name: "Fluiq" },
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: "0",
            highPrice: "599",
            offerCount: 4,
            offers: [
              {
                "@type": "Offer",
                name: "Free",
                price: "0",
                priceCurrency: "USD",
                url: `${SITE}/pricing`,
                availability: "https://schema.org/InStock",
                description:
                  "Unlimited traces, 1,000 LLM-as-judge evals/month, 1 seat, 14-day retention. No credit card required.",
              },
              {
                "@type": "Offer",
                name: "Team",
                price: "299",
                priceCurrency: "USD",
                url: `${SITE}/pricing`,
                availability: "https://schema.org/InStock",
                priceSpecification: {
                  "@type": "UnitPriceSpecification",
                  price: "299",
                  priceCurrency: "USD",
                  unitText: "MONTH",
                },
                description:
                  "Unlimited traces, unlimited retention, SSO, and 10,000 evals/month.",
              },
              {
                "@type": "Offer",
                name: "Growth",
                price: "599",
                priceCurrency: "USD",
                url: `${SITE}/pricing`,
                availability: "https://schema.org/InStock",
                priceSpecification: {
                  "@type": "UnitPriceSpecification",
                  price: "599",
                  priceCurrency: "USD",
                  unitText: "MONTH",
                },
                description:
                  "Everything in Team plus fluiq.secure() security scanning and 100,000 evals/month.",
              },
              {
                "@type": "Offer",
                name: "Enterprise",
                priceCurrency: "USD",
                url: `${SITE}/contact`,
                availability: "https://schema.org/InStock",
                description:
                  "Custom pricing with VPC / on-prem deployment, SSO, unlimited evals, and custom SLAs.",
              },
            ],
          },
        },
        breadcrumb([
          ["Home", "/"],
          ["Pricing", "/pricing"],
        ]),
      ],
    },
  },

  contact: {
    title: "Contact Fluiq | Sales, Support & LLM Integration Help",
    description:
      "Get in touch with the Fluiq team for sales enquiries, integration support, feature requests, and partnerships. We reply within one business day.",
    keywords:
      "contact Fluiq, Fluiq support, Fluiq sales, LLM observability support, Fluiq integrations, Fluiq partnerships",
    path: "/contact",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ContactPage",
          name: "Contact Fluiq",
          description:
            "Contact the Fluiq team for sales enquiries, integration support, feature requests, and partnership discussions. Replies within one business day.",
          url: `${SITE}/contact`,
          isPartOf: ISPART,
        },
        breadcrumb([
          ["Home", "/"],
          ["Contact", "/contact"],
        ]),
      ],
    },
  },

  infrager: {
    title: "Infrager | Cloud Architecture Diagrams to Secure Terraform",
    description:
      "Infrager is a free, open-source tool from the Fluiq team. Drag AWS and Google Cloud resources onto a canvas, connect them, and get dependency-ordered Terraform with security linting that runs while you draw.",
    keywords:
      "diagram to Terraform, Terraform generator, infrastructure as code, cloud architecture diagram, AWS Terraform generator, GCP Terraform generator, IaC security scanning, open source Terraform tool, drag and drop cloud designer",
    path: "/infrager",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SoftwareApplication",
          name: "Infrager",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Web",
          // Authored against the canonical domain like every other URL here;
          // `withSite` moves it to the host being served (infrager.<domain>).
          // Derived rather than written out so it tracks CANONICAL_HOST — a
          // stale literal here would silently stop being rewritten.
          url: INFRAGER_APP,
          description:
            "Open-source tool that converts drag-and-drop AWS and Google Cloud architecture diagrams into production-ready Terraform, with security linting for open security groups, public buckets, unencrypted storage, and overprivileged IAM.",
          license: "https://opensource.org/licenses/MIT",
          author: ORG,
          publisher: ORG,
          isPartOf: ISPART,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        },
        breadcrumb([
          ["Home", "/"],
          ["Infrager", "/infrager"],
        ]),
      ],
    },
  },

  privacy: {
    title: "Privacy Policy: How Fluiq Handles Your LLM Trace Data",
    description:
      "Fluiq's privacy policy: what data we collect, how we use LLM trace data, data retention, and your rights under GDPR and CCPA.",
    keywords:
      "Fluiq privacy policy, data collection, GDPR, CCPA, LLM trace data privacy, data retention",
    path: "/privacy",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          name: "Privacy Policy | Fluiq",
          description:
            "Fluiq's privacy policy: what data we collect, how we use LLM trace data, data retention, and your rights under GDPR and CCPA.",
          url: `${SITE}/privacy`,
          isPartOf: ISPART,
        },
        breadcrumb([
          ["Home", "/"],
          ["Privacy Policy", "/privacy"],
        ]),
      ],
    },
  },

  terms: {
    title: "Terms of Service: Acceptable Use & Billing for Fluiq",
    description:
      "Fluiq's terms of service: acceptable use, data ownership, API usage, billing, and enterprise agreements.",
    keywords:
      "Fluiq terms of service, acceptable use, data ownership, API usage, billing, enterprise agreements",
    path: "/terms",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          name: "Terms of Service | Fluiq",
          description:
            "Fluiq's terms of service: acceptable use, data ownership, API usage, billing, and enterprise agreements.",
          url: `${SITE}/terms`,
          isPartOf: ISPART,
        },
        breadcrumb([
          ["Home", "/"],
          ["Terms of Service", "/terms"],
        ]),
      ],
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
  const isExample = path.startsWith("/examples")
  return {
    title,
    description,
    keywords,
    path,
    ogType: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "TechArticle",
          headline: title,
          description,
          url: `${SITE}${path}`,
          isPartOf: ISPART,
          inLanguage: "en",
          author: ORG,
          publisher: ORG,
          dateModified: DOCS_UPDATED,
        },
        breadcrumb([
          ["Home", "/"],
          isExample ? ["Examples", "/examples"] : ["Documentation", "/documentation"],
          [leafLabel(path), path],
        ]),
      ],
    },
  }
}

export const DOC_SEO = {
  quickstart: techArticle(
    "Quickstart: Add LLM Observability in 60 Seconds | Fluiq",
    "Install the Fluiq SDK and add full LLM observability to your Python app in under 60 seconds. Works with OpenAI, Anthropic, LangChain, and 13+ more.",
    "Fluiq quickstart, LLM observability setup, Python LLM SDK, install Fluiq, LLM tracing tutorial, getting started",
    "/documentation/quickstart",
  ),
  observability: techArticle(
    "LLM Observability: Tracing, Token & Cost Docs | Fluiq",
    "Trace every LLM call with per-node token attribution, USD cost tracking, and p50/p95/p99 latency histograms. Real-time streaming to your Fluiq dashboard.",
    "LLM observability, LLM tracing, token attribution, USD cost tracking, latency histograms, span tree, real-time traces",
    "/documentation/observability",
  ),
  security: techArticle(
    "LLM Security: Prompt Injection & PII Defense Docs | Fluiq",
    "Block prompt injection, jailbreaks, and PII leakage before they reach your model. fluiq.secure() adds pre-call and post-call scanning with zero false positives.",
    "LLM security, prompt injection detection, jailbreak detection, PII redaction, LLM guardrails, secret redaction",
    "/documentation/security",
  ),
  evaluation: techArticle(
    "LLM Evaluation: LLM-as-Judge Quality Scoring | Fluiq Docs",
    "Score every LLM response for hallucination, faithfulness, relevance, and toxicity using LLM-as-judge. Warn or block based on configurable per-metric thresholds.",
    "LLM evaluation, LLM-as-judge, hallucination detection, faithfulness scoring, relevance scoring, toxicity detection, eval gates",
    "/documentation/evaluation",
  ),
  datasets: techArticle(
    "Datasets: Golden Sets & Agent Trajectory Capture | Fluiq Docs",
    "Curate golden datasets from real traces. Each example pins the whole agent trajectory (every span, tool call, and MCP call), so agentic evaluation and security checks can re-run offline after retention expires.",
    "LLM datasets, golden dataset, agent trajectory, agentic evaluation, dataset from traces, batch evaluation, regression testing",
    "/documentation/datasets",
  ),
  prompts: techArticle(
    "Prompt Management: Versioning & Deployment Docs | Fluiq",
    "Version, deploy, and iterate on prompt templates with an IDE-style editor. Variable injection, environment-based deployment, and side-by-side model comparison.",
    "prompt management, prompt versioning, prompt templates, prompt deployment, prompt playground, prompt engineering",
    "/documentation/prompts",
  ),
  configuration: techArticle(
    "Configuration: Fluiq SDK Options & Environment Variables",
    "Full reference for Fluiq SDK configuration: API keys, environment variables, log levels, timeout settings, and per-feature toggles.",
    "Fluiq configuration, SDK configuration, API keys, environment variables, LLM SDK settings, feature toggles",
    "/documentation/configuration",
  ),
  alerts: techArticle(
    "Alerts: Slack Notifications for Evals & Security | Fluiq",
    "Send eval regressions and security events to Slack. Configure per-metric thresholds and risk levels in the dashboard; Fluiq posts to your Incoming Webhook in real time or as a digest.",
    "LLM alerts, Slack alerts, eval regression alerts, security alerts, LLM monitoring alerts, anomaly alerts, Slack webhook",
    "/documentation/alerts",
  ),
} satisfies Record<string, PageSeo>

/** Product / pillar landing pages (one per platform pillar). */
function pillarPage(title: string, description: string, keywords: string, path: string): PageSeo {
  return {
    title,
    description,
    keywords,
    path,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          name: title,
          description,
          url: `${SITE}${path}`,
          isPartOf: ISPART,
        },
        breadcrumb([
          ["Home", "/"],
          [leafLabel(path), path],
        ]),
      ],
    },
  }
}

export const PLATFORM_SEO = {
  observability: pillarPage(
    "LLM Observability: Tracing, Token & Cost Tracking | Fluiq",
    "Trace every LLM call with per-node token attribution, USD cost tracking, and p50/p95/p99 latency. Real-time streaming to your Fluiq dashboard, no code changes.",
    "LLM observability, LLM tracing, token attribution, LLM cost tracking, latency monitoring, agent tracing, real-time traces",
    "/observability",
  ),
  security: pillarPage(
    "LLM Security & Guardrails: Block Injection & PII | Fluiq",
    "Block prompt injection, jailbreaks, and PII leakage before they reach your model. Pre-call and post-call scanning with named guardrail policies, fails open by design.",
    "LLM security, prompt injection detection, jailbreak detection, PII redaction, LLM guardrails, secret redaction, AI security",
    "/security",
  ),
  evaluation: pillarPage(
    "LLM Evaluation & Quality Gates: LLM-as-Judge | Fluiq",
    "Score every LLM response for hallucination, faithfulness, relevance, and toxicity with LLM-as-judge. Agentic evaluation judges whole runs: tool selection, trajectory, and multi-agent coordination, with a multi-model jury deciding borderline cases.",
    "LLM evaluation, LLM-as-judge, agentic evaluation, agent trajectory evaluation, tool selection quality, judge panel, hallucination detection, eval gates",
    "/evaluation",
  ),
  datasets: pillarPage(
    "Agent Datasets: Golden Sets & Trajectory Capture | Fluiq",
    "Curate golden datasets from real traces. Every example pins the whole agent run (steps, tools, MCP calls, media), so agentic evaluation and security checks re-run offline as your regression gate.",
    "LLM datasets, golden dataset, agent trajectory capture, agent regression testing, batch evaluation, dataset from traces, agentic eval",
    "/datasets",
  ),
  prompts: pillarPage(
    "Prompt Management & Versioning: Templates & Deploy | Fluiq",
    "Version, deploy, and iterate on prompt templates with an IDE-style editor. Variable injection, environment-based deployment, and side-by-side model comparison.",
    "prompt management, prompt versioning, prompt templates, prompt deployment, prompt playground, prompt engineering",
    "/prompts",
  ),
  alerts: pillarPage(
    "LLM Alerts to Slack: Eval & Security Notifications | Fluiq",
    "Push eval regressions and security events straight to Slack. Configure per-metric thresholds and risk levels in the dashboard; Fluiq posts to your Incoming Webhook in real time or as a digest.",
    "LLM alerts, Slack alerts, eval regression alerts, security alerts, LLM monitoring alerts, anomaly alerts, Slack webhook",
    "/alerts",
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
      "@graph": [
        {
          "@type": "WebPage",
          name: d.metaTitle,
          description: d.metaDescription,
          url: `${SITE}${d.canonicalPath}`,
          isPartOf: ISPART,
        },
        breadcrumb([
          ["Home", "/"],
          [`${d.name} Alternative`, d.canonicalPath],
        ]),
      ],
    },
  }
}

export const EXAMPLE_SEO = {
  observability: techArticle(
    "Observability Examples: OpenAI, LangChain & More | Fluiq",
    "Code examples for Fluiq observability: tracing OpenAI, Anthropic, LangChain, LangGraph, CrewAI, Google ADK, and vector database calls.",
    "Fluiq tracing examples, OpenAI tracing code, LangChain tracing, CrewAI tracing examples, LLM observability code, span tree example",
    "/examples/observability",
  ),
  security: techArticle(
    "Security Examples: Block Injection, Jailbreaks & PII",
    "Code examples for fluiq.secure(): blocking prompt injection, jailbreaks, PII leakage, and skeleton-key attacks across OpenAI, Anthropic, and LangChain.",
    "fluiq.secure examples, prompt injection code, PII redaction example, LLM security code, jailbreak blocking, LLM guardrails example",
    "/examples/security",
  ),
  evaluation: techArticle(
    "Evaluation Examples: Score LLM Responses With Judge | Fluiq",
    "Code examples for fluiq.eval(): scoring LLM responses for hallucination, relevance, and toxicity with warn and block modes across major providers.",
    "fluiq.eval examples, LLM evaluation code, hallucination scoring example, LLM-as-judge code, toxicity scoring, eval modes",
    "/examples/evaluation",
  ),
  prompts: techArticle(
    "Prompt Management Examples: Versioned Templates | Fluiq",
    "Code examples for Fluiq prompt management: fetching versioned prompt templates by environment, variable injection, and deployment across dev, staging, and production.",
    "prompt management examples, versioned prompts code, prompt deployment example, variable injection, prompt templates code",
    "/examples/prompts",
  ),
} satisfies Record<string, PageSeo>
