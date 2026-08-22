"use client"

import { useEffect, useState, type FormEvent } from "react"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { captureLead } from "@/lib/demo"
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe"

const EASE_OUT = [0.22, 1, 0.36, 1] as const

type Props = {
  /** Must match a value in KNOWN_SOURCES on the API, else it lands as "unknown". */
  sourcePage: string
  heading?: string
  blurb?: string
  cta?: string
  /** Small print under the form. Page-specific: the demo's promise about not
   *  storing scanned text is meaningless on a comparison page. */
  fineprint?: string
  /** Small, non-sensitive detail about what they were looking at. Never the
   *  visitor's own pasted text — that is theirs, and we do not store it. */
  context?: Record<string, unknown>
  /** "default" = the slate tool pages (response-gate demo).
   *  "warm"    = the marketing palette used by the comparison + calculator pages. */
  variant?: "default" | "warm"
  className?: string
}

const STYLES = {
  default: {
    shell:   "rounded-2xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.03]",
    blurb:   "text-slate-500 dark:text-slate-400",
    input:   "border-slate-200 bg-white/80 focus:border-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-white/25",
    button:  "bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200",
    fine:    "text-slate-400 dark:text-slate-500",
    success: "border-emerald-200/70 bg-emerald-50/60 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
  },
  warm: {
    shell:   "rounded-2xl border border-[#D4CFC1] bg-[#F2F0E9]/60 p-6 dark:border-[#2A2A2A] dark:bg-[#111111]/60",
    blurb:   "text-[#6B6B66] dark:text-[#9A9A92]",
    input:   "border-[#D4CFC1] bg-white/80 focus:border-[#1860D3] dark:border-[#2A2A2A] dark:bg-[#0a0a0a]/60 dark:focus:border-[#6FA8FF]",
    button:  "bg-[#0a0a0a] text-white hover:bg-[#2A2A2A] dark:bg-[#E5E1D6] dark:text-[#0a0a0a] dark:hover:bg-white",
    fine:    "text-[#9A9A92]",
    success: "border-[#D4CFC1] bg-[#F2F0E9]/60 text-[#0a0a0a] dark:border-[#2A2A2A] dark:bg-[#111111]/60 dark:text-[#E5E1D6]",
  },
} as const

/** Remembering the submit is a per-viewer convenience only; if storage is
 *  unavailable (private window, blocked site data) the form simply shows again. */
function storageKey(sourcePage: string) {
  return `fluiq:lead:${sourcePage}`
}

export function LeadCapture({
  sourcePage,
  heading = "Run this against your own agent",
  blurb = "We're opening this up to a handful of teams running agents in production. Leave your email and we'll get you in.",
  cta = "Request access",
  fineprint = "One email from a founder, not a drip campaign. Unsubscribe whenever.",
  context,
  variant = "default",
  className = "",
}: Props) {
  const st = STYLES[variant]
  const reduce = useReducedMotionSafe()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey(sourcePage))) setDone(true)
    } catch {
      /* storage unavailable — show the form */
    }
  }, [sourcePage])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      await captureLead(email.trim(), sourcePage, context)
      setDone(true)
      try {
        localStorage.setItem(storageKey(sourcePage), "1")
      } catch {
        /* non-fatal: the lead is already saved server-side */
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Try again in a moment.",
      )
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div
        className={`flex items-center gap-2.5 rounded-2xl border px-5 py-4 text-sm ${st.success} ${className}`}
      >
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={17} className="shrink-0" />
        <span>Got it — we&apos;ll be in touch shortly.</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className={`${st.shell} ${className}`}
    >
      <h3 className="text-[15px] font-semibold tracking-tight">{heading}</h3>
      <p className={`mt-1 max-w-xl text-[13px] leading-relaxed ${st.blurb}`}>
        {blurb}
      </p>

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <label htmlFor={`lead-email-${sourcePage}`} className="sr-only">
          Email address
        </label>
        <input
          id={`lead-email-${sourcePage}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          className={`w-full flex-1 rounded-full border px-4 py-2.5 text-sm outline-none transition ${st.input}`}
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${st.button}`}
        >
          {loading ? (
            <>
              <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
              Sending
            </>
          ) : (
            <>
              {cta}
              <HugeiconsIcon icon={ArrowRight02Icon} size={16} strokeWidth={2} />
            </>
          )}
        </button>
      </form>

      {error && (
        <p className="mt-2.5 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <HugeiconsIcon icon={Alert02Icon} size={15} />
          {error}
        </p>
      )}

      <p className={`mt-3 text-[12px] ${st.fine}`}>{fineprint}</p>
    </motion.div>
  )
}
