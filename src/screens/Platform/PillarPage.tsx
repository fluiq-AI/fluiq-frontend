"use client"

import "@/styles/home.css"
import React, { useCallback } from "react"
import { Link } from "react-router"
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PythonIcon,
  CheckmarkCircle02Icon,
  ArrowRight02Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

import { CodeBlock } from "@/components/code-block"
import { syntaxHighlight } from "@/pages/Documentation/syntaxHighlight"
import { useScrollReveal } from "@/pages/Home/hooks/useScrollReveal"
import { SiteNavbar } from "@/components/SiteNavbar"
import { SiteFooter } from "@/components/SiteFooter"
import { GrainOverlay, HeroAtmosphere } from "@/components/SiteBackdrop"
import { IslandCta } from "@/components/IslandCta"
import { EASE_OUT } from "@/pages/Home/utils/constants"
import { PILLARS, PILLAR_ORDER, type PillarSlug } from "./data"

const border = "border-[#D4CFC1] dark:border-[#1A1A1A]"
const panelBorder = "border-[#E5E1D6] dark:border-[#2A2A2A]"

export default function PillarPage({ slug }: { slug: PillarSlug }) {
  useScrollReveal()
  const reduce = useReducedMotion()
  const pillar = PILLARS[slug]
  const others = PILLAR_ORDER.filter((s) => s !== slug).map((s) => PILLARS[s])

  // Cursor-tilt on the framed product window, matching the home hero.
  const rotYRaw = useMotionValue(-5); const rotXRaw = useMotionValue(2)
  const rotY = useSpring(rotYRaw, { stiffness: 180, damping: 26 })
  const rotX = useSpring(rotXRaw, { stiffness: 180, damping: 26 })
  const handleTilt = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    rotYRaw.set(((e.clientX - r.left) / r.width - 0.5) * 8 - 3)
    rotXRaw.set(((e.clientY - r.top) / r.height - 0.5) * -5 + 1)
  }, [rotYRaw, rotXRaw])
  const resetTilt = useCallback(() => { rotYRaw.set(-5); rotXRaw.set(2) }, [rotYRaw, rotXRaw])

  const { Mockup } = pillar

  return (
    <div className="home-page min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">
      <GrainOverlay />
      <SiteNavbar active="platform" />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className={`relative overflow-hidden border-b ${border}`}>
        <HeroAtmosphere variant="offset" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-10">
            <div className="flex flex-col lg:col-span-6">
              <motion.div className="mb-6 flex items-center gap-2.5"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.05 }}>
                <span className="block h-px w-5 shrink-0 bg-[#1860D3] dark:bg-[#6FA8FF]" />
                <span className="text-[#1860D3] dark:text-[#6FA8FF]"
                  style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                  {pillar.eyebrow}
                </span>
              </motion.div>

              <motion.h1
                className="mb-6 font-heading text-[2.5rem] font-bold leading-[1.02] tracking-[-0.03em] text-[#0A0A0A] sm:text-5xl lg:text-[3.5rem] dark:text-[#FAF9F6]"
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.12, ease: EASE_OUT }}>
                {pillar.headline}
              </motion.h1>

              <motion.p className="mb-8 max-w-[32rem] text-[15px] leading-[1.7] text-[#6B6B66] dark:text-[#9A9A92]"
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.22, ease: EASE_OUT }}>
                {pillar.lede}
              </motion.p>

              <motion.div className="flex flex-wrap items-center gap-3"
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.32, ease: EASE_OUT }}>
                <IslandCta to="/signup">Start free</IslandCta>
                <IslandCta to={pillar.docHref} variant="ghost">Read the docs</IslandCta>
              </motion.div>
            </div>

            {/* Framed product window, floated with the cobalt-tinted shadow. */}
            <motion.div
              className="lg:col-span-6 lg:col-start-7"
              initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: EASE_OUT }}
              onMouseMove={reduce ? undefined : handleTilt} onMouseLeave={reduce ? undefined : resetTilt}>
              <motion.div
                className="rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06),0_30px_70px_-18px_rgba(24,96,211,0.26)]"
                style={{ rotateY: rotY, rotateX: rotX, transformPerspective: 1400 }}>
                <Mockup />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Capabilities ─────────────────────────────────────────────────── */}
      <section className={`border-b ${border} py-24`}>
        <div className="mx-auto max-w-6xl px-6">
          <h2 data-animate className="max-w-2xl font-heading text-4xl font-bold leading-[1.15] tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6]">
            What you get
          </h2>
          <div data-animate data-delay="1" className={`mt-10 grid gap-px overflow-hidden rounded-2xl border ${panelBorder} bg-[#D4CFC1] dark:bg-[#2A2A2A] sm:grid-cols-2 lg:grid-cols-3`}>
            {pillar.capabilities.map((cap) => (
              <div key={cap.title} className="bg-[#FAF9F6] p-7 dark:bg-[#1A1A1A]">
                <p className="mb-3 font-mono text-[11px] text-[#1860D3] dark:text-[#6FA8FF]">{cap.kicker}</p>
                <h3 className="mb-2 text-[17px] font-semibold tracking-[-0.01em] text-[#0a0a0a] dark:text-[#FAF9F6]">{cap.title}</h3>
                <p className="text-[13.5px] leading-relaxed text-[#6B6B66] dark:text-[#9A9A92]">{cap.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mechanism + code ─────────────────────────────────────────────── */}
      <section className={`border-b ${border} bg-[#F7F6F1] py-24 dark:bg-[#0D0D0D]`}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div data-animate>
              <h2 className="mb-5 font-heading text-4xl font-bold leading-[1.15] tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6]">
                {pillar.mechanism.heading}
              </h2>
              <ul className="mb-6 space-y-3">
                {pillar.mechanism.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-[#6B6B66] dark:text-[#9A9A92]">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]" />
                    {pt}
                  </li>
                ))}
              </ul>
              <span className={`inline-flex items-center rounded-full border ${panelBorder} bg-[#F2F0E9] px-3 py-1 font-mono text-[11px] text-[#6B6B66] dark:bg-[#1A1A1A] dark:text-[#9A9A92]`}>
                {pillar.plan}
              </span>
            </div>

            <div data-animate data-delay="2" className="rounded-[1.75rem] bg-black/[0.04] p-2 ring-1 ring-black/[0.06] shadow-[0_30px_70px_-22px_rgba(24,96,211,0.2)] dark:bg-white/[0.04] dark:ring-white/10">
              <div className="overflow-hidden rounded-[1.25rem] border border-white/[0.07] bg-[#0a0a0a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] dark:bg-[#141414]">
                <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
                  <span className="flex items-center gap-2 font-mono text-[11px] text-[#6B6B66]">
                    <HugeiconsIcon icon={PythonIcon} size={13} />
                    {pillar.mechanism.file}
                  </span>
                </div>
                <CodeBlock variant="dark" highlighted={syntaxHighlight(pillar.mechanism.code, "python")}>
                  {pillar.mechanism.code}
                </CodeBlock>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Part of the platform (cross-links) ───────────────────────────── */}
      <section className={`border-b ${border} py-20`}>
        <div className="mx-auto max-w-6xl px-6">
          <div data-animate className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6]">
              Part of the Fluiq platform
            </h2>
            <Link to="/pricing" className="text-[13px] font-medium text-[#1860D3] hover:underline dark:text-[#6FA8FF]">
              Compare plans
            </Link>
          </div>
          <div data-animate data-delay="1" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {others.map((p) => (
              <Link
                key={p.slug}
                to={p.route}
                className={`group flex flex-col rounded-2xl border ${panelBorder} bg-[#FAF9F6] p-5 transition-colors hover:border-[#1860D3]/40 dark:bg-[#1A1A1A] dark:hover:border-[#6FA8FF]/40`}
              >
                <span className={`mb-4 inline-flex size-9 items-center justify-center rounded-lg border ${panelBorder} bg-white text-[#1860D3] dark:bg-[#0A0A0A] dark:text-[#6FA8FF]`}>
                  <HugeiconsIcon icon={p.icon as never} size={16} />
                </span>
                <span className="mb-1 text-[14px] font-semibold text-[#0a0a0a] dark:text-[#FAF9F6]">{p.name}</span>
                <span className="text-[12.5px] leading-relaxed text-[#6B6B66] dark:text-[#9A9A92]">{p.summary}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-[#1860D3] dark:text-[#6FA8FF]">
                  Explore
                  <HugeiconsIcon icon={ArrowRight02Icon} size={12} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div data-animate>
            <div className="mb-6 inline-flex size-12 items-center justify-center rounded-2xl bg-[#0a0a0a] text-white dark:bg-[#FAF9F6] dark:text-[#0A0A0A]">
              <HugeiconsIcon icon={SparklesIcon} size={22} />
            </div>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] md:text-5xl dark:text-[#FAF9F6]">
              Free up to <span className="text-[#1860D3] dark:text-[#6FA8FF]">50K</span> traces a month.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[#6B6B66] dark:text-[#9A9A92]">
              Start on the free tier and turn on each pillar as your pipeline grows. No code changes required.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <IslandCta to="/signup">Start free</IslandCta>
              <IslandCta to={pillar.docHref} variant="ghost">Read the docs</IslandCta>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
