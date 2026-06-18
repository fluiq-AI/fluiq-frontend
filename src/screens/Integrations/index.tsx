"use client"

import { Link } from "react-router"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight02Icon } from "@hugeicons/core-free-icons"
import { IslandCta } from "@/components/IslandCta"
import { SiteFooter } from "@/components/SiteFooter"
import { SiteNavbar } from "@/components/SiteNavbar"
import { GrainOverlay, HeroAtmosphere } from "@/components/SiteBackdrop"
import { useScrollReveal } from "@/pages/Home/hooks/useScrollReveal"
import { INTEGRATIONS, type Category } from "./data"

const EASE_OUT = [0.22, 1, 0.36, 1] as const

const CATEGORY_ORDER: Category[] = ["LLM Provider", "Agent Framework", "Vector Database"]

const CATEGORY_STYLES: Record<Category, { badge: string; dot: string }> = {
  "LLM Provider":    { badge: "text-[#1860D3] dark:text-[#6FA8FF] bg-blue-50 dark:bg-[#18244A]/30 border-[#1860D3]/20 dark:border-[#6FA8FF]/15",       dot: "bg-[#1860D3] dark:bg-[#6FA8FF]" },
  "Agent Framework": { badge: "text-[#7C3AED] dark:text-[#A78BFA] bg-purple-50 dark:bg-purple-900/20 border-purple-200/60 dark:border-purple-700/30",   dot: "bg-[#7C3AED] dark:bg-[#A78BFA]" },
  "Vector Database": { badge: "text-[#2D7A4F] dark:text-[#4ADE80] bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-700/30", dot: "bg-[#2D7A4F] dark:bg-[#4ADE80]" },
}

const CATEGORY_DESC: Record<Category, string> = {
  "LLM Provider":    "OpenAI, Anthropic, Gemini, Vertex AI, every provider call traced with token counts and USD cost.",
  "Agent Framework": "LangChain, LangGraph, CrewAI, Google ADK, MCP, full agent span trees.",
  "Vector Database": "Pinecone, Chroma, Weaviate, FAISS, Qdrant, query latency and RAG pipeline child spans.",
}

export default function IntegrationsIndex() {
  useScrollReveal()

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: INTEGRATIONS.filter((i) => i.category === cat),
  }))

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">
      <GrainOverlay />
{/* ── Nav ─────────────────────────────────────────────────────────── */}
      <SiteNavbar active="integrations" />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20 md:py-28">
        <HeroAtmosphere variant="center" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
          <motion.div className="mb-5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9]/80 dark:bg-[#1A1A1A]/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#1860D3] dark:text-[#6FA8FF]">
              <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
              14 integrations
            </span>
          </motion.div>

          <motion.h1
            className="font-heading mx-auto max-w-3xl text-4xl font-bold tracking-[-0.03em] leading-[1.1] md:text-5xl"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT }}>
            LLM Monitoring for Every Framework You Use
          </motion.h1>

          <motion.p
            className="mt-5 mx-auto max-w-xl text-[17px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE_OUT }}>
            Fluiq auto-instruments every major LLM provider, agent framework, and vector database with two lines of Python, zero decorators, zero wrappers, zero code changes to your existing code.
          </motion.p>

          <motion.div className="mt-8 flex flex-wrap items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: EASE_OUT }}>
            <IslandCta to="/signup">Get started free</IslandCta>
            <IslandCta to="/documentation/quickstart" variant="ghost">Quickstart guide</IslandCta>
          </motion.div>
        </div>
      </section>

      {/* ── Integration groups ───────────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6 space-y-16">
          {grouped.map(({ category, items }, gi) => {
            const style = CATEGORY_STYLES[category]
            return (
              <div key={category} data-animate data-delay={`${gi + 1}` as "1" | "2" | "3" | "4"}>
                {/* Category header */}
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold ${style.badge}`}>
                      <span className={`size-1.5 rounded-full ${style.dot}`} />
                      {category}
                    </span>
                    <span className="text-[13px] text-[#9A9A92]">{items.length} integrations</span>
                  </div>
                  <p className="text-[13px] text-[#9A9A92] max-w-sm">{CATEGORY_DESC[category]}</p>
                </div>

                {/* Integration cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((integration) => (
                    <Link key={integration.slug} to={`/integrations/${integration.slug}`}
                      className="group flex items-start gap-4 rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-white dark:bg-[#0E0E0E] p-5 hover:border-[#D4CFC1] dark:hover:border-[#333333] hover:shadow-sm dark:hover:shadow-none transition-all">
                      {/* Avatar */}
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-[13px] font-bold ${style.badge}`}>
                        {integration.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading text-[15px] font-semibold group-hover:text-[#1860D3] dark:group-hover:text-[#6FA8FF] transition-colors">
                            {integration.name}
                          </h3>
                          <HugeiconsIcon icon={ArrowRight02Icon} size={13} className="text-[#D4CFC1] dark:text-[#333333] group-hover:text-[#1860D3] dark:group-hover:text-[#6FA8FF] transition-colors shrink-0" />
                        </div>
                        <p className="mt-1 text-[13px] text-[#6B6B66] dark:text-[#9A9A92] leading-snug line-clamp-2">
                          {integration.heroSub.split(".")[0]}.
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="border-t border-[#E5E1D6] dark:border-[#2A2A2A] py-24">
        <div className="mx-auto max-w-2xl px-6 text-center" data-animate>
          <h2 className="font-heading text-3xl font-bold tracking-[-0.02em]">
            Don't see your framework?
          </h2>
          <p className="mt-4 text-[16px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
            Use the <code className="font-mono text-[14px] bg-[#F2F0E9] dark:bg-[#1A1A1A] px-1.5 py-0.5 rounded">@trace</code> decorator to manually instrument any Python function. Or reach out, new integrations ship regularly.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <IslandCta to="/signup">Start free</IslandCta>
            <IslandCta to="/contact" variant="ghost">Request an integration</IslandCta>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
