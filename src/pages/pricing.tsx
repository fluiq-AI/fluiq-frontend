import { useState, useEffect } from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  ArrowRight02Icon,
  Building01Icon,
  CheckmarkCircle02Icon,
  GiftIcon,
  RocketIcon,
  SparklesIcon,
  ChartLineData01Icon,
  ShieldKeyIcon,
  UserIcon,
  InformationCircleIcon,
  FlashIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-visible", "true")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    )
    const els = document.querySelectorAll("[data-animate]")
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

const tiers = [
  {
    name: "Free",
    icon: GiftIcon,
    price: "$0",
    cadence: "forever",
    description: "Full observability for your first pipeline. No credit card required.",
    cta: { label: "Start for free", to: "/signup" },
    featured: false,
    note: "5M traces is a lifetime cap, not monthly. Dashboards stay read-only after you hit it.",
    features: [
      { text: "5M traces (lifetime total)", included: true },
      { text: "1,000 LLM-as-judge evals / month", included: true },
      { text: "1 seat", included: true },
      { text: "OpenAI, Anthropic, Gemini, LangChain, LangGraph, CrewAI, Google ADK", included: true },
      { text: "Trace explorer & live dashboard", included: true },
      { text: "CI/CD eval gates", included: true },
      { text: "7-day trace retention", included: true },
      { text: "fluiq.secure() — security scanning", included: false },
      { text: "fluiq.optimize() — response caching", included: false },
      { text: "Community support", included: true },
    ],
  },
  {
    name: "Starter",
    icon: UserIcon,
    price: "$149",
    cadence: "per workspace / month",
    description: "Unlimited tracing for solo developers and small teams who've outgrown the free cap.",
    cta: { label: "Start 14-day trial", to: "/signup" },
    featured: false,
    note: null,
    features: [
      { text: "Unlimited tracing", included: true },
      { text: "5,000 LLM-as-judge evals / month", included: true },
      { text: "3 seats", included: true },
      { text: "Everything in Free", included: true },
      { text: "30-day trace retention", included: true },
      { text: "fluiq.secure() — security scanning", included: false },
      { text: "fluiq.optimize() — response caching", included: false },
      { text: "Priority email support", included: true },
    ],
  },
  {
    name: "Team",
    icon: RocketIcon,
    price: "$499",
    cadence: "per workspace / month",
    description: "Security scanning and response caching for teams shipping production-grade AI pipelines.",
    cta: { label: "Start 14-day trial", to: "/signup" },
    featured: true,
    note: null,
    features: [
      { text: "Unlimited tracing", included: true },
      { text: "20,000 LLM-as-judge evals / month", included: true },
      { text: "10 seats ($49 / extra seat)", included: true },
      { text: "Everything in Starter", included: true },
      { text: "fluiq.secure() — PII, injection & jailbreak blocking, secret scanning", included: true },
      { text: "fluiq.optimize() — trace-driven response caching", included: true },
      { text: "Anomaly alerts to Slack", included: true },
      { text: "90-day trace retention", included: true },
      { text: "Priority support", included: true },
    ],
  },
  {
    name: "Growth",
    icon: ChartLineData01Icon,
    price: "$1,499",
    cadence: "per workspace / month",
    description: "Higher eval throughput, longer retention, and custom evaluators for production-scale pipelines.",
    cta: { label: "Start 14-day trial", to: "/signup" },
    featured: false,
    note: null,
    features: [
      { text: "Unlimited tracing", included: true },
      { text: "100,000 LLM-as-judge evals / month", included: true },
      { text: "20 seats ($39 / extra seat)", included: true },
      { text: "Everything in Team", included: true },
      { text: "Custom evaluators & metric pipelines", included: true },
      { text: "180-day trace retention", included: true },
      { text: "Priority Slack support", included: true },
    ],
  },
  {
    name: "Enterprise",
    icon: Building01Icon,
    price: "Custom",
    cadence: "annual contract",
    description: "Compliance, on-prem deployment, and a dedicated success engineer.",
    cta: { label: "Talk to sales", to: "#contact" },
    featured: false,
    note: null,
    features: [
      { text: "Unlimited tracing & evaluations", included: true },
      { text: "Unlimited seats & workspaces", included: true },
      { text: "Everything in Growth", included: true },
      { text: "SSO / SAML & SCIM provisioning", included: true },
      { text: "VPC or on-prem deployment", included: true },
      { text: "Custom data retention & residency", included: true },
      { text: "Audit logs & role-based access", included: true },
      { text: "Dedicated Slack channel & SLA", included: true },
    ],
  },
]

