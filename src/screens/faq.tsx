"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon, SparklesIcon } from "@hugeicons/core-free-icons"

import { IslandCta } from "@/components/IslandCta"
import { Pagination } from "@/components/Pagination"
import { SiteFooter } from "@/components/SiteFooter"
import { SiteNavbar } from "@/components/SiteNavbar"
import { GrainOverlay, HeroAtmosphere } from "@/components/SiteBackdrop"
import { FAQ_GROUPS } from "@/lib/faq-groups"

const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** Entries per page. Small enough that the left rail stays visible while reading. */
const PAGE_SIZE = 8

const ALL = "all"

interface Row {
  q: string
  a: string
  sectionId: string
  sectionTitle: string
}

/**
 * Everything is derived from FAQ_GROUPS, so adding a question or a whole new
 * section means editing `lib/faq-groups.ts` and nothing else: the rail, the
 * counts, the search index, and the paging all pick it up automatically.
 */
const ROWS: Row[] = FAQ_GROUPS.flatMap((g) =>
  g.entries.map((e) => ({ ...e, sectionId: g.id, sectionTitle: g.title })),
)

function matches(row: Row, needle: string): boolean {
  return (
    row.q.toLowerCase().includes(needle) ||
    row.a.toLowerCase().includes(needle) ||
    row.sectionTitle.toLowerCase().includes(needle)
  )
}

