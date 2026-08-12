"use client"

import "@/styles/pricing.css";
import { useState, Fragment } from "react"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  SparklesIcon,
  ShieldKeyIcon,
  TestTube01Icon,
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
  scans: string
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
    traces: "Unlimited traces",
    scans: "1,000 security scans / month",
    evals: "100 evaluations / month",
    seats: "1 seat",
    retention: "14-day trace retention",
    cta: "Start free",
    ctaHref: "/signup",
    highlighted: false,
    features: [
      { label: "Full observability, no trace cap", included: true },
      { label: "Full security scanning, warn or block mode", included: true },
      { label: "Agentic evaluation (tool selection, trajectory)", included: true },
      { label: "Trace explorer & live dashboard", included: true },
      { label: "Community support", included: true },
      { label: "Bring your own provider keys", included: true },
      { label: "Choose your judge model", included: true },
      { label: "Multi-model judge jury", included: "locked", note: "Paid" },
    ],
  },
  {
    name: "Starter",
    price: { monthly: 29, annual: 290 },
    traces: "Unlimited traces",
    scans: "50,000 security scans / month",
    evals: "2,000 evaluations / month",
    seats: "3 seats",
    retention: "Unlimited trace retention",
    cta: "Start 5-day free trial",
    ctaHref: "/signup",
    highlighted: false,
    features: [
      { label: "Everything in Free", included: true },
      { label: "Multi-model judge jury with audit trail", included: true },
      { label: "CI/CD eval gates", included: true },
      { label: "Slack anomaly alerts", included: true },
    ],
  },
  {
    name: "Team",
    price: { monthly: 149, annual: 1490 },
    traces: "Unlimited traces",
    scans: "500,000 security scans / month",
    evals: "10,000 evaluations / month",
    seats: "10 seats",
    retention: "Unlimited trace retention",
    cta: "Start 5-day free trial",
    ctaHref: "/signup",
    highlighted: true,
    features: [
      { label: "Everything in Starter", included: true },
      { label: "SSO (single sign-on)", included: true },
      { label: "Custom eval thresholds & judge prompts", included: true },
      { label: "Email support (48h SLA)", included: true },
    ],
  },
  {
    name: "Growth",
    price: { monthly: 499, annual: 4990 },
    traces: "Unlimited traces",
    scans: "2,000,000 security scans / month",
    evals: "50,000 evaluations / month",
    seats: "25 seats",
    retention: "Unlimited trace retention",
    cta: "Start 5-day free trial",
    ctaHref: "/signup",
    highlighted: false,
    features: [
      { label: "Everything in Team", included: true },
      { label: "Volume discount on overage", included: true },
      { label: "Priority support (24h SLA)", included: true },
    ],
  },
  {
    name: "Enterprise",
    price: { monthly: "custom", annual: "custom" },
    traces: "Unlimited traces",
    scans: "Unlimited security scans",
    evals: "Unlimited evaluations",
    seats: "Unlimited seats",
    retention: "Unlimited trace retention",
    cta: "Talk to us",
    ctaHref: "/contact",
    highlighted: false,
    features: [
      { label: "Everything in Growth", included: true },
      { label: "VPC / on-prem deployment", included: true },
      { label: "SAML / SCIM provisioning", included: true },
      { label: "Audit logs & compliance exports", included: true },
      { label: "Custom SLA & dedicated support", included: true },
    ],
  },
]

// Rates beyond the included allowance. Priced per depth because depth is what
// actually drives cost: a deep run convenes a jury and reads the whole
// trajectory, a fast one runs deterministic checks plus one judge call.
const usageRates: { label: string; price: string; detail: string }[] = [
  { label: "LLM evaluation", price: "$0.007", detail: "Single judge: relevance, faithfulness, hallucination" },
  { label: "Agentic eval, fast", price: "$0.015", detail: "Deterministic checks and tool selection" },
  { label: "Agentic eval, standard", price: "$0.065", detail: "Adds trajectory and multi-agent coordination" },
  { label: "Agentic eval, deep", price: "$0.545", detail: "Adds a multi-model jury with a per-juror audit trail" },
  { label: "Security scan", price: "$0.0005", detail: "Pattern and NER based, so no judge tokens at all" },
]