const powerFeatures = [
  {
    icon: ShieldKeyIcon,
    name: "fluiq.secure()",
    badge: "Included in Team and above",
    tagline: "One call. Full pipeline protection.",
    description:
      "Wrap your pipeline with server-side security scanning before any data is stored. Fluiq checks every prompt and response — so attack patterns are never shipped in the public SDK.",
    capabilities: [
      { label: "PII Detection & Redaction", desc: "Names, emails, phone numbers, SSNs, credit cards — detected and redacted before persistence." },
      { label: "Prompt Injection Blocking", desc: "Catches injection patterns, jailbreak attempts, and skeleton key attacks in real time." },
      { label: "Jailbreak & Semantic Attack Scoring", desc: "Semantic similarity scoring against known attack vectors, even when phrasing varies." },
      { label: "Secret Leak Prevention", desc: "Scans LLM outputs for leaked API keys, tokens, and high-entropy credential strings." },
      { label: "Indirect Injection Detection", desc: "Inspects tool outputs and context documents for second-order injection hidden in retrieved content." },
      { label: "Warn or Block mode", desc: "warn (default) flags risks and attaches security metadata to the trace. block intercepts before the LLM call and raises FluiqSecurityError." },
    ],
    code: `fluiq.instrument(api_key="fl_...")\nfluiq.secure()  # warn mode — flags risks on the trace\nfluiq.secure(mode="block")  # block mode — pre-call guard`,
  },
  {
    icon: FlashIcon,
    name: "fluiq.optimize()",
    badge: "Included in Team and above",
    tagline: "Serve repeated prompts from cache.",
    description:
      "Fluiq analyses your historical traces to find which LLM calls repeat most often and provisions a dedicated Redis cache for your account. Repeated prompts are served instantly — saving both latency and cost.",
    capabilities: [
      { label: "Trace-Driven Cache Profiling", desc: "The backend mines your trace history to build a cache profile — no manual configuration needed." },
      { label: "Automatic Cache Population", desc: "Real LLM responses are stored automatically on the first call; subsequent matches are served from Redis." },
      { label: "Cache mode", desc: "Full interception: matching prompts never reach the LLM API." },
      { label: "Observe mode", desc: "Records what would have been a cache hit without intercepting — review your savings before opting in." },
      { label: "Zero code changes", desc: "One fluiq.optimize() call after instrument(). The SDK handles connection, profiling, and cache lookup." },
      { label: "Cache hit dashboard", desc: "See hit rates, latency savings, and estimated cost savings in your Fluiq dashboard." },
    ],
    code: `fluiq.instrument(api_key="fl_...")\nfluiq.optimize()  # cache mode — full interception\nfluiq.optimize(mode="observe")  # observe mode — measure savings`,
  },
]

