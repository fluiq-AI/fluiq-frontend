"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ShieldKeyIcon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  Download04Icon,
  GithubIcon,
} from "@hugeicons/core-free-icons"
import { IslandCta } from "@/components/IslandCta"
import { SiteFooter } from "@/components/SiteFooter"
import { SiteNavbar } from "@/components/SiteNavbar"
import { GrainOverlay, HeroAtmosphere } from "@/components/SiteBackdrop"
import data from "@/lib/benchmarkData.json"

const EASE_OUT = [0.22, 1, 0.36, 1] as const

type Row = {
  name: string
  slug: string
  family: string
  recall: number
  false_alarm: number
  f1: number
}
type Corpus = {
  key: string
  title: string
  source: string
  source_url: string | null
  licence: string
  blurb: string
  cases: number
  block: number
  allow: number
  results: Row[]
  secondary: Row[]
}

const CORPORA = data.corpora as Corpus[]
const TOTAL_CASES = CORPORA.reduce((n, c) => n + c.cases, 0)

/** Vendor logos, keyed by the slug the benchmark generator emits.
 *
 * Empty on purpose. We do not vendor competitors' trademarks into this
 * repository, so every row falls back to a neutral monogram until a file is
 * added. Dropping an SVG at public/logos/<slug>.svg and adding the entry here is
 * the whole change; the same slug drives the marks in the PDF report.
 */
const LOGOS: Record<string, string> = {}

const MONOGRAM: Record<string, string> = {
  fluiq: "F",
  "llm-guard": "LG",
  presidio: "Pr",
  "nemo-guardrails": "NV",
  "aws-comprehend": "AWS",
  "lakera-guard": "Lk",
  nightfall: "NF",
  "regex-baseline": "re",
}

function Mark({ slug, ours }: { slug: string; ours: boolean }) {
  const src = LOGOS[slug]
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" aria-hidden className="h-4 w-4 shrink-0 object-contain" />
  }
  return (
    <span
      aria-hidden
      className={`inline-flex h-4 shrink-0 items-center justify-center rounded-[3px] px-1 text-[8.5px] font-bold leading-none tracking-tight ${
        ours
          ? "bg-[#1860D3] text-white dark:bg-[#6FA8FF] dark:text-[#0A0A0B]"
          : "bg-slate-900/[0.08] text-slate-500 dark:bg-white/10 dark:text-slate-400"
      }`}
    >
      {MONOGRAM[slug] ?? "?"}
    </span>
  )
}

/** One measure, one panel.
 *
 * Recall and false alarm both run 0 to 100% and point in opposite directions, so
 * they get a panel each rather than a shared axis where the taller bar would read
 * as the better product. Both panels keep the table's row order, which makes the
 * pair readable across as well as down. Fluiq is the accent and every competitor
 * is the same neutral grey: colour marks who we are, not who won, and the product
 * name sits on every row so colour never carries identity by itself.
 */
