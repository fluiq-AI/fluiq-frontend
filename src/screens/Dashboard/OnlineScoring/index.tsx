"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Add01Icon,
  Cancel01Icon,
  Delete02Icon,
  Loading03Icon,
  PlayIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown"
import { SearchSelect } from "@/components/SearchSelect"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { metricLabel } from "@/lib/metricLabels"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Rule {
  rule_id: string
  name: string
  description: string | null
  enabled: boolean
  metrics: string[]
  custom_judges: Record<string, number>
  sample_rate: number
  span_scope: "root" | "all"
  integrations: string[]
  models: string[]
  judge: string | null
  created_at: string | null
}

interface TestResult {
  considered: number
  matched: number
  sampled: number
  est_judge_calls: number
  examples: { trace_id: string; model: string | null; integration: string | null }[]
  window: string
}

type Draft = Omit<Rule, "rule_id" | "created_at">

const METRICS = [
  "hallucination", "faithfulness", "relevance",
  "toxicity", "coherence", "completeness",
] as const

const NEW_RULE: Draft = {
  name: "",
  description: null,
  enabled: true,
  metrics: ["relevance"],
  custom_judges: {},
  // 10% is the rate the source material recommends starting at: enough signal
  // to see a trend, cheap enough that nobody has to think about it.
  sample_rate: 10,
  span_scope: "root",
  integrations: [],
  models: [],
  judge: null,
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Continuous evaluation of live traffic.
 *
 * Everything else in Evaluation is opt-in: a trace is scored because the SDK
 * asked. That leaves quality coverage at whatever a developer hardcoded, and a
 * regression on a path nobody instrumented is invisible. A rule inverts it —
 * the org declares what share of what traffic gets scored, and it applies to
 * calls the SDK said nothing about.
 */
function OnlineScoring() {
  const [rules, setRules] = useState<Rule[]>([])
  const [scorers, setScorers] = useState<{ slug: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ draft: Draft; ruleId?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Rule | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch<{ rules: Rule[] }>("/api/v1/online-rules")
      setRules(res.rules)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load rules")
    } finally {
      setLoading(false)
    }
  }, [])

  // Custom scorers live in the org's prompt library; a rule references them by
  // slug exactly as fluiq.eval() does.
  const loadScorers = useCallback(async () => {
    try {
      const res = await authFetch<{ prompts: { slug: string; name: string; kind: string }[] }>(
        "/api/v1/prompts",
      )
      setScorers(
        (res.prompts ?? [])
          .filter((p) => p.kind === "judge" || p.kind === "code")
          .map((p) => ({ slug: p.slug, name: p.name })),
      )
    } catch {
      setScorers([])
    }
  }, [])

  useEffect(() => {
    load()
    loadScorers()
  }, [load, loadScorers])

  async function save() {
    if (!editing || saving) return
    const { draft, ruleId } = editing
    if (!draft.name.trim()) {
      toast.error("Give the rule a name.")
      return
    }
    if (draft.metrics.length === 0 && Object.keys(draft.custom_judges).length === 0) {
      toast.error("Pick at least one metric or scorer — a rule with none scores nothing.")
      return
    }
    setSaving(true)
    try {
      if (ruleId) {
        await authFetch(`/api/v1/online-rules/${ruleId}`, { method: "PATCH", body: draft })
      } else {
        await authFetch("/api/v1/online-rules", { method: "POST", body: draft })
      }
      toast.success(ruleId ? "Rule updated" : "Rule created")
      setEditing(null)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to save rule")
    } finally {
      setSaving(false)
    }
  }

  async function toggle(rule: Rule) {
    // Optimistic: a toggle that lags behind the click feels broken, and the
    // reload below corrects it if the write failed.
    setRules((prev) =>
      prev.map((r) => (r.rule_id === rule.rule_id ? { ...r, enabled: !r.enabled } : r)),
    )
    try {
      await authFetch(`/api/v1/online-rules/${rule.rule_id}`, {
        method: "PATCH",
        body: { enabled: !rule.enabled },
      })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to update rule")
      load()
    }
  }

  async function remove() {
    if (!deleting) return
    try {
      await authFetch(`/api/v1/online-rules/${deleting.rule_id}`, { method: "DELETE" })
      toast.success(`Removed "${deleting.name}"`)
      setDeleting(null)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to remove rule")
    }
  }

  return (
    <div>
      <DashboardPageHeader
        title="Online Scoring"
        description="Continuously score a sample of live traffic, whether or not the SDK asked for it."
      />

      <div className="space-y-4 px-6 py-6">
        <div className="flex items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-muted-foreground">
            A rule scores a share of matching production traffic on a schedule of
            its own. Sampling is what makes it affordable — every scored trace
            costs a judge call, so most rules run at 5–20%.
          </p>
          <Button size="sm" onClick={() => setEditing({ draft: { ...NEW_RULE } })}>
            <HugeiconsIcon icon={Add01Icon} size={14} />
            New rule
          </Button>
        </div>

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
        ) : rules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No rules yet. Without one, a trace is only scored when the SDK
                explicitly asked — so anything you didn&apos;t instrument goes
                ungraded.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <RuleRow
                key={rule.rule_id}
                rule={rule}
                onToggle={() => toggle(rule)}
                onEdit={() => setEditing({ draft: { ...rule }, ruleId: rule.rule_id })}
                onDelete={() => setDeleting(rule)}
              />
            ))}
            {rules.filter((r) => r.enabled).length > 1 ? (
              <p className="px-1 text-[11px] text-muted-foreground">
                When several rules match one trace, the oldest enabled rule wins —
                a trace is never scored twice, and adding a rule can&apos;t change
                what an existing one does.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {editing ? (
        <RuleEditor
          draft={editing.draft}
          isNew={!editing.ruleId}
          scorers={scorers}
          saving={saving}
          onChange={(draft) => setEditing({ ...editing, draft })}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove rule"
        description={
          deleting
            ? `"${deleting.name}" will stop scoring live traffic. Scores it already produced are kept.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        onConfirm={remove}
      />
    </div>
  )
}

// ── Rule row ──────────────────────────────────────────────────────────────────

function RuleRow({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: Rule
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const scorerCount = rule.metrics.length + Object.keys(rule.custom_judges).length
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        rule.enabled ? "border-border/60 bg-background" : "border-border/40 bg-muted/20",
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={rule.enabled}
        aria-label={`${rule.enabled ? "Disable" : "Enable"} ${rule.name}`}
        onClick={onToggle}
        className={cn(
          "relative h-4 w-7 shrink-0 rounded-full transition-colors",
          rule.enabled ? "bg-primary" : "bg-muted-foreground/25",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3 rounded-full bg-white transition-transform",
            rule.enabled ? "translate-x-3.5" : "translate-x-0.5",
          )}
        />
      </button>

      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p
          className={cn(
            "truncate text-sm font-medium",
            rule.enabled ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {rule.name}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {rule.sample_rate}% of {rule.span_scope === "root" ? "agent runs" : "all spans"}
          {rule.integrations.length ? ` · ${rule.integrations.join(", ")}` : ""}
          {rule.models.length ? ` · ${rule.models.join(", ")}` : ""}
          {" · "}
          {scorerCount} scorer{scorerCount === 1 ? "" : "s"}
        </p>
      </button>

      <button
        type="button"
        aria-label={`Remove ${rule.name}`}
        onClick={onDelete}
        className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-destructive"
      >
        <HugeiconsIcon icon={Delete02Icon} size={14} />
      </button>
    </div>
  )
}

// ── Editor ────────────────────────────────────────────────────────────────────

function RuleEditor({
  draft,
  isNew,
  scorers,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  draft: Draft
  isNew: boolean
  scorers: { slug: string; name: string }[]
  saving: boolean
  onChange: (draft: Draft) => void
  onClose: () => void
  onSave: () => void
}) {
  const [test, setTest] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)

  const selectedScorers = Object.keys(draft.custom_judges)

  async function runTest() {
    if (testing) return
    setTesting(true)
    try {
      setTest(
        await authFetch<TestResult>("/api/v1/online-rules/test", {
          method: "POST",
          body: {
            metrics: draft.metrics,
            sample_rate: draft.sample_rate,
            span_scope: draft.span_scope,
            integrations: draft.integrations,
            models: draft.models,
          },
        }),
      )
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Test failed")
    } finally {
      setTesting(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Rule" className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="flex h-full w-full max-w-lg flex-col border-l border-border/60 bg-background shadow-xl duration-200 animate-in slide-in-from-right-6">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="font-heading text-base font-semibold">
              {isNew ? "New rule" : "Edit rule"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              What gets scored, how much of it, and with what.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <Field label="Name">
            <Input
              value={draft.name}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
              placeholder="e.g. Production quality watch"
              disabled={saving}
              className="h-8 text-sm"
              autoFocus
            />
          </Field>

          <Field
            label={`Sample rate — ${draft.sample_rate}%`}
            hint="Every scored trace costs a judge call. Start low, raise it once you trust the signal."
          >
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={draft.sample_rate}
              onChange={(e) => onChange({ ...draft, sample_rate: Number(e.target.value) })}
              disabled={saving}
              className="w-full accent-primary"
            />
          </Field>

          <Field
            label="Which spans"
            hint="An agent run has many spans; scoring all of them multiplies the cost by the depth of the trajectory."
          >
            <SearchSelect
              value={draft.span_scope}
              onChange={(v) => onChange({ ...draft, span_scope: v as "root" | "all" })}
              options={[
                { value: "root", label: "Agent-run roots only" },
                { value: "all", label: "Every LLM span" },
              ]}
              placeholder="Scope"
              searchable={false}
              disabled={saving}
            />
          </Field>

          <Field label="Metrics" hint="Built-in judges applied to each sampled trace.">
            <MultiSelectDropdown
              label="metric"
              placeholder="Choose metrics"
              options={METRICS.map((m) => ({ value: m, label: metricLabel(m) }))}
              selected={draft.metrics}
              onToggle={(v, on) =>
                onChange({
                  ...draft,
                  metrics: on ? [...draft.metrics, v] : draft.metrics.filter((m) => m !== v),
                })
              }
              disabled={saving}
            />
          </Field>

          <Field
            label="Custom scorers"
            hint="Your saved judge and code scorers. Code scorers cost nothing to run."
          >
            <MultiSelectDropdown
              label="scorer"
              placeholder={scorers.length ? "Choose scorers" : "None saved yet"}
              emptyText="No custom scorers saved yet."
              options={scorers.map((s) => ({ value: s.slug, label: s.name }))}
              selected={selectedScorers}
              onToggle={(slug, on) => {
                const next = { ...draft.custom_judges }
                if (on) next[slug] = 0.5
                else delete next[slug]
                onChange({ ...draft, custom_judges: next })
              }}
              disabled={saving || scorers.length === 0}
            />
          </Field>

          <Field
            label="Narrow it (optional)"
            hint="Leave empty to watch all traffic."
          >
            <div className="grid gap-2">
              <Input
                value={draft.integrations.join(", ")}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    integrations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Integrations, e.g. OPENAI, ANTHROPIC"
                disabled={saving}
                className="h-8 text-xs"
              />
              <Input
                value={draft.models.join(", ")}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    models: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Models, e.g. gpt-5-mini"
                disabled={saving}
                className="h-8 text-xs"
              />
            </div>
          </Field>

          {/* Dry run. A sample rate is an abstract number until you see what it
              would have cost on traffic you already have. */}
          <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={runTest}
                disabled={testing}
              >
                <HugeiconsIcon
                  icon={testing ? Loading03Icon : PlayIcon}
                  size={12}
                  className={testing ? "animate-spin" : undefined}
                />
                Test on recent traffic
              </Button>
              {test ? (
                <span className="text-[11px] text-muted-foreground">{test.window}</span>
              ) : null}
            </div>
            {test ? (
              <p className="text-[11px] text-muted-foreground">
                <b className="text-foreground">{test.matched}</b> of {test.considered} traces
                matched; <b className="text-foreground">{test.sampled}</b> would have been
                scored — about{" "}
                <b className="text-foreground">{test.est_judge_calls}</b> judge call
                {test.est_judge_calls === 1 ? "" : "s"}.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Replays this rule over traffic already recorded, so you can see the
                cost before spending it.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving || !draft.name.trim()}>
            {saving ? (
              <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
            ) : null}
            {isNew ? "Create rule" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">{label}</p>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export default OnlineScoring