const faqs = [
  {
    q: "What counts as a trace?",
    a: "One traced span — typically one LLM call, one retriever call, or one decorated function invocation. A single end-to-end agent run usually emits 5–20 traces depending on how many tools and LLM calls it makes.",
  },
  {
    q: "Which frameworks does Fluiq support?",
    a: "Fluiq instruments at the function-call level and ships integrations for OpenAI, Anthropic, Gemini, LangChain, LangGraph, CrewAI, Google ADK, and raw HTTP calls via the @trace decorator. Streaming, tool calls, thinking tokens, and MCP servers are all captured automatically.",
  },
  {
    q: "What counts as an evaluation?",
    a: "One LLM-as-judge scoring call — e.g. a hallucination check on an answer or a relevance score over a retrieved chunk set. Metrics include hallucination, faithfulness, relevance, toxicity, coherence, and completeness. Each retrieval trace runs one evaluation by default; you can disable auto-eval per workspace.",
  },
  {
    q: "What happens after I hit 5M traces on the free tier?",
    a: "Tracing pauses and your dashboards stay accessible read-only. You can upgrade to Starter or Team at any time to resume ingestion — no data is lost. The 5M cap is a lifetime total, not a monthly limit.",
  },
  {
    q: "What is the difference between Starter and Team?",
    a: "Starter lifts the trace cap and increases the eval quota. Team unlocks fluiq.secure() (PII detection, injection blocking, secret scanning) and fluiq.optimize() (trace-driven response caching) — the features that make production pipelines safe and fast.",
  },
  {
    q: "How does fluiq.secure() work?",
    a: "fluiq.secure() runs server-side — attack patterns are never shipped in the public SDK. In warn mode (default) it flags risks and attaches security metadata to the trace without blocking execution. In block mode it adds a pre-call guard that raises FluiqSecurityError before the LLM call is made if a HIGH-risk pattern is detected.",
  },
  {
    q: "How does fluiq.optimize() work?",
    a: "After you call fluiq.optimize(), the SDK fetches your trace-derived cache profile from the Fluiq backend, connects to a dedicated Redis instance provisioned for your account, and begins serving repeated prompts from cache. In observe mode it records what would have been a cache hit so you can review projected savings before enabling full interception.",
  },
  {
    q: "What happens after I hit my evaluation limit?",
    a: "Auto-evaluation pauses for the rest of the billing cycle, but tracing keeps running uninterrupted. Existing scores stay queryable in the dashboard. Upgrading your plan immediately lifts the cap.",
  },
  {
    q: "Do you support self-hosting?",
    a: "VPC and on-prem deployments are available on the Enterprise tier. The SDK is a thin instrumentation layer and can be pointed at your own backend endpoint if you prefer full self-hosting.",
  },
  {
    q: "Can I switch frameworks later?",
    a: "Yes. Because Fluiq instruments at the call level, the same SDK works across all supported frameworks simultaneously. Switching from LangChain to LangGraph, or adding a new provider, requires no changes to your instrumentation.",
  },
]

