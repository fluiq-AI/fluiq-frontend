"use client"

import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { IslandCta } from "@/components/IslandCta"
import { CodeBlock } from "@/components/code-block"
import { useScrollReveal } from "@/pages/Home/hooks/useScrollReveal"
import { SiteFooter } from "@/components/SiteFooter"
import { SiteNavbar } from "@/components/SiteNavbar"
import { GrainOverlay, HeroAtmosphere } from "@/components/SiteBackdrop"

const EASE_OUT = [0.22, 1, 0.36, 1] as const

export interface FeatureRow {
  feature: string
  fluiq: "yes" | "no" | "partial"
  competitor: "yes" | "no" | "partial"
  fluiqNote?: string
  competitorNote?: string
}

export interface CompetitorData {
  slug: string
  name: string
  metaTitle: string
  metaDescription: string
  canonicalPath: string
  heroHeadline: string
  heroSub: string
  stats: { value: string; label: string }[]
  features: FeatureRow[]
  competitorPros: string[]
  fluiqAdvantages: string[]
  migrationBefore: { label: string; code: string }
  migrationAfter: { label: string; code: string }
  migrationNote?: string
}

function StatusCell({ status, note }: { status: "yes" | "no" | "partial"; note?: string }) {
  if (status === "yes") {
    return (
      <div className="flex items-center gap-2" title={note}>
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-emerald-600 dark:text-emerald-500 shrink-0" />
        {note && <span className="text-[12px] text-[#6B6B66] dark:text-[#9A9A92] leading-tight">{note}</span>}
      </div>
    )
  }
  if (status === "partial") {
    return (
      <div className="flex items-center gap-2" title={note}>
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-amber-300 dark:border-amber-600/50 bg-amber-50 dark:bg-amber-900/20 text-[10px] font-bold text-amber-600 dark:text-amber-400">
          ~
        </span>
        {note && <span className="text-[12px] text-[#6B6B66] dark:text-[#9A9A92] leading-tight">{note}</span>}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2" title={note}>
      <span className="inline-block h-px w-4 shrink-0 rounded-full bg-[#D4CFC1] dark:bg-[#333333]" />
      {note && <span className="text-[12px] text-[#6B6B66] dark:text-[#9A9A92] leading-tight">{note}</span>}
    </div>
  )
}

export default function ComparisonPage({ data }: { data: CompetitorData }) {
  useScrollReveal()

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">
      <GrainOverlay />
{/* ── Nav ─────────────────────────────────────────────────────────── */}
      <SiteNavbar />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-24 md:py-32">
        <HeroAtmosphere variant="center" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
          <motion.div className="mb-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9]/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm px-4 py-1.5 text-[12px]">
              <span className="font-semibold text-[#1860D3] dark:text-[#6FA8FF]">Fluiq</span>
              <span className="text-[#D4CFC1] dark:text-[#444]">vs</span>
              <span className="font-semibold text-[#6B6B66] dark:text-[#9A9A92]">{data.name}</span>
            </div>
          </motion.div>

          <motion.h1
            className="font-heading mx-auto max-w-4xl text-4xl font-bold tracking-[-0.03em] leading-[1.1] md:text-5xl lg:text-[3.5rem]"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE_OUT }}>
            {data.heroHeadline}
          </motion.h1>

          <motion.p
            className="mt-5 mx-auto max-w-xl text-[18px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: EASE_OUT }}>
            {data.heroSub}
          </motion.p>

          <motion.div className="mt-9 flex flex-wrap items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: EASE_OUT }}>
            <IslandCta to="/signup">Get started free</IslandCta>
            <IslandCta to="/documentation" variant="ghost">Read the docs</IslandCta>
          </motion.div>

          <motion.p className="mt-5 text-[12px] text-[#9A9A92]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.45 }}>
            Free tier · No credit card · 2-minute setup
          </motion.p>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <section className="border-b border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9]/50 dark:bg-[#111111]/50 py-5">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">
            {data.stats.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-[#1860D3] dark:bg-[#6FA8FF]" />
                <span className="font-semibold text-[#0a0a0a] dark:text-[#FAF9F6]">{s.value}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison table ─────────────────────────────────────────────── */}
      <section className="border-b border-[#E5E1D6] dark:border-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-10 text-center" data-animate>
            <h2 className="font-heading text-3xl font-bold tracking-tight">Feature comparison</h2>
            <p className="mt-3 text-[15px] text-[#6B6B66] dark:text-[#9A9A92]">
              How Fluiq and {data.name} stack up across the features that matter in production.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A]" data-animate data-delay="1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_140px_140px] bg-[#0a0a0a] dark:bg-[#111111] px-6 py-4">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B6B66]">Feature</span>
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="Fluiq" className="size-4 brightness-0 invert opacity-80" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white">Fluiq</span>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B6B66]">{data.name}</span>
            </div>

            {/* Rows */}
            {data.features.map((row, i) => (
              <div key={i} className={`grid grid-cols-[1fr_140px_140px] items-center px-6 py-3.5 border-t border-[#E5E1D6] dark:border-[#2A2A2A] ${
                i % 2 === 0 ? "bg-white dark:bg-[#0E0E0E]" : "bg-[#FAFAF8] dark:bg-[#0A0A0A]"
              }`}>
                <span className="text-[14px] pr-6 leading-snug">{row.feature}</span>
                <StatusCell status={row.fluiq} note={row.fluiqNote} />
                <StatusCell status={row.competitor} note={row.competitorNote} />
              </div>
            ))}
          </div>

          <p className="mt-4 text-center text-[12px] text-[#9A9A92]">
~ = partial support &nbsp;·&nbsp; - = not available
          </p>
        </div>
      </section>

      {/* ── Honest take ─────────────────────────────────────────────────── */}
      <section className="border-b border-[#E5E1D6] dark:border-[#2A2A2A] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 text-center" data-animate>
            <h2 className="font-heading text-3xl font-bold tracking-tight">An honest take</h2>
            <p className="mt-3 text-[15px] text-[#6B6B66] dark:text-[#9A9A92]">
              We'll be straight. Here's where {data.name} genuinely excels, and where Fluiq goes further.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2" data-animate data-delay="1">
            {/* Competitor pros */}
            <div className="rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9]/40 dark:bg-[#111111]/40 p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E5E1D6] dark:bg-[#2A2A2A]">
                  <HugeiconsIcon icon={SparklesIcon} size={15} className="text-[#6B6B66] dark:text-[#9A9A92]" />
                </div>
                <h3 className="font-heading text-[16px] font-semibold">Where {data.name} shines</h3>
              </div>
              <ul className="space-y-3.5">
                {data.competitorPros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] text-[#6B6B66] dark:text-[#9A9A92] leading-snug">
                    <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-[#D4CFC1] dark:bg-[#333333]" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>

            {/* Fluiq advantages */}
            <div className="rounded-2xl border border-[#1860D3]/20 dark:border-[#6FA8FF]/15 bg-blue-50/30 dark:bg-[#18244A]/20 p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1860D3]/10 dark:bg-[#6FA8FF]/10">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} className="text-[#1860D3] dark:text-[#6FA8FF]" />
                </div>
                <h3 className="font-heading text-[16px] font-semibold">Where Fluiq pulls ahead</h3>
              </div>
              <ul className="space-y-3.5">
                {data.fluiqAdvantages.map((adv, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] text-[#6B6B66] dark:text-[#9A9A92] leading-snug">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="mt-[2px] shrink-0 text-emerald-600 dark:text-emerald-500" />
                    {adv}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Migration code ──────────────────────────────────────────────── */}
      <section className="border-b border-[#1A1A1A] bg-[#0a0a0a] dark:bg-[#060606] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#6FA8FF]">
              Migration guide
            </span>
            <h2 className="font-heading mt-5 text-3xl font-bold tracking-tight text-white">
              Switch from {data.name} in minutes
            </h2>
            {data.migrationNote && (
              <p className="mt-3 text-[15px] text-[#6B6B66]">{data.migrationNote}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#6B6B66]">
                {data.migrationBefore.label}
              </p>
              <div className="rounded-[1.5rem] bg-white/[0.04] p-2 ring-1 ring-white/10">
                <div className="rounded-[1rem] border border-white/[0.07] bg-[#111111] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
                  <CodeBlock variant="dark">
                    {data.migrationBefore.code}
                  </CodeBlock>
                </div>
              </div>
            </div>
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#6FA8FF]">
                {data.migrationAfter.label}
              </p>
              <div className="rounded-[1.5rem] bg-[#1860D3]/[0.12] p-2 ring-1 ring-[#6FA8FF]/25">
                <div className="rounded-[1rem] border border-[#1860D3]/30 bg-[#111111] overflow-hidden shadow-[inset_0_1px_1px_rgba(111,168,255,0.12)]">
                  <CodeBlock variant="dark">
                    {data.migrationAfter.code}
                  </CodeBlock>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-2xl px-6 text-center" data-animate>
          <h2 className="font-heading text-4xl font-bold tracking-[-0.02em]">
            Ready to switch?
          </h2>
          <p className="mt-4 text-[17px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
            Free tier. No credit card. Full observability, security, and evals on your first LLM call.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
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
