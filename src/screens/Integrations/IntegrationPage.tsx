"use client"

import { useState } from "react"
import { Link } from "react-router"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight02Icon,
  EyeIcon,
  ShieldIcon,
  ZapIcon,
  SparklesIcon,
  TestTube01Icon,
  FlashIcon,
  AiContentGenerator01Icon,
  CheckmarkCircle02Icon,
  PythonIcon,
  Typescript01Icon,
} from "@hugeicons/core-free-icons"
import { IslandCta } from "@/components/IslandCta"
import { CodeBlock } from "@/components/code-block"
import { SiteFooter } from "@/components/SiteFooter"
import { SiteNavbar } from "@/components/SiteNavbar"
import { GrainOverlay, HeroAtmosphere } from "@/components/SiteBackdrop"
import { useScrollReveal } from "@/pages/Home/hooks/useScrollReveal"
import { syntaxHighlight } from "@/pages/Documentation/syntaxHighlight"
import { type IntegrationData, type Category, INTEGRATION_META, INTEGRATION_TS } from "./data"

type SetupLang = "python" | "typescript"

const EASE_OUT = [0.22, 1, 0.36, 1] as const

const ICONS = {
  eye: EyeIcon,
  shield: ShieldIcon,
  zap: ZapIcon,
  sparkle: SparklesIcon,
  test: TestTube01Icon,
  flash: FlashIcon,
  cpu: AiContentGenerator01Icon,
} as const

const CATEGORY_STYLES: Record<Category, { badge: string; dot: string; glow: string }> = {
  "LLM Provider":      { badge: "text-[#1860D3] dark:text-[#6FA8FF] bg-blue-50 dark:bg-[#18244A]/30 border-[#1860D3]/20 dark:border-[#6FA8FF]/15",     dot: "bg-[#1860D3] dark:bg-[#6FA8FF]",       glow: "rgba(24,96,211,0.07)" },
  "Agent Framework":   { badge: "text-[#7C3AED] dark:text-[#A78BFA] bg-purple-50 dark:bg-purple-900/20 border-purple-200/60 dark:border-purple-700/30", dot: "bg-[#7C3AED] dark:bg-[#A78BFA]",       glow: "rgba(124,58,237,0.07)" },
  "Vector Database":   { badge: "text-[#2D7A4F] dark:text-[#4ADE80] bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-700/30", dot: "bg-[#2D7A4F] dark:bg-[#4ADE80]", glow: "rgba(45,122,79,0.07)" },
}

