"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Add01Icon,
  Delete02Icon,
  JusticeScale01Icon,
  Loading03Icon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SavedScorer {
  prompt_id: string
  slug: string
  name: string
  template: string
  kind: "judge" | "code"
  version: number
  config?: { choices?: { label: string; score: number }[] } | null
}

interface BuiltInMetric {
  name: string
  description: string | null
  is_overridden: boolean
  version: number
}

interface Aggregate {
  aggregate_id: string
  slug: string
  name: string
  description: string | null
  components: { metric: string; weight: number }[]
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Every way this workspace can score something, in one place.
 *
 * Scorers were spread across three surfaces — built-in metric prompts under
 * Judge Prompts, custom judges and code scorers inside a dataset's run drawer,
 * and nothing at all for composites. Nobody could answer "what do we measure?"
 * without opening three screens and remembering the fourth.
 */
/**
 * ``embedded`` renders the body without its own page header, so the Prompts
 * page can host this as a tab. A scorer *is* a prompt — keeping them on
 * separate screens is what made "what do we measure?" hard to answer.
 *
 * ``view`` selects which sections render. The scorer sections live under
 * Prompts; aggregates get their own page, because an aggregate is a weighted
 * formula over scores that already exist — no prompt text, no model call.
 * They share one component because the aggregate builder's component list is
 * exactly the built-in metrics plus the saved scorers loaded here.
 */
type ScorersView = "all" | "scorers" | "aggregates"

function Scorers(
  { embedded = false, view = "all" }: { embedded?: boolean; view?: ScorersView } = {},
) {
  const showScorers = view === "all" || view === "scorers"
  const showAggregates = view === "all" || view === "aggregates"
  const [saved, setSaved] = useState<SavedScorer[]>([])
  const [builtIn, setBuiltIn] = useState<BuiltInMetric[]>([])
  const [aggregates, setAggregates] = useState<Aggregate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<SavedScorer | null>(null)
  const [newAggregate, setNewAggregate] = useState<{
    name: string
    components: { metric: string; weight: number }[]
  } | null>(null)
  const [savingAggregate, setSavingAggregate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [prompts, metrics, aggs] = await Promise.all([
        authFetch<{ prompts: SavedScorer[] }>("/api/v1/prompts"),
        authFetch<{ prompts: BuiltInMetric[] }>("/api/v1/eval/judge-prompts")
          .catch(() => ({ prompts: [] as BuiltInMetric[] })),
        authFetch<{ aggregates: Aggregate[] }>("/api/v1/aggregates")
          .catch(() => ({ aggregates: [] as Aggregate[] })),
      ])
      setSaved(
        (prompts.prompts ?? []).filter((p) => p.kind === "judge" || p.kind === "code"),
      )
      setBuiltIn(metrics.prompts ?? [])
      setAggregates(aggs.aggregates ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load scorers")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Everything an aggregate can be built from: the built-in metrics plus every
  // custom scorer. Offering only the built-ins would make a composite unable to
  // include the scorer someone wrote specifically for their product.
  const scorable = useMemo(
    () => [
      ...builtIn.map((m) => m.name),
      ...saved.map((s) => s.slug),
    ],
    [builtIn, saved],
  )

  async function removeScorer() {
    if (!deleting) return
    try {
      await authFetch(`/api/v1/prompts/${deleting.prompt_id}`, { method: "DELETE" })
      toast.success(`Removed "${deleting.name}"`)
      setDeleting(null)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to remove")
    }
  }

  async function saveAggregate() {
    if (!newAggregate || savingAggregate) return
    const usable = newAggregate.components.filter((c) => c.metric && c.weight > 0)
    if (!newAggregate.name.trim() || usable.length === 0) {
      toast.error("An aggregate needs a name and at least one component.")
      return
    }
    setSavingAggregate(true)
    try {
      await authFetch("/api/v1/aggregates", {
        method: "POST",
        body: { name: newAggregate.name.trim(), components: usable },
      })
      toast.success(`Created "${newAggregate.name.trim()}"`)
      setNewAggregate(null)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to save")
    } finally {
      setSavingAggregate(false)
    }
  }

  async function removeAggregate(aggregate: Aggregate) {
    try {
      await authFetch(`/api/v1/aggregates/${aggregate.aggregate_id}`, { method: "DELETE" })
      setAggregates((prev) => prev.filter((a) => a.aggregate_id !== aggregate.aggregate_id))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to remove")
    }
  }

  return (
    <div>
      {embedded ? null : (
        <DashboardPageHeader
          title="Scorers"
          description="Everything this workspace can measure, and how it combines them."
        />
      )}

      <div className="space-y-6 px-6 py-6">
        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
              Loading…
            </CardContent>
          </Card>
        ) : (
          <>
            {!showScorers ? null : (
            <>
            <Section
              title="Built in"
              hint="Shipped judges, editable per organization and per dataset."
            >
              {builtIn.length === 0 ? (
                <Empty>No built-in metrics available.</Empty>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {builtIn.map((metric) => (
                    <div
                      key={metric.name}
                      className="rounded-lg border border-border/60 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon
                          icon={JusticeScale01Icon}
                          size={13}
                          className="text-muted-foreground"
                        />
                        <span className="font-mono text-xs font-medium">{metric.name}</span>
                        {metric.is_overridden ? (
                          <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                            edited
                          </span>
                        ) : null}
                      </div>
                      {metric.description ? (
                        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                          {metric.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section
              title="Yours"
              hint="Judges you wrote, and code scorers that cost nothing to run."
            >
              {saved.length === 0 ? (
                <Empty>
                  No custom scorers yet. Save a prompt as a{" "}
                  <strong>Judge</strong> on the Prompts tab, or add one from a
                  dataset&apos;s run drawer.
                </Empty>
              ) : (
                <div className="space-y-2">
                  {saved.map((scorer) => (
                    <div
                      key={scorer.prompt_id}
                      className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-2.5"
                    >
                      <HugeiconsIcon
                        icon={scorer.kind === "code" ? SourceCodeIcon : JusticeScale01Icon}
                        size={14}
                        className={cn(
                          "mt-0.5 shrink-0",
                          scorer.kind === "code"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{scorer.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {scorer.slug}
                          </span>
                          <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {scorer.kind === "code" ? "code · free" : "LLM judge"}
                          </span>
                          {scorer.config?.choices ? (
                            <span
                              className="rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              title={scorer.config.choices.map((c) => c.label).join(", ")}
                            >
                              {scorer.config.choices.length} choices
                            </span>
                          ) : null}
                        </div>
                        <pre className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
                          {scorer.template}
                        </pre>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${scorer.name}`}
                        onClick={() => setDeleting(scorer)}
                        className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-destructive"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
            </>
            )}

            {!showAggregates ? null : (
            <Section
              title="Aggregates"
              hint="One number from several scorers, weighted the way your team agreed."
              action={
                newAggregate ? undefined : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setNewAggregate({ name: "", components: [{ metric: "", weight: 1 }] })
                    }
                  >
                    <HugeiconsIcon icon={Add01Icon} size={13} />
                    New aggregate
                  </Button>
                )
              }
            >
              {aggregates.length === 0 && !newAggregate ? (
                <Empty>
                  A run with six metrics has six answers and no verdict, so everyone
                  averages them differently in their head. An aggregate settles it once.
                </Empty>
              ) : null}

              <div className="space-y-2">
                {aggregates.map((aggregate) => {
                  const total = aggregate.components.reduce((a, c) => a + c.weight, 0) || 1
                  return (
                    <div
                      key={aggregate.aggregate_id}
                      className="rounded-lg border border-border/60 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{aggregate.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {aggregate.slug}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${aggregate.name}`}
                          onClick={() => removeAggregate(aggregate)}
                          className="ml-auto rounded p-1 text-muted-foreground/50 transition-colors hover:text-destructive"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={13} />
                        </button>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {aggregate.components.map((component) => (
                          <span
                            key={component.metric}
                            className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {component.metric}{" "}
                            <b className="font-mono text-foreground">
                              {Math.round((component.weight / total) * 100)}%
                            </b>
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {newAggregate ? (
                <div className="mt-2 space-y-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-3">
                  <Input
                    value={newAggregate.name}
                    onChange={(e) =>
                      setNewAggregate({ ...newAggregate, name: e.target.value })
                    }
                    placeholder="e.g. Quality"
                    className="h-8 text-sm"
                    autoFocus
                  />
                  {newAggregate.components.map((component, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <select
                        value={component.metric}
                        onChange={(e) =>
                          setNewAggregate({
                            ...newAggregate,
                            components: newAggregate.components.map((c, i) =>
                              i === index ? { ...c, metric: e.target.value } : c,
                            ),
                          })
                        }
                        className="h-7 flex-1 rounded border border-border/60 bg-background px-2 text-[11px]"
                      >
                        <option value="">Choose a scorer…</option>
                        {scorable.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={component.weight}
                        onChange={(e) =>
                          setNewAggregate({
                            ...newAggregate,
                            components: newAggregate.components.map((c, i) =>
                              i === index ? { ...c, weight: Number(e.target.value) } : c,
                            ),
                          })
                        }
                        className="h-7 w-20 rounded border border-border/60 bg-background px-2 text-[11px]"
                      />
                      <button
                        type="button"
                        aria-label="Remove component"
                        disabled={newAggregate.components.length <= 1}
                        onClick={() =>
                          setNewAggregate({
                            ...newAggregate,
                            components: newAggregate.components.filter((_, i) => i !== index),
                          })
                        }
                        className="rounded p-1 text-muted-foreground/50 hover:text-destructive disabled:opacity-30"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={12} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setNewAggregate({
                          ...newAggregate,
                          components: [...newAggregate.components, { metric: "", weight: 1 }],
                        })
                      }
                      className="text-[11px] text-primary hover:underline"
                    >
                      + Add component
                    </button>
                    <span className="text-[11px] text-muted-foreground">
                      Weights are relative — they don&apos;t need to add up to anything.
                    </span>
                    <div className="ml-auto flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setNewAggregate(null)}
                        disabled={savingAggregate}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveAggregate} disabled={savingAggregate}>
                        {savingAggregate ? (
                          <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
                        ) : null}
                        Create
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </Section>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove scorer"
        description={
          deleting
            ? `"${deleting.name}" will stop being available to runs and rules. Scores it already produced are kept.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        onConfirm={removeScorer}
      />
    </div>
  )
}

function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string
  hint: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
        {action ? <div className="ml-auto">{action}</div> : null}
      </div>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-[11px] text-muted-foreground">
      {children}
    </div>
  )
}

export default Scorers
