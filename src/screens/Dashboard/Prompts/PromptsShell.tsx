"use client"

import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router"

import { cn } from "@/lib/utils"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"

import Prompts from "./index"
import JudgePrompts from "@/pages/Dashboard/JudgePrompts/index"
import Scorers from "@/pages/Dashboard/Scorers/index"

/**
 * One page for everything prompt-shaped.
 *
 * There is no separate "Scorers" tab, because a scorer is not a separate kind
 * of thing: saving a prompt with kind 'judge' *is* creating a scorer, and it
 * appears under Judge Prompts alongside the shipped metrics. Having both listed
 * the same rows twice under two names.
 *
 * Aggregates is a tab rather than a page, but stays its own tab rather than
 * merging into Judge Prompts: an aggregate is a weighted formula over metrics
 * that already have scores — no template, no model call.
 */

const TABS = [
  {
    key: "prompts",
    label: "Prompts",
    blurb: "Write, discover, evaluate, and deploy prompt templates.",
  },
  {
    key: "judge-prompts",
    label: "Judge Prompts",
    blurb:
      "The exact LLM-as-Judge prompts behind the built-in metrics. Edit one to change how that metric is graded for your organization.",
  },
  {
    key: "aggregates",
    label: "Aggregates",
    blurb: "One number from several scorers, weighted the way your team agreed.",
  },
] as const

type TabKey = (typeof TABS)[number]["key"]

function isTabKey(value: string | null): value is TabKey {
  return TABS.some((t) => t.key === value)
}

export default function PromptsShell() {
  const navigate = useNavigate()
  const location = useLocation()

  // The tab lives in the URL so a tab is linkable and survives a refresh —
  // and so the retired /dashboard/scorers and /dashboard/judge-prompts routes
  // can redirect here without landing people on the wrong tab.
  const initial = new URLSearchParams(location.search).get("tab")
  const [tab, setTab] = useState<TabKey>(isTabKey(initial) ? initial : "prompts")

  useEffect(() => {
    const next = new URLSearchParams(location.search).get("tab")
    if (isTabKey(next) && next !== tab) setTab(next)
    // location.search is the only thing that should drive this back
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  function selectTab(key: TabKey) {
    setTab(key)
    // replace, not push: flipping tabs shouldn't fill the back button with
    // steps the user has to press their way out of.
    navigate(key === "prompts" ? "/dashboard/prompts" : `/dashboard/prompts?tab=${key}`, {
      replace: true,
    })
  }

  // Authoring a new judge happens on the Prompts tab, so the Judge Prompts
  // tab hands off rather than growing a second editor.
  const [newJudgeAt, setNewJudgeAt] = useState(0)
  function startNewJudge() {
    setNewJudgeAt(Date.now())
    selectTab("prompts")
  }

  const active = TABS.find((t) => t.key === tab) ?? TABS[0]

  return (
    <>
      <DashboardPageHeader title="Prompts" description={active.blurb} />

      <div className="flex gap-1 border-b border-border/60 px-6">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => selectTab(key)}
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "prompts" ? <Prompts embedded newJudgeAt={newJudgeAt} /> : null}
      {tab === "judge-prompts" ? (
        <JudgePrompts embedded onCreate={startNewJudge} />
      ) : null}
      {tab === "aggregates" ? <Scorers embedded view="aggregates" /> : null}
    </>
  )
}
