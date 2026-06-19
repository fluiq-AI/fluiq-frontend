"use client"

import "@/styles/pricing.css";
import { useState, Fragment } from "react"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  SparklesIcon,
  ShieldKeyIcon,
  FlashIcon,
  PythonIcon,
  SquareLock02Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"
import { IslandCta } from "@/components/IslandCta"
import { CodeBlock } from "@/components/code-block"
import { useScrollReveal } from "@/pages/Home/hooks/useScrollReveal"
import { SiteFooter } from "@/components/SiteFooter"
import { SiteNavbar } from "@/components/SiteNavbar"
import { GrainOverlay, HeroAtmosphere } from "@/components/SiteBackdrop"
import { syntaxHighlight } from "@/pages/Documentation/syntaxHighlight"

const EASE_OUT = [0.22, 1, 0.36, 1] as const

type Tier = {
  name: string
  price: { monthly: number | "custom"; annual: number | "custom" }
  traces: string
  evals: string
  seats: string
  retention: string
  cta: string
  ctaHref: string
  highlighted: boolean
  features: { label: string; included: boolean | "locked"; note?: string }[]
}

const tiers: Tier[] = [
  {
    name: "Free",
    price: { monthly: 0, annual: 0 },
    traces: "50,000 traces / month",
    evals: "1,000 evaluations / month",
    seats: "1 seat",
    retention: "14-day trace retention",
    cta: "Start free",
    ctaHref: "/signup",
    highlighted: false,
    features: [
      { label: "fluiq.instrument(): full observability", included: true },
      { label: "Trace explorer & live dashboard", included: true },
      { label: "Streaming traces", included: true },
      { label: "Community support", included: true },
      { label: "fluiq.optimize(): response caching", included: false },
      { label: "CI/CD eval gates", included: false },
      { label: "Slack anomaly alerts", included: false },
      { label: "fluiq.secure(): security scanning", included: "locked", note: "Growth+" },
    ],
  },
  {
    name: "Team",
    price: { monthly: 299, annual: 2990 },
    traces: "Unlimited traces",
    evals: "10,000 evaluations / month",
    seats: "Up to 5 seats",
    retention: "90-day trace retention",
    cta: "Start free",
    ctaHref: "/signup",
    highlighted: false,
    features: [
      { label: "Everything in Free", included: true },
      { label: "fluiq.optimize(): response caching", included: true },
      { label: "CI/CD eval gates", included: true },
      { label: "Slack anomaly alerts", included: true },
      { label: "Email support (48h SLA)", included: true },
      { label: "fluiq.secure(): security scanning", included: "locked", note: "Growth+" },
    ],
  },
  {
    name: "Growth",
    price: { monthly: 599, annual: 5990 },
    traces: "Unlimited traces",
    evals: "100,000 evaluations / month",
    seats: "Up to 20 seats",
    retention: "1-year trace retention",
    cta: "Start free",
    ctaHref: "/signup",
    highlighted: true,
    features: [
      { label: "Everything in Team", included: true },
      { label: "fluiq.secure(): security scanning", included: true },
      { label: "Prompt injection, PII, jailbreak & secret-leak protection", included: true },
      { label: "Custom eval thresholds", included: true },
      { label: "SSO (single sign-on)", included: true },
      { label: "Priority support (24h SLA)", included: true },
    ],
  },
  {
    name: "Enterprise",
    price: { monthly: "custom", annual: "custom" },
    traces: "Unlimited traces",
    evals: "Unlimited evaluations",
    seats: "Unlimited seats",
    retention: "Custom trace retention",
    cta: "Talk to us",
    ctaHref: "/contact",
    highlighted: false,
    features: [
      { label: "Everything in Growth", included: true },
      { label: "VPC / on-prem deployment", included: true },
      { label: "Custom SLA & dedicated support", included: true },
      { label: "Audit logs & compliance exports", included: true },
      { label: "SAML / SCIM provisioning", included: true },
      { label: "Dedicated onboarding", included: true },
    ],
  },
]

