"use client"

import "@/styles/home.css";
import React, { useCallback, useState } from "react"
import { motion, useMotionValue, useSpring } from "motion/react"
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PythonIcon,
  Typescript01Icon,
  CheckmarkCircle02Icon,
  EyeIcon,
  ShieldIcon,
  ZapIcon,
  TestTube01Icon,
  SparklesIcon,
  AiContentGenerator01Icon,
  Database01Icon,
} from "@hugeicons/core-free-icons"
import { CodeBlock } from "@/components/code-block"
import { syntaxHighlight } from "@/pages/Documentation/syntaxHighlight"

import { useScrollReveal } from "./hooks/useScrollReveal"
import { SiteFooter } from "@/components/SiteFooter"
import { SiteNavbar } from "@/components/SiteNavbar"
import { GrainOverlay, HeroAtmosphere } from "@/components/SiteBackdrop"
import { AnimatedCounter } from "./components/AnimatedCounter"
import { IslandCta } from "@/components/IslandCta"
import {
  TracesMockup,
  SecurityMockup,
  OptimizationMockup,
  EvalMockup,
  PromptsMockup,
  DatasetsMockup,
} from "./components/DashboardMockups"
import { INTEGRATIONS, STATS, EASE_OUT } from "./utils/constants"

type CodeLang = "python" | "typescript"

/* Complete-setup sample — Python + TypeScript. */
const SETUP_PY = `import fluiq, openai

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
# ↑ Traced, scanned, cached, and evaluated automatically`

const SETUP_TS = `import fluiq from "@fluiq/sdk";
import OpenAI from "openai";

// 1. Wire instrumentation once at startup
fluiq.instrument({ apiKey: "fl_..." });

// 2. Block attacks before they reach the model (Team+)
fluiq.secure({ mode: "block" });

// 3. Cache repeated prompts (Team+)
fluiq.optimize();

// 4. Score and gate every response (all tiers)
fluiq.eval({
  thresholds: { hallucination: 0.8, relevance: 0.75 },
  mode: "warn", // "block" throws FluiqEvalError
});

// Your code is unchanged from here
const client = new OpenAI();
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "..." }],
});
// ↑ Traced, scanned, cached, and evaluated automatically`

/* Framework-agnostic sample — Python + TypeScript. */
const PIPE_PY = `from fluiq import instrument, trace

instrument(api_key="fl_...")

@trace
def answer_question(question: str) -> str:
    docs = vector_store.search(question, k=5)
    return llm.invoke(prompt(question, docs))

# Every call is now:
# Traced with cost + latency
# Security-scanned
# Cached if repeated
# Evaluated for quality`

const PIPE_TS = `import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });

const answerQuestion = fluiq.trace((question: string): string => {
  const docs = vectorStore.search(question, 5);
  return llm.invoke(prompt(question, docs));
});

// Every call is now:
// Traced with cost + latency
// Security-scanned
// Cached if repeated
// Evaluated for quality`