export default function Faq() {
  const [query, setQuery] = useState("")
  const [section, setSection] = useState<string>(ALL)
  const [page, setPage] = useState(0)

  const needle = query.trim().toLowerCase()
  const searching = needle.length > 0

  // A search covers every section. Restricting it to the selected one produces
  // the worst possible outcome: an empty result for a question that is on the
  // page, just filed elsewhere.
  const results = useMemo(() => {
    const scoped = searching
      ? ROWS
      : section === ALL
        ? ROWS
        : ROWS.filter((r) => r.sectionId === section)
    return searching ? scoped.filter((r) => matches(r, needle)) : scoped
  }, [needle, searching, section])

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  // Guard against a stale page number when a filter shrinks the result set.
  const safePage = Math.min(page, totalPages - 1)
  const visible = results.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  useEffect(() => {
    setPage(0)
  }, [needle, section])

  /** Per-section counts, reflecting the active search so the rail stays truthful. */
  const counts = useMemo(() => {
    const pool = searching ? ROWS.filter((r) => matches(r, needle)) : ROWS
    const map: Record<string, number> = { [ALL]: pool.length }
    for (const r of pool) map[r.sectionId] = (map[r.sectionId] ?? 0) + 1
    return map
  }, [needle, searching])

  const railItems = [
    { id: ALL, title: "All questions", blurb: "" },
    ...FAQ_GROUPS.map((g) => ({ id: g.id, title: g.title, blurb: g.blurb })),
  ]

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">
      <GrainOverlay />
      <SiteNavbar active="faq" />

      <section className="relative overflow-hidden border-b border-[#D4CFC1] py-20 dark:border-[#1A1A1A]">
        <HeroAtmosphere variant="center" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <motion.div
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E1D6] bg-[#F2F0E9]/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#1860D3] backdrop-blur-sm dark:border-[#2A2A2A] dark:bg-[#1A1A1A]/80 dark:text-[#6FA8FF]">
              FAQ
            </span>
          </motion.div>
          <motion.h1
            className="font-heading mx-auto max-w-3xl text-5xl font-bold leading-[1.08] tracking-[-0.03em] md:text-6xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE_OUT }}
          >
            Questions, <span className="text-[#1860D3] dark:text-[#6FA8FF]">answered.</span>
          </motion.h1>
          <motion.p
            className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-[#6B6B66] dark:text-[#9A9A92]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: EASE_OUT }}
          >
            Pricing, evaluation, security, and what happens to your data.
          </motion.p>
        </div>
      </section>

      <section className="border-b border-[#D4CFC1] py-14 dark:border-[#1A1A1A]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[240px_1fr] lg:gap-14">
          {/* ── Left rail ── */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9A9A92]">
              Sections
            </p>
            <nav className="grid gap-1">
              {railItems.map((item) => {
                const active = section === item.id && !searching
                const count = counts[item.id] ?? 0
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setSection(item.id)
                      setQuery("")
                    }}
                    className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[14px] transition-colors ${
                      active
                        ? "bg-[#E8F0FD] font-medium text-[#1860D3] dark:bg-[#1860D3]/15 dark:text-[#6FA8FF]"
                        : "text-[#6B6B66] hover:bg-[#F2F0E9] hover:text-[#0a0a0a] dark:text-[#9A9A92] dark:hover:bg-[#1A1A1A] dark:hover:text-[#FAF9F6]"
                    } ${count === 0 ? "opacity-40" : ""}`}
                  >
                    <span className="leading-snug">{item.title}</span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#9A9A92]">
                      {count}
                    </span>
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* ── Right column ── */}
          <div className="min-w-0">
            <label htmlFor="faq-search" className="sr-only">
              Search the FAQ
            </label>
            <div className="relative">
              <HugeiconsIcon
                icon={Search01Icon}
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9A92]"
              />
              <input
                id="faq-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions and answers…"
                autoComplete="off"
                className="w-full rounded-xl border border-[#E5E1D6] bg-[#FAF9F6] py-3 pl-11 pr-4 text-[15px] text-[#0a0a0a] outline-none transition-colors placeholder:text-[#9A9A92] focus:border-[#1860D3] dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-[#FAF9F6] dark:focus:border-[#6FA8FF]"
              />
            </div>

            <p className="mt-3 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">
              {searching
                ? `${results.length} result${results.length === 1 ? "" : "s"} across all sections`
                : `${results.length} question${results.length === 1 ? "" : "s"}`}
            </p>

            <div className="mt-5 grid gap-3">
              {visible.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#E5E1D6] bg-[#F7F6F1] px-6 py-12 text-center dark:border-[#2A2A2A] dark:bg-[#0D0D0D]">
                  <p className="text-[15px] font-medium">No matches for &ldquo;{query}&rdquo;.</p>
                  <p className="mt-2 text-[14px] text-[#6B6B66] dark:text-[#9A9A92]">
                    Try a different word, or ask us directly.
                  </p>
                  {/* archived: the contact form posted to the API, which is gone.
                      Was: href="/contact" */}
                  <a
                    href="https://github.com/fluiq-AI/fluiq-sdk/issues"
                    className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-[#1860D3] transition-opacity hover:opacity-80 dark:text-[#6FA8FF]"
                  >
                    Talk to us
                    <span aria-hidden="true">&rarr;</span>
                  </a>
                </div>
              ) : (
                visible.map((f) => (
                  <article
                    key={`${f.sectionId}-${f.q}`}
                    className="rounded-2xl border border-[#E5E1D6] bg-[#FAF9F6] px-6 py-5 dark:border-[#2A2A2A] dark:bg-[#1A1A1A]"
                  >
                    {/* The section label only earns its place when the list is
                        mixed, which is during a search or on "All questions". */}
                    {(searching || section === ALL) && (
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9A9A92]">
                        {f.sectionTitle}
                      </p>
                    )}
                    <h2 className="font-heading mb-2 text-[16px] font-semibold tracking-tight">
                      {f.q}
                    </h2>
                    <p className="text-[14px] leading-relaxed text-[#6B6B66] dark:text-[#9A9A92]">
                      {f.a}
                    </p>
                  </article>
                ))
              )}
            </div>

            <Pagination
              page={safePage}
              hasMore={safePage < totalPages - 1}
              onPrev={() => setPage((p) => Math.max(0, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              label={`Page ${safePage + 1} of ${totalPages}`}
              className="mt-6"
            />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="mb-6 inline-flex size-12 items-center justify-center rounded-2xl bg-[#0a0a0a] text-white dark:bg-[#FAF9F6] dark:text-[#0A0A0A]">
            <HugeiconsIcon icon={SparklesIcon} size={22} />
          </div>
          <h2 className="font-heading text-4xl font-bold tracking-tight md:text-5xl">
            Still stuck?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[#6B6B66] dark:text-[#9A9A92]">
            We answer our own support email. Ask the awkward question.
          </p>
          <div className="mt-8 flex justify-center">
            {/* archived: hosted signup/pricing/contact are gone: <IslandCta to="/contact">Talk to us</IslandCta> */}
            <IslandCta to="https://github.com/fluiq-AI">View on GitHub</IslandCta>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