type Cell = string | boolean
const comparison: { category: string; rows: { label: string; values: [Cell, Cell, Cell, Cell] }[] }[] = [
  {
    category: "Observability",
    rows: [
      { label: "Traces / month", values: ["50K", "Unlimited", "Unlimited", "Unlimited"] },
      { label: "Trace retention", values: ["14 days", "90 days", "1 year", "Custom"] },
      { label: "Live dashboard", values: [true, true, true, true] },
      { label: "Trace explorer", values: [true, true, true, true] },
      { label: "Streaming traces", values: [true, true, true, true] },
    ],
  },
  {
    category: "Evaluation",
    rows: [
      { label: "Evals / month", values: ["1,000", "10,000", "100,000", "Unlimited"] },
      { label: "LLM-as-judge metrics", values: [true, true, true, true] },
      { label: "CI/CD eval gates", values: [false, true, true, true] },
      { label: "Custom eval thresholds", values: [false, false, true, true] },
    ],
  },
  {
    category: "Security: fluiq.secure()",
    rows: [
      { label: "Prompt injection blocking", values: [false, false, true, true] },
      { label: "PII detection & redaction", values: [false, false, true, true] },
      { label: "Jailbreak detection", values: [false, false, true, true] },
      { label: "Secret leak prevention", values: [false, false, true, true] },
      { label: "Indirect injection detection", values: [false, false, true, true] },
    ],
  },
  {
    category: "Optimization: fluiq.optimize()",
    rows: [
      { label: "Response caching", values: [false, true, true, true] },
      { label: "Cache hit dashboard", values: [false, true, true, true] },
    ],
  },
  {
    category: "Team & Access",
    rows: [
      { label: "Seats", values: ["1", "5", "20", "Unlimited"] },
      { label: "SSO", values: [false, false, true, true] },
      { label: "SAML / SCIM", values: [false, false, false, true] },
      { label: "Audit logs", values: [false, false, false, true] },
    ],
  },
  {
    category: "Support",
    rows: [
      { label: "Community support", values: [true, true, true, true] },
      { label: "Email support", values: [false, "48h SLA", "24h SLA", "Dedicated"] },
      { label: "Slack alerts", values: [false, true, true, true] },
      { label: "Dedicated onboarding", values: [false, false, false, true] },
    ],
  },
  {
    category: "Deployment",
    rows: [
      { label: "Cloud (managed)", values: [true, true, true, true] },
      { label: "VPC / on-prem", values: [false, false, false, true] },
    ],
  },
]

const powerFeatures = [
  {
    icon: ShieldKeyIcon,
    name: "fluiq.secure()",
    badge: "Included in Growth & Enterprise",
    tagline: "One call. Full pipeline protection.",
    description:
      "Wrap your pipeline with server-side security scanning before any data is stored. Fluiq checks every prompt and response, so attack patterns are never shipped in the public SDK.",
    capabilities: [
      { label: "PII Detection & Redaction", desc: "Names, emails, phone numbers, SSNs, and credit cards, detected and redacted before persistence." },
      { label: "Prompt Injection Blocking", desc: "Catches injection patterns, jailbreak attempts, and skeleton key attacks in real time." },
      { label: "Jailbreak & Semantic Attack Scoring", desc: "Semantic similarity scoring against known attack vectors, even when phrasing varies." },
      { label: "Secret Leak Prevention", desc: "Scans LLM outputs for leaked API keys, tokens, and high-entropy credential strings." },
      { label: "Indirect Injection Detection", desc: "Inspects tool outputs and context documents for second-order injection hidden in retrieved content." },
      { label: "Warn or Block mode", desc: "warn (default) flags risks and attaches security metadata to the trace. block intercepts before the LLM call and raises FluiqSecurityError." },
    ],
    code: `fluiq.instrument(api_key="fl_...")\nfluiq.secure()  # warn mode flags risks on the trace\nfluiq.secure(mode="block")  # block mode`,
  },
  {
    icon: FlashIcon,
    name: "fluiq.optimize()",
    badge: "Included in Team & above",
    tagline: "Serve repeated prompts from cache.",
    description:
      "Fluiq analyses your historical traces to find which LLM calls repeat most often and provisions a dedicated Redis cache for your account. Repeated prompts are served instantly, saving both latency and cost.",
    capabilities: [
      { label: "Trace-Driven Cache Profiling", desc: "The backend mines your trace history to build a cache profile, no manual configuration needed." },
      { label: "Automatic Cache Population", desc: "Real LLM responses are stored automatically on the first call; subsequent matches are served from Redis." },
      { label: "Cache mode", desc: "Full interception: matching prompts never reach the LLM API." },
      { label: "Observe mode", desc: "Records what would have been a cache hit without intercepting: review your savings before opting in." },
      { label: "Zero code changes", desc: "One fluiq.optimize() call after instrument(). The SDK handles connection, profiling, and cache lookup." },
      { label: "Cache hit dashboard", desc: "See hit rates, latency savings, and estimated cost savings in your Fluiq dashboard." },
    ],
    code: `fluiq.instrument(api_key="fl_...")\nfluiq.optimize()  # cache mode\nfluiq.optimize(mode="observe")  # observe mode`,
  },
]