/* Python / TypeScript switch shown in a code block's top-right header. */
function CodeLangToggle({ lang, onChange }: { lang: CodeLang; onChange: (l: CodeLang) => void }) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-white/[0.07] bg-white/[0.04] p-0.5">
      {(["python", "typescript"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          aria-pressed={lang === l}
          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
            lang === l ? "bg-[#6FA8FF] text-[#0A0A0A]" : "text-[#9A9A92] hover:text-white"
          }`}
        >
          {l === "python" ? "Python" : "TypeScript"}
        </button>
      ))}
    </div>
  )
}

/* Hero code-artifact: cobalt for the fluiq signal, muted for comments. */
const CC = { sig: "#6FA8FF", str: "#8FBF9E", com: "#7E7E76", base: "#D7D3C7" }
const HERO_CODE: Array<Array<[string, string]>> = [
  [["import ", CC.sig], ["fluiq, openai", CC.base]],
  [],
  [["fluiq", CC.sig], [".instrument(api_key=", CC.base], ["\"fl_...\"", CC.str], [")", CC.base]],
  [["fluiq", CC.sig], [".secure(mode=", CC.base], ["\"block\"", CC.str], [")", CC.base]],
  [["fluiq", CC.sig], [".optimize()", CC.base]],
  [["fluiq", CC.sig], [".eval(thresholds=", CC.base], ["{\"hallucination\": 0.8}", CC.base], [")", CC.base]],
  [],
  [["# every call: traced, scanned, cached, scored", CC.com]],
]

export default function Home() {
  useScrollReveal()
  const reduce = useReducedMotionSafe()

  // Shared Python/TypeScript toggle for the code blocks below.
  const [codeLang, setCodeLang] = useState<CodeLang>("python")
  const isTs = codeLang === "typescript"

  const rotYRaw = useMotionValue(-6); const rotXRaw = useMotionValue(2)
  const rotY    = useSpring(rotYRaw, { stiffness: 180, damping: 26 })
  const rotX    = useSpring(rotXRaw, { stiffness: 180, damping: 26 })

  const handleTilt = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    rotYRaw.set(((e.clientX - r.left) / r.width  - 0.5) * 10 - 4)
    rotXRaw.set(((e.clientY - r.top)  / r.height - 0.5) * -6 + 1)
  }, [rotYRaw, rotXRaw])

  const resetTilt = useCallback(() => { rotYRaw.set(-6); rotXRaw.set(2) }, [rotYRaw, rotXRaw])

  return (
    <div className="home-page min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">
      <GrainOverlay />
<SiteNavbar landing />

      <section className="relative border-b border-[#D4CFC1] dark:border-[#1A1A1A] overflow-hidden">
        <HeroAtmosphere variant="offset" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="relative grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-8">
            {/* Giant editorial statement, left */}
            <div className="flex flex-col lg:col-span-6">
              <motion.div className="flex items-center gap-2.5 mb-7"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.05 }}>
                <span className="block w-5 h-px shrink-0 bg-[#1860D3] dark:bg-[#6FA8FF]" />
                <span className="text-[#1860D3] dark:text-[#6FA8FF]"
                  style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase" as const }}>
                  AI Ops Stack · LLM Applications
                </span>
              </motion.div>

              <motion.h1
                className="font-heading text-[2.75rem] sm:text-6xl lg:text-7xl xl:text-[5rem] font-bold tracking-[-0.04em] leading-[0.98] text-[#0A0A0A] dark:text-[#FAF9F6] mb-7"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: EASE_OUT }}>
                Production AI,<br />without the<br /><span className="text-[#1860D3] dark:text-[#6FA8FF]">blind spots.</span>
              </motion.h1>

              <motion.p className="mb-9 max-w-[30rem] text-[15px] leading-[1.7] text-[#6B6B66] dark:text-[#9A9A92]"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25, ease: EASE_OUT }}>
                FluiqAI is the unified ops layer for LLM applications: security scanning,
                intelligent caching, deep observability, and automated evaluation on every
                request — plus golden datasets to regression-test whole agent runs.
              </motion.p>

              <motion.div className="flex flex-wrap items-center gap-3"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35, ease: EASE_OUT }}>
                <IslandCta to="/signup">Start free</IslandCta>
                <IslandCta to="/documentation" variant="ghost">Read the docs</IslandCta>
              </motion.div>
            </div>

            {/* Code artifact, same row, right column */}
            <motion.div
              className="lg:col-span-6 lg:col-start-7"
              initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease: EASE_OUT }}
              onMouseMove={handleTilt} onMouseLeave={resetTilt}>
              {/* Double-bezel: aluminium tray (outer shell) cradling the glass editor (inner core) */}
              <motion.div
                className="relative mx-auto w-full max-w-[472px] rounded-[1.75rem] bg-black/[0.05] p-2 ring-1 ring-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.06),0_30px_70px_-18px_rgba(24,96,211,0.26)] lg:mx-0 lg:ml-auto dark:bg-white/[0.05] dark:ring-white/10"
                style={{ rotateY: rotY, rotateX: rotX, transformPerspective: 1400 }}>
                <div className="overflow-hidden rounded-[1.25rem] border border-white/[0.07] bg-[#0C0C0C] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14)]">
                {/* Editor window chrome */}
                <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#161616] px-3.5 py-2.5">
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="ml-3 inline-flex items-center gap-1.5 font-mono text-[11px] text-white/45">
                    <HugeiconsIcon icon={PythonIcon} size={12} /> app.py
                  </span>
                </div>
                {/* Code, revealed line by line */}
                <motion.pre
                  className="overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-[1.9]"
                  variants={reduce ? undefined : { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.55 } } }}
                  initial={reduce ? false : "hidden"} animate={reduce ? false : "show"}>
                  {HERO_CODE.map((tokens, i) => (
                    <motion.div key={i}
                      variants={reduce ? undefined : { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.22, ease: EASE_OUT } } }}>
                      {tokens.length === 0
                        ? " "
                        : tokens.map(([text, color], j) => (
                            <span key={j} style={{ color }}>{text}</span>
                          ))}
                      {i === HERO_CODE.length - 1 && !reduce && (
                        <span className="ml-1 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse bg-[#6FA8FF] align-middle" />
                      )}
                    </motion.div>
                  ))}
                </motion.pre>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Integration marquee ──────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-6 overflow-hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9A92]">Works with</span>
          <div className="marquee-mask relative min-w-0 flex-1 overflow-hidden">
            {/* Two identical groups, each carrying its own trailing gap (pr-10)
                so the connecting gap equals the internal gap. Motion drives the
                track x from 0% → -50% (= exactly one group width) on an infinite
                linear loop, so it reads as one continuous circular scroll. */}
            <motion.div
              className="flex w-max"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 32, ease: "linear", repeat: Infinity }}
            >
              {[0, 1].map((dup) => (
                <ul key={dup} aria-hidden={dup === 1} className="flex shrink-0 items-center gap-10 pr-10">
                  {INTEGRATIONS.map((name) => (
                    <li key={name} className="text-[13px] font-medium text-[#6B6B66] dark:text-[#9A9A92] tracking-wide whitespace-nowrap">{name}</li>
                  ))}
                </ul>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Problem statement ────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20" id="pillars">
        <div className="mx-auto max-w-6xl px-6">
          <div data-animate className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.15] md:text-5xl">
              Observability tools tell you what broke.<br />
              <span className="text-[#6B6B66] dark:text-[#9A9A92]">Fluiq helps you <span className="text-[#1860D3] dark:text-[#6FA8FF]">prevent it.</span></span>
            </h2>
            <p className="mt-5 text-[16px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
              Most platforms stop at tracing. Fluiq adds a security layer, a caching layer,
              and a quality gate, so you catch problems before your users do.
            </p>
          </div>
        </div>
      </section>

      {/* 1 · Observability */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div data-animate>
              <span className="inline-flex items-center justify-center size-9 rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] text-[#1860D3] dark:text-[#6FA8FF] mb-5">
                <HugeiconsIcon icon={EyeIcon} size={16} />
              </span>
              <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.15] mb-4">Full trace visibility across every <span className="text-[#1860D3] dark:text-[#6FA8FF]">LLM call</span></h2>
              <p className="text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-5">Every token, latency, and cost attributed to the exact agent node that spent it. Streaming traces, cost anomaly alerts, and per-model breakdowns, without changing how you write code.</p>
              <ul className="space-y-2 mb-6">
                {["Per-node token attribution", "p50 / p95 / p99 latency tracking", "Multi-agent runs render as real DAGs — fan-outs, joins, and loops across LangGraph, CrewAI, and Google ADK", "Real-time trace streaming"].map(pt => (
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
              <span className="inline-flex items-center justify-center size-9 rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] text-[#1860D3] dark:text-[#6FA8FF] mb-5">
                <HugeiconsIcon icon={ShieldIcon} size={16} />
              </span>
              <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.15] mb-4"><span className="text-[#1860D3] dark:text-[#6FA8FF]">Block attacks</span> before they reach your model</h2>
              <p className="text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-5">A full suite of server-side scanners runs on every request — catching jailbreaks, PII and secret leaks, and attacks injected through your tools, knowledge base, and other agents, not just the user message. Patterns are maintained server-side and updated without SDK releases. Everything fails open, so a scanner error never breaks your app.</p>
              <ul className="space-y-2 mb-6">
                {[
                  "PII & secrets: cards, SSNs, IBANs, emails, names, provider API keys, high-entropy tokens",
                  "Prompt attacks: injection, jailbreak, and instruction-override patterns",
                  "RAG poisoning & indirect injection: retrieved docs and tool outputs scanned across the trace tree",
                  "Tool misuse: exfiltration through tool arguments, plus allowlist enforcement",
                  "Multi-agent trust: cross-agent injection and trust-boundary escalation across the DAG",
                ].map(pt => (
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

      {/* 3 · Optimization - full-width feature (breaks the zigzag rhythm) */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div data-animate className="max-w-2xl">
            <span className="inline-flex items-center justify-center size-9 rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] text-[#1860D3] dark:text-[#6FA8FF] mb-5">
              <HugeiconsIcon icon={ZapIcon} size={16} />
            </span>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.15] mb-4">Stop paying for duplicate <span className="text-[#1860D3] dark:text-[#6FA8FF]">LLM calls</span></h2>
            <p className="text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">Fluiq analyses your actual trace history to find which prompts repeat, then provisions a dedicated cache instance for your account. Repeated calls are served from cache automatically.</p>
          </div>
          <div data-animate data-delay="1" className="mt-10 grid gap-8 sm:grid-cols-3 max-w-3xl">
            {[
              "Server-side caching, zero infra to manage",
              "Profile built from your real traffic patterns",
              "Configurable TTL and model scope",
            ].map(pt => (
              <div key={pt} className="flex items-start gap-2.5 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]" />
                {pt}
              </div>
            ))}
          </div>
          <div data-animate data-delay="2" className="mt-10 mx-auto max-w-4xl">
            <OptimizationMockup />
          </div>
          <div data-animate className="mt-8 flex justify-center">
            <div className="rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] px-3 py-2 font-mono text-[12px] text-[#6B6B66] dark:text-[#9A9A92] inline-block">
              fluiq.optimize()&nbsp;&nbsp;&nbsp;# "cache" | "observe"
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
              <span className="inline-flex items-center justify-center size-9 rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] text-[#1860D3] dark:text-[#6FA8FF] mb-5">
                <HugeiconsIcon icon={TestTube01Icon} size={16} />
              </span>
              <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.15] mb-4">Gate responses that fail <span className="text-[#1860D3] dark:text-[#6FA8FF]">quality thresholds</span></h2>
              <p className="text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-5">LLM-as-judge runs server-side after each call. Set per-metric thresholds. Warn mode logs quality scores to the dashboard; block mode raises FluiqEvalError before the response reaches your app. And for agents, agentic evaluation judges the <em>whole run</em> — not just single answers.</p>
              <ul className="space-y-2 mb-6">
                {[
                  "hallucination, faithfulness, relevance, toxicity",
                  "Agentic eval scores tool selection, trajectory-vs-goal, and multi-agent coordination across the run's DAG",
                  "Borderline verdicts convene a multi-model judge jury — every member's score and reasoning kept for audit",
                  "Block mode prevents bad responses reaching users",
                ].map(pt => (
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

      {/* 5 · Datasets */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div data-animate>
              <span className="inline-flex items-center justify-center size-9 rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] text-[#1860D3] dark:text-[#6FA8FF] mb-5">
                <HugeiconsIcon icon={Database01Icon} size={16} />
              </span>
              <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.15] mb-4">Regression-test agents on <span className="text-[#1860D3] dark:text-[#6FA8FF]">real trajectories</span></h2>
              <p className="text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-5">Curate golden datasets straight from production traffic. Adding a run pins its <em>entire</em> trajectory — every agent step, tool call, and MCP call — so it stays evaluable forever, independent of trace retention. Then re-run agentic evaluation or the security suite over the whole set before you ship a prompt or model change.</p>
              <ul className="space-y-2 mb-6">
                {[
                  "One click pins a whole run: steps, tools, MCP calls, and media",
                  "Connect Agents imports every run an agent has made — and keeps auto-appending future ones",
                  "Batch agentic-eval and security runs produce a scored regression report",
                  "Examples carry live eval, security, and cost signals from their source runs",
                ].map(pt => (
                  <li key={pt} className="flex items-start gap-2.5 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]" />
                    {pt}
                  </li>
                ))}
              </ul>
              <div className="rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] px-3 py-2 font-mono text-[12px] text-[#6B6B66] dark:text-[#9A9A92] inline-block">
                Traces → Add to Dataset → Run Agentic Eval
              </div>
            </div>
            <div data-animate data-delay="2">
              <DatasetsMockup />
            </div>
          </div>
        </div>
      </section>

      {/* 6 · Prompt Management (reversed layout so adjacent sections zigzag;
          plain bg so the tinted "How it works" band below keeps its edge) */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div data-animate data-delay="2" className="lg:order-1">
              <PromptsMockup />
            </div>
            <div data-animate className="lg:order-2">
              <span className="inline-flex items-center justify-center size-9 rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] text-[#1860D3] dark:text-[#6FA8FF] mb-5">
                <HugeiconsIcon icon={AiContentGenerator01Icon} size={16} />
              </span>
              <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.15] mb-4">Write, version, and <span className="text-[#1860D3] dark:text-[#6FA8FF]">deploy prompts</span> like software</h2>
              <p className="text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-5">A dedicated IDE-style editor for your prompt templates, with <code className="font-mono text-[13px] text-[#0a0a0a] dark:text-[#FAF9F6]">{"{{variable}}"}</code> injection, full version history, and per-environment deployment. Iterate directly on real production traces, compare model outputs side-by-side, and ship with confidence.</p>
              <ul className="space-y-2 mb-6">
                {[
                  "{{variable}} template syntax: define slots, fill at runtime via SDK",
                  "Version history: save, browse, and restore any past version instantly",
                  "One-click deployment to dev, staging, and production environments",
                  "Side-by-side model comparison with the same prompt across models",
                  "Pull directly from live traces and iterate on real-world prompts",
                ].map(pt => (
                  <li key={pt} className="flex items-start gap-2.5 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]" />
                    {pt}
                  </li>
                ))}
              </ul>
              <div className="rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] px-3 py-2 font-mono text-[12px] text-[#6B6B66] dark:text-[#9A9A92] inline-block">
                fluiq.fetch_prompt("customer-support", env="production")
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20 bg-[#F2F0E9] dark:bg-[#0A0A0A]" id="how-it-works">
        <div className="mx-auto max-w-6xl px-6">
          <div data-animate className="mb-14 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1860D3] dark:text-[#6FA8FF] mb-4">How it works</p>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug">
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
          <div data-animate className="mt-10 rounded-[1.75rem] bg-black/[0.04] p-2 ring-1 ring-black/[0.06] shadow-[0_30px_70px_-22px_rgba(24,96,211,0.2)] dark:bg-white/[0.04] dark:ring-white/10">
          <div className="overflow-hidden rounded-[1.25rem] border border-white/[0.07] bg-[#0a0a0a] dark:bg-[#141414] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-white/10">
              <span className="flex items-center gap-2 text-[11px] text-[#6B6B66] font-mono">
                <HugeiconsIcon icon={isTs ? Typescript01Icon : PythonIcon} size={13} />
                Complete setup
              </span>
              <CodeLangToggle lang={codeLang} onChange={setCodeLang} />
            </div>
            <CodeBlock variant="dark" highlighted={syntaxHighlight(isTs ? SETUP_TS : SETUP_PY, codeLang)}>{isTs ? SETUP_TS : SETUP_PY}</CodeBlock>
          </div>
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
              <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug mb-4">Works with the stack you already use.</h2>
              <p className="text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-6">
                Fluiq patches at the function-call level, not the framework level. Any {isTs ? "" : "Python "}function that hits an LLM or vector database becomes a traced span with one {isTs ? "wrapper" : "decorator"}.
              </p>
              <div className="flex flex-wrap gap-2">
                {INTEGRATIONS.map((f) => (
                  <span key={f} className="rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9] dark:bg-[#1A1A1A] px-3 py-1 text-[12px] font-medium text-[#6B6B66] dark:text-[#9A9A92]">{f}</span>
                ))}
              </div>
            </div>
            <div data-animate data-delay="2" className="rounded-[1.75rem] bg-black/[0.04] p-2 ring-1 ring-black/[0.06] shadow-[0_30px_70px_-22px_rgba(24,96,211,0.2)] dark:bg-white/[0.04] dark:ring-white/10">
              <div className="overflow-hidden rounded-[1.25rem] border border-white/[0.07] bg-[#0a0a0a] dark:bg-[#141414] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
              <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-white/10">
                <span className="flex items-center gap-2 text-[11px] text-[#6B6B66] font-mono">
                  <HugeiconsIcon icon={isTs ? Typescript01Icon : PythonIcon} size={13} />
                  any_pipeline.{isTs ? "ts" : "py"}
                </span>
                <CodeLangToggle lang={codeLang} onChange={setCodeLang} />
              </div>
              <CodeBlock variant="dark" highlighted={syntaxHighlight(isTs ? PIPE_TS : PIPE_PY, codeLang)}>{isTs ? PIPE_TS : PIPE_PY}</CodeBlock>
              </div>
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
            <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6] md:text-5xl"><span className="text-[#1860D3] dark:text-[#6FA8FF]">Unlimited</span> traces, always free.</h2>
            <p className="mt-4 text-[16px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed max-w-xl mx-auto">
              Start with observability on the free tier. Add security, optimization, and evaluation as your pipeline grows. No code changes required.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <IslandCta to="/signup">Start free</IslandCta>
              <IslandCta to="/documentation" variant="ghost">Read the docs</IslandCta>
            </div>
            <p className="mt-5 text-[12px] text-[#9A9A92]">No credit card required. pip install fluiq, instrument in 60 seconds.</p>
          </div>
        </div>
      </section>

      <SiteFooter />

    </div>
  )
}