type Cell = string | boolean
const comparison: { category: string; rows: { label: string; values: [Cell, Cell, Cell, Cell, Cell] }[] }[] = [
  {
    category: "Security",
    rows: [
      { label: "Security scans / month included", values: ["1,000", "50,000", "500,000", "2,000,000", "Unlimited"] },
      { label: "Prompt injection detection", values: [true, true, true, true, true] },
      { label: "Jailbreak & skeleton-key detection", values: [true, true, true, true, true] },
      { label: "Semantic attack scoring", values: [true, true, true, true, true] },
      { label: "PII detection & redaction", values: [true, true, true, true, true] },
      { label: "Secret leak prevention", values: [true, true, true, true, true] },
      { label: "Indirect injection detection", values: [true, true, true, true, true] },
      { label: "RAG poisoning detection", values: [true, true, true, true, true] },
      { label: "Tool-input exfiltration & allowlist enforcement", values: [true, true, true, true, true] },
      { label: "Cross-agent injection & trust-boundary escalation", values: [true, true, true, true, true] },
      { label: "Image & multimodal scanning", values: [true, true, true, true, true] },
      { label: "Warn or block mode", values: [true, true, true, true, true] },
      { label: "Custom guardrail policies", values: [false, true, true, true, true] },
    ],
  },
  {
    category: "Observability",
    rows: [
      { label: "Traces / month", values: ["Unlimited", "Unlimited", "Unlimited", "Unlimited", "Unlimited"] },
      { label: "Trace retention", values: ["14 days", "Unlimited", "Unlimited", "Unlimited", "Unlimited"] },
      { label: "Live dashboard & trace explorer", values: [true, true, true, true, true] },
      { label: "Per-node token & cost attribution", values: [true, true, true, true, true] },
      { label: "p50 / p95 / p99 latency tracking", values: [true, true, true, true, true] },
      { label: "Spend breakdown by provider & model", values: [true, true, true, true, true] },
      { label: "Multi-agent DAG rendering (LangGraph, CrewAI, ADK)", values: [true, true, true, true, true] },
      { label: "Agent summaries & per-run rollups", values: [true, true, true, true, true] },
      { label: "Streaming traces", values: [true, true, true, true, true] },
      { label: "Multimodal trace capture (images, audio)", values: [true, true, true, true, true] },
      { label: "Import from LangSmith, Langfuse, Phoenix, Braintrust", values: [true, true, true, true, true] },
      { label: "Tamper-evident audit log", values: [true, true, true, true, true] },
    ],
  },
  {
    category: "Evaluation",
    rows: [
      { label: "Evals / month included", values: ["100", "2,000", "10,000", "50,000", "Unlimited"] },
      { label: "LLM-as-judge metrics", values: [true, true, true, true, true] },
      { label: "Agentic evaluation: tool selection & trajectory", values: [true, true, true, true, true] },
      { label: "Multi-agent coordination scoring", values: [true, true, true, true, true] },
      { label: "Depth control (fast / standard / deep)", values: [true, true, true, true, true] },
      { label: "Choose your judge model", values: [true, true, true, true, true] },
      { label: "Bring your own provider keys (BYOK)", values: [true, true, true, true, true] },
      { label: "Transparent judge prompts (exact prompt & version on every score)", values: [true, true, true, true, true] },
      { label: "Vision / multimodal judging", values: [true, true, true, true, true] },
      { label: "Warn & block eval modes", values: [true, true, true, true, true] },
      { label: "End-user feedback & team annotations", values: [true, true, true, true, true] },
      { label: "Multi-model judge jury with per-juror audit trail", values: [false, true, true, true, true] },
      { label: "CI/CD eval gates (python -m fluiq.ci)", values: [false, true, true, true, true] },
      { label: "Custom eval thresholds", values: [false, false, true, true, true] },
      { label: "Editable judge prompts (per-org overrides)", values: [false, false, true, true, true] },
      { label: "Custom client judges (your own prompt as a scorer)", values: [false, false, true, true, true] },
      { label: "Pay-as-you-go beyond the allowance", values: [false, true, true, true, "Committed"] },
    ],
  },
  {
    category: "Evaluation · Prompt management",
    rows: [
      { label: "Versioned prompt registry", values: [true, true, true, true, true] },
      { label: "Fetch by slug from the SDK", values: [true, true, true, true, true] },
      { label: "Version history & one-click restore", values: [true, true, true, true, true] },
      { label: "Environment deploys (dev / staging / prod)", values: [true, true, true, true, true] },
      { label: "Prompts reusable as custom judges", values: [false, false, true, true, true] },
    ],
  },
  {
    category: "Evaluation · Datasets",
    rows: [
      { label: "Golden datasets built from traces", values: [true, true, true, true, true] },
      { label: "Whole-trajectory capture (steps, tools, MCP, media)", values: [true, true, true, true, true] },
      { label: "Connect Agents auto-sync", values: [true, true, true, true, true] },
      { label: "Batch eval & security runs over a dataset", values: [true, true, true, true, true] },
      { label: "Run-vs-run regression comparison", values: [true, true, true, true, true] },
      { label: "Per-run judge & jury selection", values: [false, true, true, true, true] },
    ],
  },
  {
    category: "Team & Access",
    rows: [
      { label: "Seats", values: ["1", "3", "10", "25", "Unlimited"] },
      { label: "API keys", values: ["1", "3", "5", "15", "50"] },
      { label: "Multiple organizations", values: [true, true, true, true, true] },
      { label: "Teammate invitations & roles", values: [false, true, true, true, true] },
      { label: "SSO", values: [false, false, true, true, true] },
      { label: "SAML / SCIM provisioning", values: [false, false, false, false, true] },
      { label: "Compliance exports", values: [false, false, false, false, true] },
    ],
  },
  {
    category: "Support",
    rows: [
      { label: "Community support", values: [true, true, true, true, true] },
      { label: "Slack alerts on eval & security events", values: [false, true, true, true, true] },
      { label: "Email support", values: [false, "72h SLA", "48h SLA", "24h SLA", "Dedicated"] },
      { label: "Dedicated onboarding", values: [false, false, false, false, true] },
    ],
  },
  {
    category: "Deployment",
    rows: [
      { label: "Cloud (managed)", values: [true, true, true, true, true] },
      { label: "VPC / on-prem", values: [false, false, false, false, true] },
    ],
  },
]