export default function Pricing() {
  useScrollReveal()
  const [navScrolled, setNavScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">

      {/* ── Keyframe styles ─────────────────────────────────────────── */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .hero-badge { animation: fadeIn 0.5s ease both; }
        .hero-h1    { animation: fadeUp 0.7s ease 0.1s both; }
        .hero-sub   { animation: fadeUp 0.7s ease 0.2s both; }

        [data-animate] {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.65s cubic-bezier(0.16,1,0.3,1),
                      transform 0.65s cubic-bezier(0.16,1,0.3,1);
        }
        [data-animate][data-visible="true"] {
          opacity: 1;
          transform: translateY(0);
        }
        [data-delay="1"] { transition-delay: 0.08s; }
        [data-delay="2"] { transition-delay: 0.16s; }
        [data-delay="3"] { transition-delay: 0.24s; }
        [data-delay="4"] { transition-delay: 0.32s; }
        [data-delay="5"] { transition-delay: 0.40s; }

        .pillar-card {
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        .pillar-card:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }
        .cta-btn {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .cta-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .cta-btn:active { transform: translateY(0); }

        @media (prefers-reduced-motion: reduce) {
          *, [data-animate], .hero-badge, .hero-h1, .hero-sub {
            animation: none !important;
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          navScrolled
            ? "bg-[#FAF9F6]/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#E5E1D6] dark:border-[#2A2A2A]"
            : "bg-[#FAF9F6] dark:bg-[#0A0A0A] border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Fluiq" className="size-7" />
            <span className="font-heading text-[15px] font-semibold tracking-tight">Fluiq</span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] text-[#6B6B66] dark:text-[#9A9A92] md:flex">
            <Link to="/" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Platform</Link>
            <Link to="/pricing" className="text-[#0a0a0a] dark:text-[#FAF9F6] font-medium">Pricing</Link>
            <Link to="/documentation" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Docs</Link>
            <Link to="/contact" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="text-[#6B6B66] dark:text-[#9A9A92] hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6]" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button size="sm" className="cta-btn bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9]" asChild>
              <Link to="/signup">
                Get started
                <HugeiconsIcon icon={ArrowRight02Icon} size={14} />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="hero-badge mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9] dark:bg-[#1A1A1A] px-4 py-1.5 text-[12px] font-medium text-[#6B6B66] dark:text-[#9A9A92] tracking-wide">
              <span className="size-1.5 rounded-full bg-[#0a0a0a] dark:bg-[#F5F5F5] inline-block" />
              Simple, transparent pricing
            </span>
          </div>
          <h1 className="hero-h1 font-heading mx-auto max-w-3xl text-5xl font-bold tracking-[-0.03em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.08] md:text-6xl">
            Free to start.<br className="hidden md:block" /> Secure and fast at scale.
          </h1>
          <p className="hero-sub mt-6 mx-auto max-w-xl text-[17px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
            Full tracing, evaluations, and dashboards are free up to 5M traces. Upgrade to Team for
            security scanning and response caching — the features production pipelines actually need.
          </p>
        </div>
      </section>

      {/* ── Pricing tiers ────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {tiers.map((tier, i) => (
              <div
                key={tier.name}
                data-animate
                data-delay={String((i % 5) + 1)}
                className={`pillar-card relative flex flex-col rounded-2xl border bg-[#FAF9F6] dark:bg-[#1A1A1A] p-6 ${
                  tier.featured
                    ? "border-[#0a0a0a] dark:border-[#F5F5F5] shadow-lg"
                    : "border-[#E5E1D6] dark:border-[#2A2A2A]"
                }`}
              >
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0a0a0a] dark:bg-[#F5F5F5] px-3 py-1 text-[11px] font-semibold text-white dark:text-[#0A0A0A] tracking-wide">
                      Most popular
                    </span>
                  </div>
                )}

                {/* Icon + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="grid size-9 place-items-center rounded-xl bg-[#F2F0E9] dark:bg-[#252525] text-[#0a0a0a] dark:text-[#FAF9F6]">
                    <HugeiconsIcon icon={tier.icon} size={17} />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9A9A92] dark:text-[#9A9A92]">
                    {tier.name}
                  </span>
                </div>

                {/* Price */}
                <div className="mb-2 flex items-baseline gap-1.5">
                  <span className="font-heading text-4xl font-bold text-[#0a0a0a] dark:text-[#FAF9F6] tracking-tight">
                    {tier.price}
                  </span>
                </div>
                <p className="mb-1 text-[11px] text-[#9A9A92] dark:text-[#9A9A92]">{tier.cadence}</p>
                <p className="mb-5 text-[13px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">{tier.description}</p>

                {/* CTA */}
                <Button
                  size="sm"
                  className={`cta-btn w-full mb-5 ${
                    tier.featured
                      ? "bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9]"
                      : "border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#FAF9F6] dark:bg-transparent text-[#0a0a0a] dark:text-[#FAF9F6] hover:bg-[#F2F0E9] dark:hover:bg-[#1A1A1A]"
                  }`}
                  variant={tier.featured ? "default" : "outline"}
                  asChild
                >
                  <Link to={tier.cta.to}>
                    {tier.cta.label}
                    <HugeiconsIcon icon={ArrowRight02Icon} size={13} />
                  </Link>
                </Button>

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {tier.features.map((f) => (
                    <li key={f.text} className={`flex items-start gap-2 text-[12px] ${f.included ? "text-[#6B6B66] dark:text-[#9A9A92]" : "text-[#D4CFC1] dark:text-[#3A3A3A]"}`}>
                      {f.included ? (
                        <HugeiconsIcon
                          icon={CheckmarkCircle02Icon}
                          size={13}
                          className="mt-0.5 shrink-0 text-[#0a0a0a] dark:text-[#FAF9F6]"
                        />
                      ) : (
                        <HugeiconsIcon
                          icon={Cancel01Icon}
                          size={13}
                          className="mt-0.5 shrink-0 text-[#D4CFC1] dark:text-[#333333]"
                        />
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>

                {/* Note */}
                {tier.note && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] px-3 py-2.5">
                    <HugeiconsIcon
                      icon={InformationCircleIcon}
                      size={13}
                      className="mt-0.5 shrink-0 text-[#9A9A92] dark:text-[#9A9A92]"
                    />
                    <p className="text-[11px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">{tier.note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Power features — Team and above ──────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20 bg-[#F2F0E9] dark:bg-[#0A0A0A]">
        <div className="mx-auto max-w-5xl px-6">
          <div data-animate className="mb-12 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9A9A92] dark:text-[#9A9A92] mb-4">
              Team plan and above
            </p>
            <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug">
              Two calls. Security and speed, handled.
            </h2>
            <p className="mt-4 mx-auto max-w-lg text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
              <code className="rounded bg-[#F2F0E9] dark:bg-[#252525] px-1.5 py-0.5 font-mono text-[12px] text-[#6B6B66] dark:text-[#9A9A92]">fluiq.secure()</code>
              {" "}and{" "}
              <code className="rounded bg-[#F2F0E9] dark:bg-[#252525] px-1.5 py-0.5 font-mono text-[12px] text-[#6B6B66] dark:text-[#9A9A92]">fluiq.optimize()</code>
              {" "}are included in every Team workspace — no add-on required.
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
                {/* Header */}
                <div className="flex items-start gap-4 mb-5">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F2F0E9] dark:bg-[#252525] text-[#0a0a0a] dark:text-[#FAF9F6]">
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
                    <p className="text-[12px] font-semibold text-[#9A9A92] dark:text-[#9A9A92] uppercase tracking-wide">
                      {feature.tagline}
                    </p>
                  </div>
                </div>

                <p className="text-[13px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-5">
                  {feature.description}
                </p>

                {/* Capabilities */}
                <ul className="space-y-2.5 mb-6">
                  {feature.capabilities.map((cap) => (
                    <li key={cap.label} className="flex items-start gap-2.5">
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        size={13}
                        className="mt-0.5 shrink-0 text-[#0a0a0a] dark:text-[#FAF9F6]"
                      />
                      <div>
                        <span className="text-[12px] font-semibold text-[#0a0a0a] dark:text-[#FAF9F6]">{cap.label}</span>
                        <span className="text-[12px] text-[#6B6B66] dark:text-[#9A9A92]"> — {cap.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Code snippet */}
                <pre className="rounded-xl bg-[#F2F0E9] dark:bg-[#1A1A1A] px-4 py-3 font-mono text-[11px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed whitespace-pre-wrap break-all">
                  {feature.code}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div data-animate className="mb-12 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9A9A92] dark:text-[#9A9A92] mb-4">
              FAQ
            </p>
            <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug">
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

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div data-animate>
            <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-[#0a0a0a] dark:bg-[#FAF9F6] text-white dark:text-[#0A0A0A] mb-6">
              <HugeiconsIcon icon={SparklesIcon} size={22} />
            </div>
            <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] md:text-5xl">
              Free up to 5M traces.
            </h2>
            <p className="mt-4 text-[16px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed max-w-xl mx-auto">
              Start with full observability on the free tier. Add security scanning and response
              caching on Team — two lines of code, no infrastructure to manage.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="cta-btn bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9] px-8 h-12 text-[15px]" asChild>
                <Link to="/signup">
                  Start for free
                  <HugeiconsIcon icon={ArrowRight02Icon} size={16} />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="cta-btn border-[#E5E1D6] dark:border-[#333333] text-[#0a0a0a] dark:text-[#FAF9F6] hover:bg-[#F2F0E9] dark:hover:bg-[#1A1A1A] px-8 h-12 text-[15px]" asChild>
                <Link to="/documentation">Read the docs</Link>
              </Button>
            </div>
            <p className="mt-5 text-[12px] text-[#9A9A92] dark:text-[#9A9A92]">
              No credit card required · pip install fluiq · instrument in 60 seconds
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-[#E5E1D6] dark:border-[#2A2A2A] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-6 text-[13px] text-[#9A9A92] dark:text-[#9A9A92] md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Fluiq" className="size-6 opacity-60" />
            <span className="font-heading font-semibold text-[#0a0a0a] dark:text-[#FAF9F6] text-[14px]">Fluiq</span>
            <span className="text-[#D4CFC1] dark:text-[#333333]">·</span>
            <span>Observe, protect, optimize, evaluate.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Platform</Link>
            <Link to="/pricing" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Pricing</Link>
            <Link to="/documentation" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Docs</Link>
            <Link to="/contact" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