export default function IntegrationPage({ data }: { data: IntegrationData }) {
  useScrollReveal()

  const cat = CATEGORY_STYLES[data.category]

  // TypeScript equivalent exists only for SDK-supported integrations (Python has more).
  const ts = INTEGRATION_TS[data.slug]
  const [lang, setLang] = useState<SetupLang>("python")
  const activeLang: SetupLang = ts ? lang : "python"
  const setupCode = activeLang === "typescript" && ts ? ts.setupCode : data.setupCode
  const instrumentedItems =
    activeLang === "typescript" && ts ? ts.instrumentedItems : data.instrumentedItems

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">
      <GrainOverlay />
{/* ── Nav ─────────────────────────────────────────────────────────── */}
      <SiteNavbar active="integrations" />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20 md:py-28">
        <HeroAtmosphere variant="center" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
          {/* Breadcrumb */}
          <motion.div className="mb-5 flex items-center justify-center gap-2 text-[13px] text-[#9A9A92]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.05 }}>
            <Link to="/integrations" className="hover:text-[#6B6B66] dark:hover:text-[#9A9A92] transition-colors">Integrations</Link>
            <span>/</span>
            <span className="text-[#6B6B66] dark:text-[#9A9A92]">{data.name}</span>
          </motion.div>

          <motion.div className="mb-5"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-[12px] font-semibold ${cat.badge}`}>
              <span className={`size-1.5 rounded-full ${cat.dot}`} />
              {data.category}
            </span>
          </motion.div>

          <motion.h1
            className="font-heading mx-auto max-w-3xl text-4xl font-bold tracking-[-0.03em] leading-[1.1] md:text-5xl"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE_OUT }}>
            {data.heroHeadline}
          </motion.h1>

          <motion.p
            className="mt-5 mx-auto max-w-xl text-[17px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: EASE_OUT }}>
            {data.heroSub}
          </motion.p>

          <motion.div className="mt-8 flex flex-wrap items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: EASE_OUT }}>
            <IslandCta to="/signup">Get started free</IslandCta>
            <IslandCta to="/documentation" variant="ghost">Read the docs</IslandCta>
          </motion.div>

          <motion.p className="mt-4 text-[12px] text-[#9A9A92]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}>
            Free tier · No credit card · 2-minute setup
          </motion.p>
        </div>
      </section>

      {/* ── Feature cards ───────────────────────────────────────────────── */}
      <section className="border-b border-[#E5E1D6] dark:border-[#2A2A2A] py-18">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 text-center" data-animate>
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              What you get with Fluiq for {data.name}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3" data-animate data-delay="1">
            {data.features.map((f, i) => {
              const Icon = ICONS[f.icon]
              return (
                <div key={i} className="rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-white dark:bg-[#0E0E0E] p-6">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2F0E9] dark:bg-[#1A1A1A]">
                    <HugeiconsIcon icon={Icon} size={18} className="text-[#0a0a0a] dark:text-[#FAF9F6]" />
                  </div>
                  <h3 className="font-heading text-[15px] font-semibold mb-2">{f.title}</h3>
                  <p className="text-[14px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Setup code ──────────────────────────────────────────────────── */}
      <section className="border-b border-[#1A1A1A] bg-[#0a0a0a] dark:bg-[#060606] py-18">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-8 flex items-start justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#6FA8FF]">
                Setup
              </span>
              <h2 className="font-heading mt-4 text-2xl font-bold tracking-tight text-white">
                Add Fluiq to your {data.name} app in 2 lines
              </h2>
              {data.setupNote && (
                <p className="mt-2 text-[14px] text-[#6B6B66]">{data.setupNote}</p>
              )}
            </div>
            <div className="hidden md:flex items-center gap-3 shrink-0 pt-8">
              <div className="flex items-center gap-1.5 text-[13px] text-[#6B6B66]">
                <span className="size-2 rounded-full bg-emerald-500" />
                auto-instrumented
              </div>
            </div>
          </div>
          <div className="rounded-[1.75rem] bg-white/[0.04] p-2 ring-1 ring-white/10 shadow-[0_30px_70px_-28px_rgba(111,168,255,0.25)]">
            <div className="rounded-[1.25rem] border border-white/[0.07] bg-[#111111] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
              {/* Language toggle — top right of the code block (only when a TS sample exists) */}
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#6B6B66]">
                  <HugeiconsIcon icon={activeLang === "typescript" ? Typescript01Icon : PythonIcon} size={13} />
                  {activeLang === "typescript" ? "TypeScript" : "Python"}
                </span>
                {ts && (
                  <div className="flex gap-0.5 rounded-lg border border-white/[0.07] bg-white/[0.04] p-0.5">
                    {(["python", "typescript"] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLang(l)}
                        aria-pressed={activeLang === l}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          activeLang === l
                            ? "bg-[#6FA8FF] text-[#0A0A0A]"
                            : "text-[#9A9A92] hover:text-white"
                        }`}
                      >
                        {l === "python" ? "Python" : "TypeScript"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <CodeBlock variant="dark" highlighted={syntaxHighlight(setupCode, activeLang)}>{setupCode}</CodeBlock>
            </div>
          </div>
        </div>
      </section>

      {/* ── What gets instrumented ──────────────────────────────────────── */}
      <section className="border-b border-[#E5E1D6] dark:border-[#2A2A2A] py-18">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-8" data-animate>
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              What Fluiq instruments in {data.name}
            </h2>
            <p className="mt-2 text-[14px] text-[#6B6B66] dark:text-[#9A9A92]">
              Every call to these methods is automatically traced, no decorators, no wrappers, no manual spans.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" data-animate data-delay="1">
            {instrumentedItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9]/40 dark:bg-[#111111]/40 px-4 py-3">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="shrink-0 text-emerald-600 dark:text-emerald-500" />
                <code className="font-mono text-[13px] text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug">{item}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related integrations ─────────────────────────────────────────── */}
      <section className="border-b border-[#E5E1D6] dark:border-[#2A2A2A] py-18 bg-[#F2F0E9]/30 dark:bg-[#0A0A0A]">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-8" data-animate>
            <h2 className="font-heading text-xl font-bold tracking-tight">
              Works great with
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-animate data-delay="1">
            {data.relatedSlugs.map((slug) => {
              const meta = INTEGRATION_META[slug]
              if (!meta) return null
              const relCat = CATEGORY_STYLES[meta.category]
              return (
                <Link key={slug} to={`/integrations/${slug}`}
                  className="group flex items-center gap-3.5 rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-white dark:bg-[#0E0E0E] px-5 py-4 hover:border-[#D4CFC1] dark:hover:border-[#333333] transition-colors">
                  <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${relCat.badge}`}>
                    {meta.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold truncate group-hover:text-[#1860D3] dark:group-hover:text-[#6FA8FF] transition-colors">
                      {meta.name}
                    </p>
                    <p className="text-[12px] text-[#9A9A92] truncate">{meta.category}</p>
                  </div>
                  <HugeiconsIcon icon={ArrowRight02Icon} size={14} className="ml-auto shrink-0 text-[#D4CFC1] dark:text-[#333333] group-hover:text-[#6B6B66] dark:group-hover:text-[#9A9A92] transition-colors" />
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-2xl px-6 text-center" data-animate>
          <h2 className="font-heading text-3xl font-bold tracking-[-0.02em]">
            Start tracing {data.name} in 2 minutes
          </h2>
          <p className="mt-4 text-[16px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
            Free tier. No credit card. Full traces, security scanning, and evals on your first {data.name} call.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <IslandCta to="/signup">Start free</IslandCta>
          </div>
          <p className="mt-4 text-[12px] text-[#9A9A92]">
            Unlimited free traces · 1,000 evals / month · 14-day retention
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