const faqs = [
  {
    q: "What counts as a trace?",
    a: "One traced span, typically one LLM call, one retriever call, or one decorated function invocation. A single end-to-end agent run usually emits 5-20 traces depending on how many tools and LLM calls it makes. The Free plan includes 50,000 traces per month; Team and above are unlimited.",
  },
  {
    q: "Which frameworks does Fluiq support?",
    a: "Fluiq instruments at the function-call level and ships integrations for OpenAI, Anthropic, Gemini, LangChain, LangGraph, CrewAI, Google ADK, and raw HTTP calls via the @trace decorator. Streaming, tool calls, thinking tokens, and MCP servers are all captured automatically.",
  },
  {
    q: "What counts as an evaluation?",
    a: "One LLM-as-judge scoring call: e.g. a hallucination check on an answer or a relevance score over a retrieved chunk set. Metrics include hallucination, faithfulness, relevance, toxicity, coherence, and completeness. Free includes 1,000 evals/month, Team 10,000, Growth 100,000, and Enterprise is unlimited.",
  },
  {
    q: "When do I need fluiq.secure()?",
    a: "fluiq.secure() runs server-side security scanning: PII detection and redaction, prompt-injection and jailbreak blocking, secret-leak prevention, and indirect-injection detection. It is included on the Growth and Enterprise plans. In warn mode it flags risks on the trace without blocking; in block mode it raises FluiqSecurityError before a HIGH-risk prompt reaches the LLM.",
  },
  {
    q: "How does fluiq.optimize() work?",
    a: "Available on Team and above. After you call fluiq.optimize(), the SDK fetches your trace-derived cache profile from the Fluiq backend, connects to a dedicated Redis instance provisioned for your account, and begins serving repeated prompts from cache. In observe mode it records what would have been a cache hit so you can review projected savings before enabling full interception.",
  },
  {
    q: "Do you support self-hosting?",
    a: "Yes. VPC and on-prem deployments are available on the Enterprise plan. The SDK is a thin instrumentation layer and can be pointed at your own backend endpoint if you prefer full self-hosting.",
  },
  {
    q: "Can I switch frameworks later?",
    a: "Yes. Because Fluiq instruments at the call level, the same SDK works across all supported frameworks simultaneously. Switching from LangChain to LangGraph, or adding a new provider, requires no changes to your instrumentation.",
  },
]

function priceLabel(tier: Tier, annual: boolean) {
  const value = annual ? tier.price.annual : tier.price.monthly
  if (value === "custom") return { big: "Custom", suffix: "", sub: "" }
  if (value === 0) return { big: "$0", suffix: "", sub: "Free forever" }
  if (annual) {
    const perMonth = Math.round((value as number) / 12)
    return { big: `$${value}`, suffix: "/yr", sub: `$${perMonth}/mo billed annually` }
  }
  return { big: `$${value}`, suffix: "/mo", sub: "billed monthly" }
}

