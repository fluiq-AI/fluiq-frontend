import React, { useCallback, useEffect, useState } from "react"
import { Link } from "react-router"
import { motion, useMotionValue, useSpring } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  ArrowRight02Icon,
  PythonIcon,
  CheckmarkCircle02Icon,
  EyeIcon,
  ShieldIcon,
  ZapIcon,
  TestTube01Icon,
  SparklesIcon,
  AiContentGenerator01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { CodeBlock } from "@/components/code-block"

import { useScrollReveal } from "./hooks/useScrollReveal"
import { AnimatedCounter } from "./components/AnimatedCounter"
import { PipelineViz } from "./components/PipelineViz"
import {
  TracesMockup,
  SecurityMockup,
  OptimizationMockup,
  EvalMockup,
  PromptsMockup,
} from "./components/DashboardMockups"
import { setupHL, pipelineHL } from "./utils/highlightCode"
import { INTEGRATIONS, STATS, HERO_PILLARS, EASE_OUT } from "./utils/constants"

export default function Home() {
  useScrollReveal()
  const [navScrolled, setNavScrolled] = useState(false)
  const [metrics, setMetrics] = useState({ cache: 73, sec: 99.1, eval: 91 })
  const [rpm, setRpm]         = useState(247)

  const rotYRaw = useMotionValue(-6); const rotXRaw = useMotionValue(2)
  const rotY    = useSpring(rotYRaw, { stiffness: 180, damping: 26 })
  const rotX    = useSpring(rotXRaw, { stiffness: 180, damping: 26 })

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const link = document.createElement("link")
    link.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap"
    link.rel = "stylesheet"
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setMetrics({
      cache: 65 + Math.random() * 18, sec: 98.6 + Math.random() * 1.3, eval: 88 + Math.random() * 8,
    }), 3200)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setRpm(Math.floor(220 + Math.random() * 55)), 2800)
    return () => clearInterval(id)
  }, [])

  const handleTilt = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    rotYRaw.set(((e.clientX - r.left) / r.width  - 0.5) * 10 - 4)
    rotXRaw.set(((e.clientY - r.top)  / r.height - 0.5) * -6 + 1)
  }, [rotYRaw, rotXRaw])

  const resetTilt = useCallback(() => { rotYRaw.set(-6); rotXRaw.set(2) }, [rotYRaw, rotXRaw])

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', 'Courier New', monospace" }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">

      {/* ── Styles ──────────────────────────────────────────────────────── */}
      <style>{`
        .pipeline-panel {
          --pp-bg: #FAF9F6; --pp-bg2: #F2F0E9;
          --pp-bd: #E5E1D6; --pp-bd2: #D4CFC1;
          --pp-t1: #0A0A0A; --pp-t2: #6B6B66; --pp-t3: #9A9A92;
          --pp-blue: #1860D3; --pp-blue-soft: #E8F0FD;
          --pp-green: #2D7A4F; --pp-amber: #B85C2B;
        }
        .dark .pipeline-panel {
          --pp-bg: #111111; --pp-bg2: #1A1A1A;
          --pp-bd: #2A2A2A; --pp-bd2: #333333;
          --pp-t1: #F2F0E9; --pp-t2: #9A9A92; --pp-t3: #6B6B66;
          --pp-blue: #6FA8FF; --pp-blue-soft: #18244A;
          --pp-green: #4ADE80; --pp-amber: #FB923C;
        }
        @keyframes marqueeLeft {
          from { transform: translateX(0); } to { transform: translateX(-50%); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; } 50% { opacity: 0.2; }
        }
        .marquee-track { animation: marqueeLeft 28s linear infinite; }
        .live-dot      { animation: pulseDot 2s ease-in-out infinite; }
        .m-fill { height: 100%; border-radius: 2px; transition: width 1.4s cubic-bezier(0.22,1,0.36,1); }
        [data-animate] {
          opacity: 0; transform: translateY(24px);
          transition: opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1);
        }
        [data-animate][data-visible="true"] { opacity: 1; transform: translateY(0); }
        [data-delay="1"] { transition-delay: 0.08s; }
        [data-delay="2"] { transition-delay: 0.16s; }
        [data-delay="3"] { transition-delay: 0.24s; }
        [data-delay="4"] { transition-delay: 0.32s; }
        .pillar-card { transition: box-shadow 0.2s ease, transform 0.2s ease; }
        .pillar-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .cta-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .cta-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
        .cta-btn:active { transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) {
          *, [data-animate], .marquee-track { animation: none !important; transition: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
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
            <a href="#pillars" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Platform</a>
            <a href="#how-it-works" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">How it works</a>
            <Link to="/pricing" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Pricing</Link>
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

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative border-b border-[#D4CFC1] dark:border-[#1A1A1A] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse 90% 90% at 55% 50%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 90% at 55% 50%, black 30%, transparent 75%)",
          }} />
          <div className="dark:block hidden absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse 90% 90% at 55% 50%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 90% at 55% 50%, black 30%, transparent 75%)",
          }} />
          <div className="absolute right-[-5%] top-1/2 -translate-y-1/2 w-[55vw] h-[55vw] max-w-[660px] max-h-[660px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(24,96,211,0.06) 0%, transparent 65%)" }} />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            <div className="flex flex-col">
              <motion.div className="flex items-center gap-2.5 mb-8"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.05 }}>
                <span className="block w-5 h-px flex-shrink-0 bg-[#1860D3] dark:bg-[#6FA8FF]" />
                <span className="text-[#1860D3] dark:text-[#6FA8FF]"
                  style={{ ...mono, fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                  AI Ops Stack · LLM Applications
                </span>
              </motion.div>

              <motion.h1
                className="font-heading text-5xl md:text-6xl xl:text-7xl font-bold tracking-[-0.038em] leading-[1.03] text-[#0A0A0A] dark:text-[#FAF9F6] mb-7"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: EASE_OUT }}>
                Production AI<br />Without the<br />
                <span className="text-[#1860D3] dark:text-[#6FA8FF]">Blind Spots.</span>
              </motion.h1>

              <motion.p className="mb-9 max-w-[440px] leading-[1.82] text-[#6B6B66] dark:text-[#9A9A92]"
                style={{ ...mono, fontSize: 13, fontWeight: 300 }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25, ease: EASE_OUT }}>
                FluiqAI is the unified ops layer for LLM applications — security scanning,
                intelligent caching, deep observability, and automated evaluation on every single request.
              </motion.p>

              <motion.div className="flex flex-wrap gap-2 mb-11"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35, ease: EASE_OUT }}>
                {HERO_PILLARS.map(({ label, dot }) => (
                  <span key={label}
                    className="inline-flex items-center gap-[7px] px-3 py-[5px] rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] text-[#6B6B66] dark:text-[#9A9A92] hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] hover:border-[#1860D3] dark:hover:border-[#6FA8FF] transition-colors cursor-default"
                    style={{ ...mono, fontSize: 10, fontWeight: 500, letterSpacing: "0.05em" }}>
                    <span className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                      style={{ background: dot, boxShadow: `0 0 5px ${dot}88` }} />
                    {label}
                  </span>
                ))}
              </motion.div>

              <motion.div className="flex items-center gap-3"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45, ease: EASE_OUT }}>
                <Button size="lg" className="cta-btn bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9] px-6 h-11" asChild>
                  <Link to="/signup">Start Free <HugeiconsIcon icon={ArrowRight02Icon} size={16} /></Link>
                </Button>
                <Button size="lg" variant="outline"
                  className="cta-btn border-[#E5E1D6] dark:border-[#333333] text-[#0a0a0a] dark:text-[#FAF9F6] hover:bg-[#F2F0E9] dark:hover:bg-[#1A1A1A] hover:border-[#1860D3] dark:hover:border-[#6FA8FF] px-6 h-11" asChild>
                  <Link to="/documentation">Read Docs</Link>
                </Button>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: EASE_OUT }}
              onMouseMove={handleTilt} onMouseLeave={resetTilt}>
              <motion.div style={{ rotateY: rotY, rotateX: rotX, transformPerspective: 1400 }}>
                <PipelineViz rpm={rpm} metrics={metrics} />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Integration marquee ──────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-6 overflow-hidden">
        <div className="flex">
          <div className="marquee-track flex shrink-0 gap-8 pr-8">
            {[...INTEGRATIONS, ...INTEGRATIONS].map((name, i) => (
              <span key={i} className="shrink-0 text-[13px] font-medium text-[#9A9A92] dark:text-[#9A9A92] tracking-wide whitespace-nowrap px-2">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem statement ────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20" id="pillars">
        <div className="mx-auto max-w-6xl px-6">
          <div data-animate className="mx-auto max-w-3xl text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1860D3] dark:text-[#6FA8FF] mb-4">The full picture</p>
            <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.15] md:text-5xl">
              Observability tools tell you what broke.<br />
              <span className="text-[#6B6B66] dark:text-[#9A9A92]">Fluiq helps you <span className="text-[#1860D3] dark:text-[#6FA8FF]">prevent it.</span></span>
            </h2>
            <p className="mt-5 text-[16px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
              Most platforms stop at tracing. Fluiq adds a security layer, a caching layer,
              and a quality gate — so you catch problems before your users do.
            </p>
          </div>
        </div>
      </section>

      {/* 1 · Observability */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div data-animate>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1860D3] dark:text-[#6FA8FF] mb-5">
                <HugeiconsIcon icon={EyeIcon} size={12} />Observability · 01
              </span>
              <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.15] mb-4">Full trace visibility across every <span className="text-[#1860D3] dark:text-[#6FA8FF]">LLM call</span></h2>
              <p className="text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-5">Every token, latency, and cost attributed to the exact agent node that spent it. Streaming traces, cost anomaly alerts, and per-model breakdowns — without changing how you write code.</p>
              <ul className="space-y-2 mb-6">
                {["Per-node token attribution", "p50 / p95 / p99 latency tracking", "Real-time trace streaming"].map(pt => (
                  <li key={pt} className="flex items-start gap-2.5 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]" />
                    {pt}
                  </li>
                ))}
              </ul>
              <div className="rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] px-3 py-2 font-mono text-[12px] text-[#6B6B66] dark:text-[#9A9A92] inline-block">
                fluiq.instrument(api_key="fl_...")
              </div>
            </div>
            <div data-animate data-delay="2">
              <TracesMockup />
            </div>
          </div>
        </div>
      </section>

      {/* 2 · Security (reversed) */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-24 bg-[#F7F6F1] dark:bg-[#0D0D0D]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div data-animate data-delay="2" className="lg:order-1">
              <SecurityMockup />
            </div>
            <div data-animate className="lg:order-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1860D3] dark:text-[#6FA8FF] mb-5">
                <HugeiconsIcon icon={ShieldIcon} size={12} />Security · 02
              </span>
              <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.15] mb-4"><span className="text-[#1860D3] dark:text-[#6FA8FF]">Block attacks</span> before they reach your model</h2>
              <p className="text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-5">Pre-call scanning catches jailbreaks, prompt injections, and skeleton-key attacks before the LLM call is made. Post-call scanning redacts PII and secrets from stored traces.</p>
              <ul className="space-y-2 mb-6">
                {["Pre-call jailbreak + injection blocking", "PII & secret redaction on traces", "No false positives — fails open on errors"].map(pt => (
                  <li key={pt} className="flex items-start gap-2.5 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]" />
                    {pt}
                  </li>
                ))}
              </ul>
              <div className="rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] px-3 py-2 font-mono text-[12px] text-[#6B6B66] dark:text-[#9A9A92] inline-block">
                fluiq.secure(mode="block")
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 · Optimization */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div data-animate>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1860D3] dark:text-[#6FA8FF] mb-5">
                <HugeiconsIcon icon={ZapIcon} size={12} />Optimization · 03
              </span>
              <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.15] mb-4">Stop paying for duplicate <span className="text-[#1860D3] dark:text-[#6FA8FF]">LLM calls</span></h2>
              <p className="text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-5">Fluiq analyses your actual trace history to find which prompts repeat, then provisions a dedicated Cache instance for your account. Repeated calls are served from cache automatically.</p>
              <ul className="space-y-2 mb-6">
                {["Server-side Caching, zero infra to manage", "Profile built from your real traffic patterns", "Configurable TTL and model scope"].map(pt => (
                  <li key={pt} className="flex items-start gap-2.5 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]" />
                    {pt}
                  </li>
                ))}
              </ul>
              <div className="rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] px-3 py-2 font-mono text-[12px] text-[#6B6B66] dark:text-[#9A9A92] inline-block">
                fluiq.optimize()&nbsp;&nbsp;&nbsp;# "cache" | "observe"
              </div>
            </div>
            <div data-animate data-delay="2">
              <OptimizationMockup />
            </div>
          </div>
        </div>
      </section>

      {/* 4 · Evaluation (reversed) */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-24 bg-[#F7F6F1] dark:bg-[#0D0D0D]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div data-animate data-delay="2" className="lg:order-1">
              <EvalMockup />
            </div>
            <div data-animate className="lg:order-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1860D3] dark:text-[#6FA8FF] mb-5">
                <HugeiconsIcon icon={TestTube01Icon} size={12} />Evaluation · 04
              </span>
              <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.15] mb-4">Gate responses that fail <span className="text-[#1860D3] dark:text-[#6FA8FF]">quality thresholds</span></h2>
              <p className="text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-5">LLM-as-judge runs server-side after each call. Set per-metric thresholds — warn mode logs quality scores to the dashboard; block mode raises FluiqEvalError before the response reaches your app.</p>
              <ul className="space-y-2 mb-6">
                {["hallucination, faithfulness, relevance, toxicity", "Scores stored and visible in the dashboard", "Block mode prevents bad responses reaching users"].map(pt => (
                  <li key={pt} className="flex items-start gap-2.5 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]" />
                    {pt}
                  </li>
                ))}
              </ul>
              <div className="rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] px-3 py-2 font-mono text-[12px] text-[#6B6B66] dark:text-[#9A9A92] inline-block">
                fluiq.eval(thresholds={"{'hallucination': 0.8}"})
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 · Prompt Management */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div data-animate>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1860D3] dark:text-[#6FA8FF] mb-5">
                <HugeiconsIcon icon={AiContentGenerator01Icon} size={12} />Prompt Management · 05
              </span>
              <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.15] mb-4">Write, version, and <span className="text-[#1860D3] dark:text-[#6FA8FF]">deploy prompts</span> like software</h2>
              <p className="text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-5">A dedicated IDE-style editor for your prompt templates — with <code className="font-mono text-[13px] text-[#0a0a0a] dark:text-[#FAF9F6]">{"{{variable}}"}</code> injection, full version history, and per-environment deployment. Iterate directly on real production traces, compare model outputs side-by-side, and ship with confidence.</p>
              <ul className="space-y-2 mb-6">
                {[
                  "{{variable}} template syntax — define slots, fill at runtime via SDK",
                  "Version history — save, browse, and restore any past version instantly",
                  "One-click deployment to dev → staging → production environments",
                  "Side-by-side model comparison — same prompt, multiple models",
                  "Pull directly from live traces — iterate on real-world prompts",
                ].map(pt => (
                  <li key={pt} className="flex items-start gap-2.5 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]" />
                    {pt}
                  </li>
                ))}
              </ul>
              <div className="rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] px-3 py-2 font-mono text-[12px] text-[#6B6B66] dark:text-[#9A9A92] inline-block">
                fluiq.get_prompt("customer-support", env="production")
              </div>
            </div>
            <div data-animate data-delay="2">
              <PromptsMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20 bg-[#F2F0E9] dark:bg-[#0A0A0A]" id="how-it-works">
        <div className="mx-auto max-w-6xl px-6">
          <div data-animate className="mb-14 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1860D3] dark:text-[#6FA8FF] mb-4">How it works</p>
            <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug">
              Four functions. Production-ready in minutes.
            </h2>
          </div>
          <div className="grid gap-px bg-[#D4CFC1] dark:bg-[#2A2A2A] rounded-2xl overflow-hidden md:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", fn: "instrument()", description: "Patches every LLM call automatically. Traces, costs, and latency start flowing to your dashboard." },
              { step: "02", fn: "secure()",      description: "Pre-call attack detection blocks bad prompts. Post-call scanning redacts PII from stored traces." },
              { step: "03", fn: "optimize()",    description: "Fluiq analyses your trace history, provisions Fluiq Caching, and serves duplicate calls from cache." },
              { step: "04", fn: "eval()",        description: "LLM-as-judge scores every response. Warn or block based on your quality thresholds." },
            ].map((item, i) => (
              <div key={item.step} data-animate data-delay={String(i + 1)} className="bg-[#FAF9F6] dark:bg-[#1A1A1A] p-7">
                <p className="text-[11px] font-semibold text-[#1860D3] dark:text-[#6FA8FF] tracking-widest mb-4">{item.step}</p>
                <p className="font-mono text-[15px] font-bold mb-3 text-[#0a0a0a] dark:text-[#FAF9F6]"><span className="text-[#1860D3] dark:text-[#6FA8FF]">fluiq.</span>{item.fn}</p>
                <p className="text-[13px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
          <div data-animate className="mt-10 rounded-2xl border border-[#1a1a1a] dark:border-[#2A2A2A] bg-[#0a0a0a] dark:bg-[#1A1A1A] overflow-hidden shadow-xl">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[#1e1e1e] dark:border-[#2A2A2A]">
              <HugeiconsIcon icon={PythonIcon} size={13} className="text-[#6B6B66]" />
              <span className="text-[11px] text-[#6B6B66] font-mono">Complete setup</span>
            </div>
            <CodeBlock variant="dark" highlighted={setupHL()}>{`import fluiq, openai

# 1. Wire instrumentation once at startup
fluiq.instrument(api_key="fl_...")

# 2. Block attacks before they reach the model (Team+)
fluiq.secure(mode="block")

# 3. Cache repeated prompts (Team+)
fluiq.optimize()

# 4. Score and gate every response (all tiers)
fluiq.eval(
    thresholds={"hallucination": 0.8, "relevance": 0.75},
    mode="warn",          # "block" raises FluiqEvalError
)

# Your code is unchanged from here
client = openai.OpenAI()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "..."}],
)
# ↑ Traced, scanned, cached, and evaluated automatically`}</CodeBlock>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-px bg-[#D4CFC1] dark:bg-[#2A2A2A] rounded-2xl overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <div key={s.label} data-animate data-delay={String(i + 1)} className="bg-[#FAF9F6] dark:bg-[#1A1A1A] px-8 py-10 text-center">
                <p className="font-heading text-5xl font-bold text-[#1860D3] dark:text-[#6FA8FF] tracking-tight tabular-nums">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-[13px] text-[#6B6B66] dark:text-[#9A9A92] leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Frameworks ───────────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div data-animate>
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1860D3] dark:text-[#6FA8FF] mb-4">Framework-agnostic</p>
              <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug mb-4">Works with the stack you already use.</h2>
              <p className="text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-6">
                Fluiq patches at the function-call level, not the framework level. Any Python function that hits an LLM or vector database becomes a traced span with one decorator.
              </p>
              <div className="flex flex-wrap gap-2">
                {INTEGRATIONS.map((f) => (
                  <span key={f} className="rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9] dark:bg-[#1A1A1A] px-3 py-1 text-[12px] font-medium text-[#6B6B66] dark:text-[#9A9A92]">{f}</span>
                ))}
              </div>
            </div>
            <div data-animate data-delay="2" className="rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden shadow-xl">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e1e1e]">
                <HugeiconsIcon icon={PythonIcon} size={13} className="text-[#6B6B66]" />
                <span className="text-[12px] text-[#6B6B66] font-mono">any_pipeline.py</span>
              </div>
              <CodeBlock variant="dark" highlighted={pipelineHL()}>{`from fluiq import instrument, trace

instrument(api_key="fl_...")

@trace
def answer_question(question: str) -> str:
    docs = vector_store.search(question, k=5)
    return llm.invoke(prompt(question, docs))

# Every call is now:
# → Traced with cost + latency
# → Security-scanned
# → Cached if repeated
# → Evaluated for quality`}</CodeBlock>
            </div>
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
            <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] md:text-5xl">Free up to <span className="text-[#1860D3] dark:text-[#6FA8FF]">5M</span> traces.</h2>
            <p className="mt-4 text-[16px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed max-w-xl mx-auto">
              Start with observability on the free tier. Add security, optimization, and evaluation as your pipeline grows — no code changes required.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="cta-btn bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9] px-8 h-12 text-[15px]" asChild>
                <Link to="/signup">Start for free <HugeiconsIcon icon={ArrowRight02Icon} size={16} /></Link>
              </Button>
              <Button size="lg" variant="outline" className="cta-btn border-[#E5E1D6] dark:border-[#333333] text-[#0a0a0a] dark:text-[#FAF9F6] hover:bg-[#F2F0E9] dark:hover:bg-[#1A1A1A] px-8 h-12 text-[15px]" asChild>
                <Link to="/documentation">Read the docs</Link>
              </Button>
            </div>
            <p className="mt-5 text-[12px] text-[#9A9A92]">No credit card required · pip install fluiq · instrument in 60 seconds</p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#E5E1D6] dark:border-[#2A2A2A] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-6 text-[13px] text-[#9A9A92] md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Fluiq" className="size-6 opacity-60" />
            <span className="font-heading font-semibold text-[#0a0a0a] dark:text-[#FAF9F6] text-[14px]">Fluiq</span>
            <span className="text-[#D4CFC1] dark:text-[#333333]">·</span>
            <span>Observe, protect, optimize, evaluate.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#pillars" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Platform</a>
            <Link to="/pricing" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Pricing</Link>
            <Link to="/documentation" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Docs</Link>
            <Link to="/contact" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
