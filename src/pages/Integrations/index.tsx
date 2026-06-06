import { Helmet } from "react-helmet-async"
import { useEffect, useState } from "react"
import { Link } from "react-router"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { ArrowRight02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { SiteFooter } from "@/components/SiteFooter"
import { NavIntegrationsDropdown } from "@/components/NavIntegrationsDropdown"
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
  "LLM Provider":    "OpenAI, Anthropic, Gemini, Vertex AI — every provider call traced with token counts and USD cost.",
  "Agent Framework": "LangChain, LangGraph, CrewAI, Google ADK, MCP — full agent span trees.",
  "Vector Database": "Pinecone, Chroma, Weaviate, FAISS, Qdrant — query latency and RAG pipeline child spans.",
}

export default function IntegrationsIndex() {
  useScrollReveal()
  const [navScrolled, setNavScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: INTEGRATIONS.filter((i) => i.category === cat),
  }))

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">
      <Helmet>
        <title>Fluiq Integrations — LLM Monitoring for OpenAI, LangChain, Pinecone & More</title>
        <meta name="description" content="Fluiq auto-instruments 14 LLM providers, agent frameworks, and vector databases — OpenAI, Anthropic, LangChain, CrewAI, Pinecone, and more. Two lines of Python." />
        <link rel="canonical" href="https://getfluiq.com/integrations" />
        <meta property="og:title" content="Fluiq Integrations — LLM Monitoring for 14 Frameworks" />
        <meta property="og:description" content="Auto-instrument OpenAI, Anthropic, Gemini, LangChain, CrewAI, Pinecone, and more with two lines of Python." />
        <meta property="og:url" content="https://getfluiq.com/integrations" />
      </Helmet>

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
            <Link to="/" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Platform</Link>
            <NavIntegrationsDropdown triggerClassName="text-[#0a0a0a] dark:text-[#FAF9F6] font-medium" />
            <Link to="/documentation" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Docs</Link>
            <Link to="/pricing" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="text-[#6B6B66] dark:text-[#9A9A92] hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6]" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button size="sm" className="bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9]" asChild>
              <Link to="/signup">Get started <HugeiconsIcon icon={ArrowRight02Icon} size={14} /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20 md:py-28">
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
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(24,96,211,0.07) 0%, transparent 65%)" }} />
        </div>

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
            Fluiq auto-instruments every major LLM provider, agent framework, and vector database with two lines of Python — zero decorators, zero wrappers, zero code changes to your existing code.
          </motion.p>

          <motion.div className="mt-8 flex flex-wrap items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: EASE_OUT }}>
            <Button size="lg"
              className="bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9] px-8 h-12 text-[15px] font-semibold"
              asChild>
              <Link to="/signup">Get started free <HugeiconsIcon icon={ArrowRight02Icon} size={15} /></Link>
            </Button>
            <Button size="lg" variant="outline"
              className="border-[#E5E1D6] dark:border-[#2A2A2A] text-[#6B6B66] dark:text-[#9A9A92] hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] h-12 px-8 text-[15px]"
              asChild>
              <Link to="/documentation/quickstart">Quickstart guide</Link>
            </Button>
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
            Use the <code className="font-mono text-[14px] bg-[#F2F0E9] dark:bg-[#1A1A1A] px-1.5 py-0.5 rounded">@trace</code> decorator to manually instrument any Python function. Or reach out — new integrations ship regularly.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg"
              className="bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9] px-10 h-12 text-[15px] font-semibold"
              asChild>
              <Link to="/signup">Start free <HugeiconsIcon icon={ArrowRight02Icon} size={16} /></Link>
            </Button>
            <Button size="lg" variant="outline"
              className="border-[#E5E1D6] dark:border-[#2A2A2A] text-[#6B6B66] dark:text-[#9A9A92] hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] h-12 px-8 text-[15px]"
              asChild>
              <Link to="/contact">Request an integration</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