export default function Pricing() {
  useScrollReveal()
  const [annual, setAnnual] = useState(false)

  return (
    <div className="pricing-page min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">
      <GrainOverlay />
<SiteNavbar active="pricing" />

      <section className="relative border-b border-[#D4CFC1] dark:border-[#1A1A1A] overflow-hidden py-24">

        <HeroAtmosphere variant="center" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">

          <motion.div className="mb-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9]/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#1860D3] dark:text-[#6FA8FF]">
              Pricing
            </span>
          </motion.div>

          <motion.h1
            className="font-heading mx-auto max-w-3xl text-5xl font-bold tracking-[-0.03em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.08] md:text-6xl"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE_OUT }}>
            The right plan for <span className="text-[#1860D3] dark:text-[#6FA8FF]">every team.</span>
          </motion.h1>

          <motion.p
            className="mt-6 mx-auto max-w-xl text-[18px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: EASE_OUT }}>
            Start free. Add security and scale as you grow. Every plan includes full LLM observability.
          </motion.p>

          {/* Billing toggle */}
          <motion.div className="mt-10 flex items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: EASE_OUT }}>
            <div className="inline-flex items-center rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9] dark:bg-[#1A1A1A] p-1">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  !annual
                    ? "bg-[#0a0a0a] text-white dark:bg-[#FAF9F6] dark:text-[#0A0A0A]"
                    : "text-[#6B6B66] dark:text-[#9A9A92]"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  annual
                    ? "bg-[#0a0a0a] text-white dark:bg-[#FAF9F6] dark:text-[#0A0A0A]"
                    : "text-[#6B6B66] dark:text-[#9A9A92]"
                }`}
              >
                Annual
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  annual
                    ? "bg-white/20 text-white dark:bg-[#0A0A0A]/15 dark:text-[#0A0A0A]"
                    : "bg-[#E8F0FD] text-[#1860D3] dark:bg-[#1860D3]/15 dark:text-[#6FA8FF]"
                }`}>Save 17%</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Pricing cards ────────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 lg:grid-cols-4 md:grid-cols-2 items-start">
            {tiers.map((tier, i) => {
              const p = priceLabel(tier, annual)
              return (
                <div
                  key={tier.name}
                  data-animate
                  data-delay={String((i % 4) + 1)}
                  className={`relative flex flex-col rounded-2xl border p-7 ${
                    tier.highlighted
                      ? "border-[#1860D3] dark:border-[#6FA8FF] bg-[#FAF9F6] dark:bg-[#1A1A1A] shadow-xl shadow-[#1860D3]/10 lg:-translate-y-2"
                      : "border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#FAF9F6] dark:bg-[#1A1A1A]"
                  }`}
                >
                  {tier.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-[#1860D3] dark:bg-[#6FA8FF] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white dark:text-[#0A0A0A]">
                      <HugeiconsIcon icon={SparklesIcon} size={11} /> Most Popular
                    </span>
                  )}

                  <h3 className="font-heading text-[17px] font-bold text-[#0a0a0a] dark:text-[#FAF9F6] tracking-tight">
                    {tier.name}
                  </h3>

                  <div className="mt-4 flex items-end gap-1">
                    <span className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6]">
                      {p.big}
                    </span>
                    {p.suffix && <span className="mb-1 text-[14px] text-[#6B6B66] dark:text-[#9A9A92]">{p.suffix}</span>}
                  </div>
                  <p className="mt-1 h-4 text-[11px] text-[#9A9A92]">{p.sub}</p>

                  <IslandCta
                    to={tier.ctaHref}
                    variant={tier.highlighted ? "accent" : "primary"}
                    fullWidth
                    className="mt-6"
                  >
                    {tier.cta}
                  </IslandCta>

                  <div className="mt-6 space-y-1.5 border-t border-[#E5E1D6] dark:border-[#2A2A2A] pt-5 text-[12px] text-[#6B6B66] dark:text-[#9A9A92]">
                    <p className="font-semibold text-[#0a0a0a] dark:text-[#FAF9F6]">{tier.traces}</p>
                    <p>{tier.evals}</p>
                    <p>{tier.retention}</p>
                    <p>{tier.seats}</p>
                  </div>

                  <ul className="mt-5 space-y-2.5">
                    {tier.features.map((f) => (
                      <li key={f.label} className="flex items-start gap-2.5">
                        {f.included === true ? (
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]" />
                        ) : f.included === "locked" ? (
                          <HugeiconsIcon icon={SquareLock02Icon} size={14} className="mt-0.5 shrink-0 text-[#B8B3A6] dark:text-[#5A5A52]" />
                        ) : (
                          <HugeiconsIcon icon={Cancel01Icon} size={14} className="mt-0.5 shrink-0 text-[#C9C4B8] dark:text-[#4A4A44]" />
                        )}
                        <span className={`text-[12px] leading-snug ${
                          f.included === true
                            ? "text-[#0a0a0a] dark:text-[#E5E1D6]"
                            : "text-[#9A9A92] dark:text-[#6B6B66]"
                        }`}>
                          {f.label}
                          {f.included === "locked" && f.note && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-[#E8F0FD] dark:bg-[#1860D3]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#1860D3] dark:text-[#6FA8FF]">🔒 {f.note}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Comparison table ─────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20 bg-[#F2F0E9] dark:bg-[#0A0A0A]">
        <div className="mx-auto max-w-5xl px-6">
          <div data-animate className="mb-12 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1860D3] dark:text-[#6FA8FF] mb-4">
              Compare plans
            </p>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug">
              Every feature, side by side.
            </h2>
          </div>

          <div data-animate className="rounded-[1.75rem] bg-black/[0.04] p-2 ring-1 ring-black/[0.06] shadow-[0_30px_70px_-28px_rgba(24,96,211,0.18)] dark:bg-white/[0.04] dark:ring-white/10">
          <div className="overflow-x-auto rounded-[1.25rem] border border-[#E5E1D6] bg-[#FAF9F6] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:border-white/[0.06] dark:bg-[#1A1A1A] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E5E1D6] dark:border-[#2A2A2A]">
                  <th className="sticky left-0 bg-[#FAF9F6] dark:bg-[#1A1A1A] px-5 py-4 text-[13px] font-semibold text-[#0a0a0a] dark:text-[#FAF9F6]">Features</th>
                  {tiers.map((t) => (
                    <th key={t.name} className={`px-5 py-4 text-center text-[13px] font-semibold ${
                      t.highlighted ? "text-[#1860D3] dark:text-[#6FA8FF]" : "text-[#0a0a0a] dark:text-[#FAF9F6]"
                    }`}>
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((group) => (
                  <Fragment key={group.category}>
                    <tr className="bg-[#F2F0E9] dark:bg-[#0F0F0F]">
                      <td colSpan={5} className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6B66] dark:text-[#9A9A92]">
                        {group.category}
                      </td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={group.category + row.label} className="border-b border-[#EDE9DE] dark:border-[#222]">
                        <td className="sticky left-0 bg-[#FAF9F6] dark:bg-[#1A1A1A] px-5 py-3 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">{row.label}</td>
                        {row.values.map((v, idx) => (
                          <td key={idx} className="px-5 py-3 text-center">
                            {typeof v === "boolean" ? (
                              v ? (
                                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="inline text-[#1860D3] dark:text-[#6FA8FF]" />
                              ) : (
                                <HugeiconsIcon icon={Cancel01Icon} size={15} className="inline text-[#C9C4B8] dark:text-[#4A4A44]" />
                              )
                            ) : (
                              <span className="text-[13px] text-[#0a0a0a] dark:text-[#E5E1D6]">{v}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      </section>

      {/* ── Feature deep-dive (what you unlock) ──────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div data-animate className="mb-12 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1860D3] dark:text-[#6FA8FF] mb-4">
              What you unlock
            </p>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug">
              Two calls. <span className="text-[#1860D3] dark:text-[#6FA8FF]">Security and speed</span>, handled.
            </h2>
            <p className="mt-4 mx-auto max-w-lg text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
              <code className="rounded bg-[#E8F0FD] dark:bg-[#1860D3]/10 px-1.5 py-0.5 font-mono text-[12px] text-[#1860D3] dark:text-[#6FA8FF]">fluiq.optimize()</code>
              {" "}ships with Team, and{" "}
              <code className="rounded bg-[#E8F0FD] dark:bg-[#1860D3]/10 px-1.5 py-0.5 font-mono text-[12px] text-[#1860D3] dark:text-[#6FA8FF]">fluiq.secure()</code>
              {" "}unlocks on Growth.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {powerFeatures.map((feature, i) => (
              <div
                key={feature.name}
                data-animate
                data-delay={String(i + 1)}
                className="pillar-card rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#FAF9F6] dark:bg-[#1A1A1A] p-7"
              >
                <div className="flex items-start gap-4 mb-5">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#E8F0FD] dark:bg-[#1860D3]/10 text-[#1860D3] dark:text-[#6FA8FF]">
                    <HugeiconsIcon icon={feature.icon} size={19} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-heading text-[18px] font-bold text-[#0a0a0a] dark:text-[#FAF9F6] tracking-tight">
                        {feature.name}
                      </h3>
                      <span className="inline-flex items-center rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9] dark:bg-[#1A1A1A] px-2.5 py-0.5 text-[10px] font-medium text-[#6B6B66] dark:text-[#9A9A92]">
                        {feature.badge}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#1860D3] dark:text-[#6FA8FF] uppercase tracking-[0.08em]">
                      {feature.tagline}
                    </p>
                  </div>
                </div>

                <p className="text-[13px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-5">
                  {feature.description}
                </p>

                <ul className="space-y-2.5 mb-6">
                  {feature.capabilities.map((cap) => (
                    <li key={cap.label} className="flex items-start gap-2.5">
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        size={13}
                        className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]"
                      />
                      <div>
                        <span className="text-[12px] font-semibold text-[#0a0a0a] dark:text-[#FAF9F6]">{cap.label}</span>
                        <span className="text-[12px] text-[#6B6B66] dark:text-[#9A9A92]">: {cap.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="rounded-xl border border-[#1a1a1a] dark:border-[#2A2A2A] bg-[#0a0a0a] dark:bg-[#1A1A1A] overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[#1e1e1e] dark:border-[#2A2A2A]">
                    <HugeiconsIcon icon={PythonIcon} size={13} className="text-[#6B6B66]" />
                    <span className="text-[11px] text-[#6B6B66] font-mono">Python</span>
                  </div>
                  <CodeBlock variant="dark" preClassName="whitespace-pre-wrap" highlighted={syntaxHighlight(feature.code)}>{feature.code}</CodeBlock>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20 bg-[#F7F6F1] dark:bg-[#0D0D0D]">
        <div className="mx-auto max-w-3xl px-6">
          <div data-animate className="mb-12 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1860D3] dark:text-[#6FA8FF] mb-4">
              FAQ
            </p>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug">
              Frequently asked questions
            </h2>
          </div>
          <div className="grid gap-3">
            {faqs.map((f, i) => (
              <div
                key={f.q}
                data-animate
                data-delay={String((i % 4) + 1)}
                className="rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#FAF9F6] dark:bg-[#1A1A1A] px-6 py-5"
              >
                <h3 className="font-heading text-[15px] font-semibold text-[#0a0a0a] dark:text-[#FAF9F6] mb-2 tracking-tight">
                  {f.q}
                </h3>
                <p className="text-[14px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div data-animate>
            <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-[#0a0a0a] dark:bg-[#FAF9F6] text-white dark:text-[#0A0A0A] mb-6">
              <HugeiconsIcon icon={SparklesIcon} size={22} />
            </div>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] md:text-5xl">
              Ship safer AI, <span className="text-[#1860D3] dark:text-[#6FA8FF]">faster.</span>
            </h2>
            <p className="mt-4 text-[16px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed max-w-xl mx-auto">
              Start free, then add security and scale when you need it.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <IslandCta to="/signup">Start free</IslandCta>
              <IslandCta to="/contact" variant="ghost">Talk to sales</IslandCta>
            </div>
            <p className="mt-5 text-[12px] text-[#9A9A92]">
              No credit card required on Free and Team plans.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />

    </div>
  )
}
