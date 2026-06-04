import "@/styles/pricing.css";
import { Helmet } from "react-helmet-async"
import { useState, useEffect } from "react"
import { Link } from "react-router"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  SparklesIcon,
  ShieldKeyIcon,
  FlashIcon,
  PythonIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { CodeBlock } from "@/components/code-block"
import { useScrollReveal } from "@/pages/Home/hooks/useScrollReveal"
import { SiteFooter } from "@/components/SiteFooter"
import { NavIntegrationsDropdown } from "@/components/NavIntegrationsDropdown"
import { syntaxHighlight } from "@/pages/Documentation/syntaxHighlight"

const EASE_OUT = [0.22, 1, 0.36, 1] as const

const powerFeatures = [
  {
    icon: ShieldKeyIcon,
    name: "fluiq.secure()",
    badge: "Available to all users",
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
    code: `fluiq.instrument(api_key="fl_...")\nfluiq.secure()  # warn mode flags risks on the trace\nfluiq.secure(mode="block")  # block mode`,
  },
  {
    icon: FlashIcon,
    name: "fluiq.optimize()",
    badge: "Available to all users",
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
    code: `fluiq.instrument(api_key="fl_...")\nfluiq.optimize()  # cache mode\nfluiq.optimize(mode="observe")  # observe mode`,
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
    q: "How does fluiq.secure() work?",
    a: "fluiq.secure() runs server-side — attack patterns are never shipped in the public SDK. In warn mode (default) it flags risks and attaches security metadata to the trace without blocking execution. In block mode it adds a pre-call guard that raises FluiqSecurityError before the LLM call is made if a HIGH-risk pattern is detected.",
  },
  {
    q: "How does fluiq.optimize() work?",
    a: "After you call fluiq.optimize(), the SDK fetches your trace-derived cache profile from the Fluiq backend, connects to a dedicated Redis instance provisioned for your account, and begins serving repeated prompts from cache. In observe mode it records what would have been a cache hit so you can review projected savings before enabling full interception.",
  },
  {
    q: "Do you support self-hosting?",
    a: "VPC and on-prem deployments are on the roadmap for enterprise customers. The SDK is a thin instrumentation layer and can be pointed at your own backend endpoint if you prefer full self-hosting.",
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
    <div className="pricing-page min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">
      <Helmet>
        <title>Pricing — Fluiq</title>
        <meta name="description" content="Start free with 5M lifetime traces. Upgrade to Team for security scanning, intelligent caching, and advanced evaluation. No credit card required." />
        <link rel="canonical" href="https://getfluiq.com/pricing" />
      </Helmet>
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        navScrolled
          ? "bg-[#FAF9F6]/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#E5E1D6] dark:border-[#2A2A2A]"
          : "bg-[#FAF9F6] dark:bg-[#0A0A0A] border-b border-transparent"
      }`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Fluiq" className="size-7" />
            <span className="font-heading text-[15px] font-semibold tracking-tight">Fluiq</span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] text-[#6B6B66] dark:text-[#9A9A92] md:flex">
            <Link to="/" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Platform</Link>
            <NavIntegrationsDropdown />
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
              <Link to="/signup">Get started <HugeiconsIcon icon={ArrowRight02Icon} size={14} /></Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative border-b border-[#D4CFC1] dark:border-[#1A1A1A] overflow-hidden py-28">

        {/* Background: dot grid + blue glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%)",
          }} />
          <div className="dark:block hidden absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%)",
          }} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-175 max-h-175 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(24,96,211,0.07) 0%, transparent 65%)" }} />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">

          <motion.div className="mb-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9]/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#1860D3] dark:text-[#6FA8FF]">
              <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
              Free while in beta
            </span>
          </motion.div>

          <motion.h1
            className="font-heading mx-auto max-w-3xl text-5xl font-bold tracking-[-0.03em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.08] md:text-6xl"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE_OUT }}>
            <span className="text-[#1860D3] dark:text-[#6FA8FF]">No credit card.</span><br className="hidden md:block" /> No limits.
          </motion.h1>

          <motion.p
            className="mt-6 mx-auto max-w-lg text-[18px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: EASE_OUT }}>
            Just sign up and start shipping safer AI.
          </motion.p>

          <motion.div className="mt-10 flex flex-col items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: EASE_OUT }}>
            <Button size="lg"
              className="cta-btn bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9] px-10 h-13 text-[16px] font-semibold"
              asChild>
              <Link to="/signup">
                Get Started Free
                <HugeiconsIcon icon={ArrowRight02Icon} size={16} />
              </Link>
            </Button>
          </motion.div>

          <motion.p
            className="mt-6 text-[13px] text-[#9A9A92]"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: EASE_OUT }}>
            Paid plans coming soon — early users get locked in at founding rates.
          </motion.p>
        </div>
      </section>

      {/* ── What's included ──────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20 bg-[#F2F0E9] dark:bg-[#0A0A0A]">
        <div className="mx-auto max-w-5xl px-6">
          <div data-animate className="mb-12 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1860D3] dark:text-[#6FA8FF] mb-4">
              Everything included, free
            </p>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug">
              Two calls. <span className="text-[#1860D3] dark:text-[#6FA8FF]">Security and speed</span>, handled.
            </h2>
            <p className="mt-4 mx-auto max-w-lg text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
              <code className="rounded bg-[#E8F0FD] dark:bg-[#1860D3]/10 px-1.5 py-0.5 font-mono text-[12px] text-[#1860D3] dark:text-[#6FA8FF]">fluiq.secure()</code>
              {" "}and{" "}
              <code className="rounded bg-[#E8F0FD] dark:bg-[#1860D3]/10 px-1.5 py-0.5 font-mono text-[12px] text-[#1860D3] dark:text-[#6FA8FF]">fluiq.optimize()</code>
              {" "}are available to every user — no upgrade required.
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
                        <span className="text-[12px] text-[#6B6B66] dark:text-[#9A9A92]"> — {cap.desc}</span>
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

      {/* ── What every account includes ──────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div data-animate className="mb-12 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1860D3] dark:text-[#6FA8FF] mb-4">
              Every account
            </p>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug">
              Full access. <span className="text-[#1860D3] dark:text-[#6FA8FF]">No gates.</span>
            </h2>
            <p className="mt-4 text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
              Every user gets the complete Fluiq platform during the beta.
            </p>
          </div>
          <div data-animate data-delay="1" className="grid gap-3 sm:grid-cols-2">
            {[
              "Unlimited tracing & spans",
              "Unlimited LLM-as-judge evaluations",
              "Trace explorer & live dashboard",
              "CI/CD eval gates",
              "fluiq.secure() — security scanning",
              "fluiq.optimize() — response caching",
              "OpenAI, Anthropic, Gemini, LangChain, LangGraph, CrewAI, Google ADK",
              "Anomaly alerts to Slack",
              "90-day trace retention",
              "Priority support",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#FAF9F6] dark:bg-[#1A1A1A] px-4 py-3"
              >
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={14}
                  className="shrink-0 text-[#1860D3] dark:text-[#6FA8FF]"
                />
                <span className="text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">{item}</span>
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
              Free while <span className="text-[#1860D3] dark:text-[#6FA8FF]">in beta.</span>
            </h2>
            <p className="mt-4 text-[16px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed max-w-xl mx-auto">
              No credit card. No limits. Just sign up and start shipping safer AI.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="cta-btn bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9] px-8 h-12 text-[15px]" asChild>
                <Link to="/signup">Get Started Free <HugeiconsIcon icon={ArrowRight02Icon} size={16} /></Link>
              </Button>
              <Button size="lg" variant="outline" className="cta-btn border-[#E5E1D6] dark:border-[#333333] text-[#0a0a0a] dark:text-[#FAF9F6] hover:bg-[#F2F0E9] dark:hover:bg-[#1A1A1A] px-8 h-12 text-[15px]" asChild>
                <Link to="/documentation">Read the docs</Link>
              </Button>
            </div>
            <p className="mt-5 text-[12px] text-[#9A9A92]">
              Paid plans coming soon · early users get locked in at founding rates
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />

    </div>
  )
}