function BarPanel({
  title,
  hint,
  rows,
  pick,
  corpus,
}: {
  title: string
  hint: string
  rows: Row[]
  pick: (r: Row) => number
  corpus: Corpus
}) {
  return (
    <div>
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}{" "}
        <span className="font-normal normal-case tracking-normal opacity-70">({hint})</span>
      </h3>
      {rows.map((r) => {
        const ours = r.family === "Fluiq"
        const v = pick(r)
        return (
          <div
            key={r.name}
            className="mb-3.5 last:mb-0"
            title={`${r.name} on ${corpus.title}: recall ${r.recall.toFixed(
              1,
            )}%, false alarm ${r.false_alarm.toFixed(1)}%, F1 ${r.f1.toFixed(1)}%`}
          >
            <div
              className={`mb-1.5 flex items-center gap-1.5 text-[12px] ${
                ours
                  ? "font-semibold text-slate-900 dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Mark slug={r.slug} ours={ours} />
              <span className="truncate">{r.name}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="h-2.5 flex-1 rounded-[4px] bg-slate-900/[0.06] dark:bg-white/[0.08]">
                {/* Width comes from an inline style rather than an animation, so
                    the bar is the right length in the server-rendered HTML.
                    Growing it from zero on mount looks better but makes the
                    score depend on JavaScript having run, and a bar stuck at
                    zero misreports the result instead of just missing an
                    effect. The min-width floor keeps a 0.7% bar visible; zero
                    still has to render as nothing, or the regex control's 0.0%
                    recall would read as a small score. */}
                <div
                  className={`h-full rounded-[4px] ${
                    ours ? "bg-[#1860D3] dark:bg-[#6FA8FF]" : "bg-[#8B939E] dark:bg-[#6B7280]"
                  }`}
                  style={{ width: `${v}%`, minWidth: v > 0 ? 3 : 0 }}
                />
              </div>
              <span
                className={`w-11 shrink-0 text-right text-[12px] tabular-nums ${
                  ours
                    ? "font-semibold text-slate-900 dark:text-slate-100"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {v.toFixed(1)}%
              </span>
            </div>
          </div>
        )
      })}
      <div className="mt-3 flex justify-between border-t border-slate-200/70 pt-1.5 text-[10px] text-slate-400 dark:border-white/10 dark:text-slate-500">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  )
}

function ScoreChart({ corpus }: { corpus: Corpus }) {
  return (
    <div>
      <div className="grid gap-9 sm:grid-cols-2 sm:gap-12">
        <BarPanel
          title="Recall"
          hint="higher is better"
          rows={corpus.results}
          pick={(r) => r.recall}
          corpus={corpus}
        />
        <BarPanel
          title="False alarm"
          hint="lower is better"
          rows={corpus.results}
          pick={(r) => r.false_alarm}
          corpus={corpus}
        />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-[#1860D3] dark:bg-[#6FA8FF]" />
          Fluiq
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-[#8B939E] dark:bg-[#6B7280]" />
          Everything else
        </span>
        <span>Rows are ordered by F1, best first, and are identical in both panels.</span>
      </div>
    </div>
  )
}

const FAMILY_TONE: Record<string, string> = {
  Fluiq: "bg-slate-900/[0.06] text-slate-700 dark:bg-white/10 dark:text-slate-200",
  "Open source": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Commercial: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Control: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
}

function ResultTable({ corpus }: { corpus: Corpus }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200/70 text-[11px] uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
            <th className="py-3 pl-5 pr-4 font-semibold">Guardrail</th>
            <th className="px-4 py-3 font-semibold">Category</th>
            <th className="px-4 py-3 text-right font-semibold">Recall</th>
            <th className="px-4 py-3 text-right font-semibold">False alarm</th>
            <th className="py-3 pl-4 pr-5 text-right font-semibold">F1</th>
          </tr>
        </thead>
        <tbody>
          {corpus.results.map((r, i) => {
            const ours = r.family === "Fluiq"
            return (
              <tr
                key={r.name}
                className={`border-b border-slate-100 last:border-0 dark:border-white/5 ${
                  ours ? "bg-slate-900/[0.03] dark:bg-white/[0.05]" : ""
                }`}
              >
                <td className="py-3 pl-5 pr-4">
                  <code className="font-mono text-[12.5px]">{r.name}</code>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      FAMILY_TONE[r.family] ?? FAMILY_TONE.Control
                    }`}
                  >
                    {r.family}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{r.recall.toFixed(1)}%</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.false_alarm.toFixed(1)}%</td>
                <td
                  className={`py-3 pl-4 pr-5 text-right tabular-nums ${
                    i === 0 ? "font-bold" : "font-medium"
                  }`}
                >
                  {r.f1.toFixed(1)}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function Benchmark() {
  const reduce = useReducedMotionSafe()
  const [active, setActive] = useState(0)
  const corpus = CORPORA[active]

  return (
    <div className="relative min-h-screen bg-[#FAFAF8] text-slate-900 dark:bg-[#0A0A0B] dark:text-slate-100">
      <GrainOverlay />
      <SiteNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-14 pt-28 sm:pt-32">
        <HeroAtmosphere variant="offset" />
        <div className="relative mx-auto max-w-3xl text-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-inset ring-slate-500/20 dark:text-slate-400">
              <HugeiconsIcon icon={ShieldKeyIcon} size={13} strokeWidth={2} />
              Open benchmark
            </span>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              We benchmarked the guardrails. We came second.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              Eight guardrails, {TOTAL_CASES} cases, four corpora. Two of those corpora are public
              datasets nobody here curated. Everything is published: the harness, the attack
              corpus, the adapters, and every case each product missed.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="/Fluiq-Guardrail-Benchmark.pdf"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-slate-900 px-6 text-[14px] font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <HugeiconsIcon icon={Download04Icon} size={16} strokeWidth={2} />
                Read the full report (PDF)
              </a>
              <IslandCta to="/response-gate-demo" variant="ghost">
                Try the live demo
              </IslandCta>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Disclosure, placed first rather than buried */}
      <section className="px-6 pb-12 mt-10">
        <div className="mx-auto max-w-5xl rounded-2xl border-l-[3px] border-red-500 bg-red-500/[0.04] px-6 py-5 dark:bg-red-500/[0.07]">
          <p className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <HugeiconsIcon
              icon={Alert02Icon}
              size={17}
              className="mt-0.5 shrink-0 text-red-500"
            />
            <span>
              <strong className="font-semibold">We publish this and we compete in it.</strong> No
              methodology removes that conflict. What we did instead: scoring was fixed before
              anything ran, competitors run at stock settings with nothing tuned to these cases,
              every miss is listed by case ID, and a thirty-line regex control is included so you
              can see when a sophisticated product barely beats it. Fluiq does not place first on
              either output-side corpus. Re-run it and disagree.
            </span>
          </p>
        </div>
      </section>

      {/* Results */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap gap-2">
            {CORPORA.map((c, i) => (
              <button
                key={c.key}
                onClick={() => setActive(i)}
                className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
                  i === active
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "border border-slate-200 text-slate-600 hover:border-slate-400 dark:border-white/15 dark:text-slate-400 dark:hover:border-white/30"
                }`}
              >
                {c.title.replace("Output leakage: ", "")}
              </button>
            ))}
          </div>

          <h2 className="mt-8 text-2xl font-semibold tracking-tight">{corpus.title}</h2>
          <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">{corpus.blurb}</p>
          <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {corpus.cases} cases
            </span>{" "}
            · {corpus.block} should block, {corpus.allow} should pass · source{" "}
            {corpus.source_url ? (
              <a
                href={corpus.source_url}
                className="underline decoration-slate-400 underline-offset-2 hover:text-slate-900 dark:hover:text-slate-100"
              >
                {corpus.source}
              </a>
            ) : (
              corpus.source
            )}{" "}
            · licence {corpus.licence}
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-white/[0.03]">
            <ScoreChart key={corpus.key} corpus={corpus} />
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Recall is what it catches. False alarm is how often it blocks text that should have gone
            out. Neither means anything on its own, because a guardrail that blocks everything
            scores 100% recall and gets switched off in week two. F1 in the table below combines
            them.
          </p>

          <details className="group mt-4">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:text-slate-400 dark:decoration-white/25 dark:hover:text-slate-100">
              Show the numbers as a table
            </summary>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <ResultTable corpus={corpus} />
            </div>
          </details>

          {corpus.secondary.length > 0 && (
            <p className="mt-5 max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Every contestant gets one row, ours included. We measured more than one configuration
              of our own gate, and the one that ships as{" "}
              <code className="font-mono text-[11px]">fluiq.secure()</code> is the one that competes
              here, because nobody runs Lakera twice with its model switched off. The others score
              lower, so they are published rather than quietly dropped:{" "}
              {corpus.secondary.map((r, i) => (
                <span key={r.name}>
                  {i > 0 && ", "}
                  <code className="font-mono text-[11px]">{r.name}</code> at {r.recall.toFixed(1)}%
                  recall and {r.false_alarm.toFixed(1)}% false alarms
                </span>
              ))}
              . The full report has the breakdown.
            </p>
          )}
        </div>
      </section>

      {/* Method */}
      <section className="border-t border-slate-200/70 px-6 py-16 dark:border-white/10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">
            Every guardrail receives the same string and answers one question: block, or allow.
            Scoring was fixed before any contestant ran.
          </p>
          <ul className="mt-6 max-w-3xl space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            <li className="flex gap-3">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={17}
                className="mt-0.5 shrink-0 text-emerald-500"
              />
              <span>
                Roughly a third of each output corpus is benign text built to bait false positives:
                order numbers shaped like card numbers, git SHAs shaped like secrets, a sentence
                that merely describes an injection attempt.
              </span>
            </li>
            <li className="flex gap-3">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={17}
                className="mt-0.5 shrink-0 text-emerald-500"
              />
              <span>
                A contestant whose library or credentials are missing is skipped and reported, never
                scored zero. Nightfall&apos;s first run errored on 190 of 300 cases through rate
                limiting; those results were discarded rather than published.
              </span>
            </li>
            <li className="flex gap-3">
              <HugeiconsIcon
                icon={Alert02Icon}
                size={17}
                className="mt-0.5 shrink-0 text-amber-500"
              />
              <span>
                Scope differs between products. Presidio detects PII and never claimed to detect API
                keys, so it scores zero on secrets. That is a scope difference rather than a defect,
                which is why per-corpus results exist and no single number should be read alone.
              </span>
            </li>
            <li className="flex gap-3">
              <HugeiconsIcon
                icon={Alert02Icon}
                size={17}
                className="mt-0.5 shrink-0 text-amber-500"
              />
              <span>
                One labelling disagreement is material. On the jailbreak corpus, persona prompts
                (&ldquo;you are Black Panther&rdquo;) are labelled benign; Lakera treats persona
                adoption as hostile. That single difference of opinion drives both its high recall
                and its high false-alarm rate there.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Think we got it wrong?</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Adding a guardrail means implementing one method. If you think a product is
            misconfigured here, the fastest rebuttal is a pull request.
          </p>
          <pre className="mx-auto mt-6 w-full max-w-md overflow-x-auto rounded-xl border border-transparent bg-slate-900 px-5 py-4 text-left font-mono text-[13px] leading-relaxed text-slate-100 dark:border-white/[0.07] dark:bg-[#0C0C0C] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.14)]">
            <code>{`def scan(self, text: str) -> Verdict:\n    return Verdict(blocked=..., findings=[...])`}</code>
          </pre>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <IslandCta to="/signup">Start free</IslandCta>
            <a
              href="/Fluiq-Guardrail-Benchmark.pdf"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-[#E5E1D6] bg-[#FAF9F6]/60 px-6 text-[14px] font-medium text-[#0a0a0a] transition hover:bg-[#F2F0E9] dark:border-[#2A2A2A] dark:bg-white/[0.03] dark:text-[#FAF9F6] dark:hover:bg-[#1A1A1A]"
            >
              <HugeiconsIcon icon={GithubIcon} size={16} strokeWidth={2} />
              Full report
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
