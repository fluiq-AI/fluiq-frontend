"use client"

import { useEffect, useState } from "react"

/**
 * Branded full-area loading screen for the dashboard. Rendered by
 * `app/dashboard/loading.tsx` (the App Router Suspense boundary that wraps every
 * `/dashboard/*` route), so the sidebar stays put and only the content region
 * shows this while a page's segment loads. Also exported for pages that want the
 * same branded state during their own initial data fetch.
 *
 * The Fluiq mark sits inside a softly pulsing glow, with a status line that
 * cycles through short, on-brand messages so a slow load reads as "working",
 * not "stuck".
 */

const MESSAGES = [
  "Warming up your workspace",
  "Loading traces and evaluations",
  "Scoring agent trajectories",
  "Checking guardrails",
  "Crunching the latest runs",
  "Almost there",
]

export function DashboardLoading({
  messages = MESSAGES,
  className = "",
}: {
  messages?: string[]
  className?: string
}) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (messages.length <= 1) return
    const id = setInterval(() => {
      // Fade the current line out, swap it at the midpoint, fade back in.
      setVisible(false)
      const swap = setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length)
        setVisible(true)
      }, 300)
      return () => clearTimeout(swap)
    }, 2000)
    return () => clearInterval(id)
  }, [messages.length])

  return (
    <div
      className={`flex min-h-[70vh] w-full flex-1 flex-col items-center justify-center gap-8 px-6 py-16 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Logo mark with layered pulsing glow. */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 rounded-[28px] bg-[#1860D3]/15 blur-xl motion-safe:animate-pulse dark:bg-[#6FA8FF]/20" />
        <span className="absolute inset-2 rounded-[24px] border border-[#1860D3]/20 motion-safe:animate-ping dark:border-[#6FA8FF]/25" />
        <span className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#1860D3]/10 to-transparent" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] border border-border/60 bg-background shadow-sm">
          <img src="/logo.svg" alt="Fluiq" className="h-9 w-9" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
          Fluiq
        </span>
        <p
          className={`min-h-5 text-sm text-muted-foreground transition-opacity duration-300 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          {messages[index]}
          <span className="ml-0.5 motion-safe:animate-pulse">…</span>
        </p>
      </div>

      {/* Indeterminate progress bar. */}
      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 rounded-full bg-[#1860D3] motion-safe:animate-[fluiq-loading-slide_1.4s_ease-in-out_infinite] dark:bg-[#6FA8FF]" />
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  )
}

export default DashboardLoading