const powerFeatures = [
  {
    icon: ShieldKeyIcon,
    name: "fluiq.secure()",
    badge: "On every plan, including Free",
    tagline: "One call. Full pipeline protection.",
    description:
      "Wrap your pipeline with server-side security scanning before any data is stored. Fluiq checks every prompt, response, tool call, and retrieved document, so attack patterns are never shipped in the public SDK.",
    capabilities: [
      { label: "PII Detection & Redaction", desc: "Names, emails, phone numbers, SSNs, and credit cards, detected and redacted before persistence." },
      { label: "Prompt Injection Blocking", desc: "Catches injection patterns in real time, before the prompt reaches your model." },
      { label: "Jailbreak & Skeleton Key Detection", desc: "Dedicated scanners for jailbreak framings and skeleton-key attacks that try to unlock restricted behaviour." },
      { label: "Semantic Attack Scoring", desc: "Similarity scoring against known attack vectors, so a reworded attack still scores as one." },
      { label: "Secret Leak Prevention", desc: "Scans model output for leaked API keys, tokens, and high-entropy credential strings." },
      { label: "Indirect Injection & RAG Poisoning", desc: "Inspects tool outputs and retrieved chunks for second-order injection, and flags documents that read like an attack." },
      { label: "Tool Abuse Defense", desc: "Catches sensitive data exfiltrated through tool-call arguments, and tools invoked outside your allowlist." },
      { label: "Multi-Agent Trust", desc: "Detects cross-agent injection and risk escalating across agent handoffs in the trace DAG." },
      { label: "Image & Multimodal Scanning", desc: "Images and other media attached to a call are scanned alongside the text." },
      { label: "Custom Guardrail Policies", desc: "Set your own thresholds and categories per organisation instead of taking the defaults." },
      { label: "Warn or Block mode", desc: "warn (default) flags risks and attaches security metadata to the trace. block intercepts before the LLM call and raises FluiqSecurityError." },
    ],
    code: `fluiq.instrument(api_key="fl_...")\nfluiq.secure()  # warn mode flags risks on the trace\nfluiq.secure(mode="block")  # block mode`,
  },
  {
    icon: TestTube01Icon,
    name: "fluiq.eval()",
    badge: "On every plan, including Free",
    tagline: "One call. Every answer scored.",
    description:
      "Scoring runs server-side on traces Fluiq already has. Single responses get LLM-as-judge metrics; whole agent runs get judged on the decisions they made; golden datasets turn both into a regression gate.",
    capabilities: [
      { label: "Six Judge Metrics", desc: "Hallucination, faithfulness, relevance, toxicity, coherence, and completeness, scored per response." },
      { label: "Per-Metric Thresholds", desc: "Set a gate for each metric. warn logs the score on the trace; block raises FluiqEvalError before the response reaches your app." },
      { label: "Agentic Evaluation", desc: "Judges a whole run in layers: deterministic checks, tool-selection quality, trajectory against the goal, and multi-agent coordination across the DAG." },
      { label: "Multi-Model Jury", desc: "Borderline verdicts convene a panel of different judge models, with every member's score and reasoning kept for audit." },
      { label: "Your Judge, Your Keys", desc: "Choose which model judges and which models sit on the panel, and bring your own provider key so judge tokens bill at the rate you negotiated." },
      { label: "Dataset Regression Runs", desc: "Batch the same judges over a golden dataset of pinned trajectories, then diff one run against another to see exactly what got worse." },
      { label: "Prompt Management", desc: "Version and deploy prompt templates, and promote any saved prompt to a custom judge by slug." },
      { label: "Auditable Prompts", desc: "Every result carries the exact judge prompt and version that produced it, so a shifting metric traces back to a prompt change." },
    ],
    code: `fluiq.instrument(api_key="fl_...")
fluiq.eval(thresholds={"hallucination": 0.8})  # warn mode
fluiq.eval(thresholds={"hallucination": 0.8}, mode="block")`,
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
            Unlimited tracing on every plan, free forever — no trace, span, or agent cap. Security scanning is on every plan too, including Free. You pay for how long traces are kept and how much you evaluate and scan.
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
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {tiers.map((tier, i) => {
              const p = priceLabel(tier, annual)
              return (
                <div
                  key={tier.name}
                  data-animate
                  data-delay={String((i % 5) + 1)}
                  className={`relative flex h-full flex-col rounded-2xl border p-7 ${
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

                  <div className="mt-6 shrink-0 space-y-1.5 border-t border-[#E5E1D6] dark:border-[#2A2A2A] pt-5 text-[12px] text-[#6B6B66] dark:text-[#9A9A92]">
                    <p className="font-semibold text-[#0a0a0a] dark:text-[#FAF9F6]">{tier.traces}</p>
                    <p>{tier.scans}</p>
                    <p>{tier.evals}</p>
                    <p>{tier.retention}</p>
                    <p>{tier.seats}</p>
                  </div>

                  <ul className="mt-5 flex-1 space-y-2.5">
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

      {/* ── Usage rates ──────────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div data-animate className="mb-10 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1860D3] dark:text-[#6FA8FF] mb-4">
              Beyond your allowance
            </p>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug">
              Priced by what an evaluation actually costs
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
              A three-model jury reading a forty-step trajectory is not the same
              work as one relevance check, so it is not the same price. Most
              tools bill both as &ldquo;one evaluation&rdquo;. Bring your own
              provider keys and you pay the platform rate only.
            </p>
          </div>

          <div
            data-animate
            className="overflow-hidden rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#FAF9F6] dark:bg-[#1A1A1A]"
          >
            {usageRates.map((r, i) => (
              <div
                key={r.label}
                className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 py-4 ${
                  i > 0 ? "border-t border-[#E5E1D6] dark:border-[#2A2A2A]" : ""
                }`}
              >
                <div className="min-w-[220px] flex-1">
                  <p className="text-[15px] font-medium text-[#0a0a0a] dark:text-[#FAF9F6]">
                    {r.label}
                  </p>
                  <p className="mt-0.5 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">
                    {r.detail}
                  </p>
                </div>
                <p className="font-mono text-[15px] font-semibold text-[#1860D3] dark:text-[#6FA8FF]">
                  {r.price}
                  <span className="ml-1 text-[12px] font-normal text-[#6B6B66] dark:text-[#9A9A92]">
                    each
                  </span>
                </p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-center text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">
            Every price includes the judge tokens. Connect your own OpenAI,
            Anthropic, or Google key and those tokens bill to your provider
            account instead, at whatever rate you already negotiated.
          </p>
        </div>
      </section>

      {/* ── Comparison table ─────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20 bg-[#F2F0E9] dark:bg-[#0A0A0A]">
        <div className="mx-auto max-w-6xl px-6">
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
            <table className="w-full min-w-[820px] border-collapse text-left">
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
              Two calls. <span className="text-[#1860D3] dark:text-[#6FA8FF]">Safety and quality</span>, handled.
            </h2>
            <p className="mt-4 mx-auto max-w-lg text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
              <code className="rounded bg-[#E8F0FD] dark:bg-[#1860D3]/10 px-1.5 py-0.5 font-mono text-[12px] text-[#1860D3] dark:text-[#6FA8FF]">fluiq.secure()</code>
              {" "}and{" "}
              <code className="rounded bg-[#E8F0FD] dark:bg-[#1860D3]/10 px-1.5 py-0.5 font-mono text-[12px] text-[#1860D3] dark:text-[#6FA8FF]">fluiq.eval()</code>
              {" "}both run on every plan, including Free.
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

      {/* ── FAQ link ─────────────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-16 bg-[#F7F6F1] dark:bg-[#0D0D0D]">
        <div className="mx-auto max-w-3xl px-6 text-center" data-animate>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] md:text-3xl">
            Questions about billing, evals, or security?
          </h2>
          <p className="mt-3 text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
            What counts as an evaluation, how the judge jury is priced, what
            happens when you bring your own provider keys, and where your data
            lives.
          </p>
          <a
            href="/faq"
            className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#1860D3] transition-opacity hover:opacity-80 dark:text-[#6FA8FF]"
          >
            Read the FAQ
            <span aria-hidden="true">&rarr;</span>
          </a>
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
