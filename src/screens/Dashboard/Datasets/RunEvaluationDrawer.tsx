"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Cancel01Icon,
  Delete02Icon,
  Loading03Icon,
  PencilEdit02Icon,
  PlayIcon,
  RoboticIcon,
  SparklesIcon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown"
import {
  DEFAULT_JUDGE_SELECTION,
  JudgePicker,
  type JudgeSelection,
} from "@/components/JudgePicker"
import { MissingKeysCallout, ProviderKeyDialog } from "@/components/ProviderKeys"
import { useModels, toSpecs } from "@/lib/useModels"
import { metricLabel } from "@/lib/metricLabels"
import { PromptEditor } from "@/pages/Dashboard/Prompts/components/PromptEditor"
import {
  AGENTIC_PROMPTS,
  MetricFlowDiagram,
  isMultiStep,
  metricPromptNames,
} from "./MetricFlowDiagram"

// Eval kinds the drawer can launch (security is a separate top-level button).
export type EvalMode = "agentic" | "metrics"

// Config the drawer hands back to the parent's launch().
export interface EvalLaunchConfig {
  judge?: string
  depth?: string
  jury?: string[]
  metrics?: string[]
  custom_judges?: Record<string, number>
  /**
   * Judge models to grade with. More than one launches one run per model so the
   * results can be compared side by side. Empty/absent uses the server default.
   */
  models?: string[]
  /** Groups the runs of one multi-model launch. */
  batch_id?: string
}

const METRIC_CHOICES = [
  "hallucination", "faithfulness", "relevance",
  "toxicity", "coherence", "completeness",
  // context_precision / context_recall are intentionally NOT offered here: they
  // are RAG retrieval metrics that need real retrieved contexts, which text
  // dataset examples don't carry. They live in the Traces/Prompts drawers where
  // the user supplies the context.
] as const

const DEFAULT_METRICS = ["hallucination", "relevance", "completeness"]

// Prompt names per metric come from the pipeline spec in MetricFlowDiagram, so
// the editor and the architecture diagram can never disagree about which judge
// calls a metric actually makes.

/**
 * Placeholder syntax is `{{variable}}` across the product. Prompts saved before
 * the switch may still hold the legacy `$var` / `${var}` form, which the backend
 * continues to substitute, so these checks accept either rather than blocking an
 * edit to an older prompt.
 */
function hasPlaceholder(template: string, name: string): boolean {
  return new RegExp(
    `\\{\\{\\s*${name}\\s*\\}\\}|\\$\\{${name}\\}|\\$${name}\\b`,
  ).test(template)
}

const STARTER_TEMPLATE =
  "You are grading an answer.\n\nQuestion: {{question}}\nAnswer: {{answer}}\n\n" +
  "Give a score from 0 to 1 for how well the answer meets the requirement, " +
  "and a short reason.\n\n" +
  'Return ONLY: {"score": <0-1>, "reason": "<why>"}'

interface JudgePromptRow {
  name: string
  description: string | null
  required_vars: string[]
  template: string
  platform_template: string
  is_overridden: boolean
  version: number
}

interface DatasetScorer {
  slug: string
  name: string
  template: string | null
  threshold: number
  created_at: string | null
}

/** An AI-drafted scorer the user can review, tweak, and save. */
interface ScorerProposal {
  name: string
  description: string
  prompt: string
  threshold: number
}

// A scorer being authored in the extended editor. `slug` present ⇒ editing an
// existing scorer; absent ⇒ creating a new one.
interface ScorerDraft {
  slug?: string
  name: string
  template: string
  threshold: number
}

/**
 * Right-side drawer that collects the batch-evaluation config for a dataset and
 * launches the run.
 *
 * Agentic datasets grade the whole trajectory (full judge picker). Metrics runs
 * grade an answer against its expected output: pick models, the built-in
 * metrics, and any of the dataset's saved custom scorers.
 *
 * Editing a metric prompt or authoring a custom scorer opens a side panel
 * hinged on this drawer's edge, so the drawer itself never grows across the
 * screen and the config you launched from stays visible. Both panels use the
 * same CodeMirror editor as the Prompts page; only one is open at a time.
 */
export function RunEvaluationDrawer({
  open,
  onClose,
  datasetId,
  exampleCount,
  isSingle,
  launching,
  onLaunch,
}: {
  open: boolean
  onClose: () => void
  datasetId: string
  exampleCount: number
  isSingle: boolean
  launching: EvalMode | "security" | null
  onLaunch: (mode: EvalMode, cfg: EvalLaunchConfig) => void
}) {
  const [mode, setMode] = useState<EvalMode>(isSingle ? "metrics" : "agentic")
  const [judgeSel, setJudgeSel] = useState<JudgeSelection>(DEFAULT_JUDGE_SELECTION)
  // Chat models from the price table, as `provider:model` specs for the pickers.
  const modelSpecOptions = toSpecs(useModels()).map((s) => ({ value: s.spec, label: s.label }))
  // Judge models for a metrics run. Picking more than one launches a run per
  // model so their scores can be compared; empty means the server default.
  const [metricsModels, setMetricsModels] = useState<string[]>([])
  // Judge models for an agentic run — same multi-model comparison as metrics.
  const [agenticModels, setAgenticModels] = useState<string[]>([])
  const [chosenMetrics, setChosenMetrics] = useState<string[]>(DEFAULT_METRICS)
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_METRICS[0])

  // Dataset custom scorers (the saved library) + this run's selection.
  const [scorers, setScorers] = useState<DatasetScorer[]>([])
  const [selectedScorers, setSelectedScorers] = useState<Set<string>>(new Set())
  const [scorersError, setScorersError] = useState<string | null>(null)
  const [scorersLoading, setScorersLoading] = useState(false)
  // Non-null while authoring a scorer in the extended editor.
  const [editing, setEditing] = useState<ScorerDraft | null>(null)
  const [savingScorer, setSavingScorer] = useState(false)
  // AI-suggested scorers awaiting review.
  const [proposals, setProposals] = useState<ScorerProposal[]>([])
  const [suggesting, setSuggesting] = useState(false)

  // Provider-key availability: which providers a run can actually use — the
  // org's saved BYOK keys plus the platform's managed keys. A selected model
  // whose provider is in neither can't run, so the launch is blocked until a
  // key is added.
  const [savedProviders, setSavedProviders] = useState<Set<string>>(new Set())
  const [managedProviders, setManagedProviders] = useState<Set<string>>(new Set())
  const [credConfigured, setCredConfigured] = useState(true)
  // Non-null while the add-key dialog is open for a provider.
  const [addingKeyFor, setAddingKeyFor] = useState<string | null>(null)

  // Built-in metric prompts: the org/platform rows plus this dataset's forks.
  const [prompts, setPrompts] = useState<Record<string, JudgePromptRow>>({})
  const [promptOverrides, setPromptOverrides] = useState<Record<string, string>>({})
  const [promptsLoading, setPromptsLoading] = useState(false)
  const [promptsError, setPromptsError] = useState<string | null>(null)
  // Non-null while a metric prompt is open in the wide workbench.
  const [editingPrompt, setEditingPrompt] = useState<
    { metric: string; name: string; draft: string } | null
  >(null)
  const [savingPrompt, setSavingPrompt] = useState(false)

  const effectiveMode: EvalMode = isSingle ? "metrics" : mode

  const loadScorers = useCallback(async () => {
    setScorersLoading(true)
    setScorersError(null)
    try {
      const res = await authFetch<{ scorers: DatasetScorer[] }>(
        `/api/v1/datasets/${datasetId}/scorers`,
      )
      setScorers(res.scorers)
      // Keep only still-present selections; new scorers stay opt-in per run.
      setSelectedScorers((prev) => new Set(res.scorers.map((s) => s.slug).filter((slug) => prev.has(slug))))
    } catch (err) {
      setScorersError(err instanceof ApiError ? err.detail : "Failed to load scorers")
    } finally {
      setScorersLoading(false)
    }
  }, [datasetId])

  const loadPrompts = useCallback(async () => {
    setPromptsLoading(true)
    setPromptsError(null)
    try {
      const [orgRes, dsRes] = await Promise.all([
        authFetch<{ prompts: JudgePromptRow[] }>("/api/v1/eval/judge-prompts"),
        authFetch<{ overrides: Record<string, string> }>(
          `/api/v1/datasets/${datasetId}/judge-prompts`,
        ),
      ])
      const map: Record<string, JudgePromptRow> = {}
      for (const p of orgRes.prompts) map[p.name] = p
      setPrompts(map)
      setPromptOverrides(dsRes.overrides ?? {})
    } catch (err) {
      setPromptsError(err instanceof ApiError ? err.detail : "Failed to load prompts")
    } finally {
      setPromptsLoading(false)
    }
  }, [datasetId])

  const loadCredentials = useCallback(async () => {
    try {
      const res = await authFetch<{
        configured: boolean
        managed_providers: string[]
        credentials: { provider: string; status?: string }[]
      }>("/api/v1/credentials")
      setCredConfigured(res.configured)
      setManagedProviders(new Set(res.managed_providers ?? []))
      setSavedProviders(new Set((res.credentials ?? []).map((c) => c.provider)))
    } catch {
      // Availability is a hint; if it can't load, don't block the run over it.
      setManagedProviders(new Set())
      setSavedProviders(new Set())
    }
  }, [])

  // Scorers, judge prompts, and key availability load whenever the drawer opens.
  useEffect(() => {
    if (!open) return
    loadScorers()
    loadPrompts()
    loadCredentials()
  }, [open, loadScorers, loadPrompts, loadCredentials])

  // Close on Escape (but Escape inside the scorer editor just closes the editor).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (editingPrompt) setEditingPrompt(null)
      else if (editing) setEditing(null)
      else onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose, editing, editingPrompt])

  // Keep the active prompt tab valid as the selected metrics change.
  useEffect(() => {
    if (chosenMetrics.length === 0) return
    if (!chosenMetrics.includes(activeTab)) setActiveTab(chosenMetrics[0])
  }, [chosenMetrics, activeTab])

  if (!open) return null

  const busy = launching !== null
  const selected = scorers.filter((s) => selectedScorers.has(s.slug))

  const activeModels = effectiveMode === "agentic" ? agenticModels : metricsModels

  // Providers of the selected models that have no key path (neither a saved
  // BYOK key nor a managed platform key). A run can't use them, so it's blocked.
  const missingProviders = Array.from(
    new Set(activeModels.map((m) => m.split(":")[0])),
  ).filter((p) => !savedProviders.has(p) && !managedProviders.has(p))
  const keysReady = missingProviders.length === 0

  const canRun =
    keysReady &&
    (effectiveMode !== "metrics" || chosenMetrics.length > 0 || selected.length > 0)

  // Rough scale of a run, so the cost of judge/model choice is visible before
  // launch. Every grader costs at least one judge call per example, and each
  // extra model repeats the whole run. A metrics grader is a built-in metric or
  // a custom scorer; an agentic run's judged layers depend on depth (fast stops
  // after tool selection, standard/deep add trajectory + coordination). Treat
  // it as a floor: multi-step metrics and a deep jury make more calls each.
  const modelCount = Math.max(1, activeModels.length)
  const agenticLayers = judgeSel.depth === "fast" ? 1 : 3
  const graderCount =
    effectiveMode === "agentic"
      ? agenticLayers + selected.length
      : chosenMetrics.length + selected.length
  const estCalls = exampleCount * graderCount * modelCount
  const costNote =
    effectiveMode === "agentic"
      ? judgeSel.depth === "deep"
        ? "Deep depth adds a jury, multiplying judge calls per layer."
        : "Only spans with tool calls trigger the tool-selection layer."
      : "Multi-step metrics like hallucination make more than one call each."

  function toggleScorer(slug: string, on: boolean) {
    setSelectedScorers((prev) => {
      const next = new Set(prev)
      if (on) next.add(slug)
      else next.delete(slug)
      return next
    })
  }

  async function saveScorer() {
    if (!editing || savingScorer) return
    if (!editing.name.trim()) {
      toast.error("Give the scorer a name.")
      return
    }
    if (!hasPlaceholder(editing.template, "answer")) {
      toast.error("The prompt must reference {{answer}} (the output being graded).")
      return
    }
    setSavingScorer(true)
    try {
      const created = await authFetch<DatasetScorer>(`/api/v1/datasets/${datasetId}/scorers`, {
        method: "POST",
        body: {
          slug: editing.slug,
          name: editing.name.trim(),
          template: editing.template,
          threshold: editing.threshold,
        },
      })
      toast.success(`${editing.slug ? "Saved" : "Added"} scorer "${editing.name.trim()}"`)
      const slug = created?.slug
      await loadScorers()
      if (slug) setSelectedScorers((prev) => new Set(prev).add(slug))
      setEditing(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to save scorer")
    } finally {
      setSavingScorer(false)
    }
  }

  function openPromptEditor(metric: string, name: string) {
    setEditing(null)  // only one side panel at a time
    const row = prompts[name]
    setEditingPrompt({
      metric,
      name,
      draft: promptOverrides[name] ?? row?.template ?? "",
    })
  }

  async function savePrompt() {
    if (!editingPrompt || savingPrompt) return
    setSavingPrompt(true)
    try {
      await authFetch(`/api/v1/datasets/${datasetId}/judge-prompts/${editingPrompt.name}`, {
        method: "PUT",
        body: { template: editingPrompt.draft },
      })
      setPromptOverrides((prev) => ({ ...prev, [editingPrompt.name]: editingPrompt.draft }))
      toast.success(`Saved "${editingPrompt.name}" for this dataset`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to save prompt")
    } finally {
      setSavingPrompt(false)
    }
  }

  async function resetPrompt() {
    if (!editingPrompt || savingPrompt) return
    setSavingPrompt(true)
    try {
      await authFetch(`/api/v1/datasets/${datasetId}/judge-prompts/${editingPrompt.name}`, {
        method: "DELETE",
      })
      setPromptOverrides((prev) => {
        const next = { ...prev }
        delete next[editingPrompt.name]
        return next
      })
      const inherited = prompts[editingPrompt.name]?.template ?? ""
      setEditingPrompt({ ...editingPrompt, draft: inherited })
      toast.success(`"${editingPrompt.name}" now inherits the shared prompt`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to reset prompt")
    } finally {
      setSavingPrompt(false)
    }
  }

  async function suggestScorers() {
    if (suggesting) return
    setSuggesting(true)
    try {
      const res = await authFetch<{ proposals: ScorerProposal[]; error?: string | null }>(
        `/api/v1/datasets/${datasetId}/scorers/suggest`,
        { method: "POST", body: { count: 4 } },
      )
      if (res.error) toast.error(res.error)
      setProposals(res.proposals ?? [])
      if (!res.error && (res.proposals ?? []).length === 0) {
        toast("No scorer suggestions came back for this dataset.")
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Couldn't suggest scorers")
    } finally {
      setSuggesting(false)
    }
  }

  // Review a suggestion in the editor before it's saved — nothing is persisted
  // until the user hits Save there.
  function useProposal(p: ScorerProposal) {
    setProposals([])
    setEditingPrompt(null)
    setEditing({ name: p.name, template: p.prompt, threshold: p.threshold })
  }

  async function removeScorer(slug: string) {
    try {
      await authFetch(`/api/v1/datasets/${datasetId}/scorers/${slug}`, { method: "DELETE" })
      setScorers((prev) => prev.filter((x) => x.slug !== slug))
      setSelectedScorers((prev) => {
        const next = new Set(prev)
        next.delete(slug)
        return next
      })
      toast.success("Scorer removed")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to remove scorer")
    }
  }

  function handleRun() {
    if (!canRun || busy) return
    if (effectiveMode === "metrics") {
      const custom_judges: Record<string, number> = {}
      for (const s of selected) custom_judges[s.slug] = s.threshold
      onLaunch("metrics", {
        models: metricsModels,
        metrics: chosenMetrics,
        custom_judges: Object.keys(custom_judges).length ? custom_judges : undefined,
      })
    } else {
      const custom_judges: Record<string, number> = {}
      for (const s of selected) custom_judges[s.slug] = s.threshold
      onLaunch("agentic", {
        models: agenticModels,
        depth: judgeSel.depth,
        jury: judgeSel.jury,
        custom_judges: Object.keys(custom_judges).length ? custom_judges : undefined,
      })
    }
  }

  const title = "Run evaluation"
  const subtitle = "Configure how every example in this dataset is graded."

  function dismissTop() {
    if (editingPrompt) setEditingPrompt(null)
    else if (editing) setEditing(null)
    else onClose()
  }

  const promptDirty =
    editingPrompt !== null &&
    editingPrompt.draft !==
      (promptOverrides[editingPrompt.name] ?? prompts[editingPrompt.name]?.template ?? "")

  return (
    <div role="dialog" aria-modal="true" aria-label="Run evaluation" className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={dismissTop} />

      <ProviderKeyDialog
        provider={addingKeyFor}
        configured={credConfigured}
        onClose={() => setAddingKeyFor(null)}
        onSaved={(provider) => {
          setSavedProviders((prev) => new Set(prev).add(provider))
          setAddingKeyFor(null)
        }}
      />

      {/* Prompt workbench. A second panel hinged on the drawer's edge rather
          than the drawer growing across the screen, so the config you launched
          from stays put and visible while you edit a prompt. */}
      {editingPrompt ? (
        <div className="flex h-full w-full max-w-3xl flex-col border-l border-border/60 bg-background shadow-2xl duration-200 animate-in slide-in-from-right-6">
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate font-mono text-base font-semibold">{editingPrompt.name}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {editingPrompt.metric === "agentic" ? "Agentic" : editingPrompt.metric} pipeline.
                Edits apply to this dataset only.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingPrompt(null)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close prompt editor"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </button>
          </div>

          <PromptWorkbench
            metric={editingPrompt.metric}
            name={editingPrompt.name}
            draft={editingPrompt.draft}
            requiredVars={prompts[editingPrompt.name]?.required_vars ?? []}
            isForked={promptOverrides[editingPrompt.name] !== undefined}
            disabled={savingPrompt}
            onChange={(draft) => setEditingPrompt({ ...editingPrompt, draft })}
          />

          <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
            {promptOverrides[editingPrompt.name] !== undefined ? (
              <Button
                variant="ghost"
                size="sm"
                className="mr-auto text-[11px]"
                onClick={resetPrompt}
                disabled={savingPrompt}
              >
                Reset to shared prompt
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => setEditingPrompt(null)} disabled={savingPrompt}>
              Back
            </Button>
            <Button size="sm" onClick={savePrompt} disabled={savingPrompt || !promptDirty}>
              {savingPrompt ? (
                <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
              ) : null}
              Save for this dataset
            </Button>
          </div>
        </div>
      ) : null}

      {/* Custom scorer editor. Same hinged side panel as the prompt workbench,
          so the drawer never grows across the screen. */}
      {editing ? (
        <div className="flex h-full w-full max-w-3xl flex-col border-l border-border/60 bg-background shadow-2xl duration-200 animate-in slide-in-from-right-6">
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="min-w-0">
              <h2 className="font-heading text-base font-semibold">
                {editing.slug ? "Edit scorer" : "New custom scorer"}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Author the judge prompt that grades each example.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close scorer editor"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </button>
          </div>

          <ScorerEditorBody draft={editing} onChange={setEditing} disabled={savingScorer} />

          <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)} disabled={savingScorer}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={saveScorer}
              disabled={
                savingScorer || !editing.name.trim() || !hasPlaceholder(editing.template, "answer")
              }
            >
              {savingScorer ? (
                <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
              ) : null}
              {editing.slug ? "Save scorer" : "Add scorer"}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Primary drawer: stays anchored at its own width. */}
      <div className="flex h-full w-full max-w-lg flex-col border-l border-border/60 bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="font-heading text-base font-semibold">{title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {/* Evaluator — agentic datasets choose evaluator vs scorer. */}
            {!isSingle ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Evaluator</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { m: "agentic" as const, icon: RoboticIcon, title: "Agentic", desc: "Score the full trajectory" },
                    { m: "metrics" as const, icon: TestTube01Icon, title: "Metrics", desc: "Grade answer vs expected" },
                  ]).map((opt) => {
                    const isSel = mode === opt.m
                    return (
                      <button
                        key={opt.m}
                        type="button"
                        onClick={() => setMode(opt.m)}
                        className={cn(
                          "rounded-lg border p-3 text-left transition-colors",
                          isSel
                            ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                            : "border-border/60 hover:bg-muted/40",
                        )}
                      >
                        <HugeiconsIcon icon={opt.icon} size={16} className={isSel ? "text-primary" : "text-muted-foreground"} />
                        <p className={cn("mt-1.5 text-sm font-medium", isSel ? "text-primary" : "text-foreground")}>
                          {opt.title}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{opt.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {effectiveMode === "agentic" ? (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-foreground">Models to compare</p>
                  <MultiSelectDropdown
                    label="model"
                    placeholder="Server default"
                    options={modelSpecOptions}
                    selected={agenticModels}
                    onToggle={(v, on) =>
                      setAgenticModels((prev) => (on ? [...prev, v] : prev.filter((x) => x !== v)))
                    }
                    disabled={busy}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {agenticModels.length > 1
                      ? `Each model runs separately, then compared side by side. This is the judge — different from the Deep jury, which votes within one run.`
                      : "The judge model that scores the trajectory. Pick more than one to run each separately and compare them."}
                  </p>
                  <CostHint
                    graderCount={graderCount}
                    modelCount={modelCount}
                    exampleCount={exampleCount}
                    estCalls={estCalls}
                    note={costNote}
                    unit="layer"
                  />
                  <MissingKeysCallout
                    providers={missingProviders}
                    configured={credConfigured}
                    onAdd={setAddingKeyFor}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Depth &amp; jury</p>
                  <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5">
                    <JudgePicker
                      value={judgeSel}
                      onChange={setJudgeSel}
                      disabled={busy}
                      showModel={false}
                    />
                    <p className="mt-2.5 text-[11px] text-muted-foreground">
                      How far the pipeline runs. The Deep jury is a panel that votes
                      within each run, separate from the models compared above.
                    </p>
                  </div>
                </div>

                <AgenticPrompts
                  prompts={prompts}
                  overrides={promptOverrides}
                  loading={promptsLoading}
                  error={promptsError}
                  onEdit={openPromptEditor}
                />

                <CustomScorers
                  scorers={scorers}
                  selected={selectedScorers}
                  loading={scorersLoading}
                  error={scorersError}
                  disabled={busy}
                  onToggle={toggleScorer}
                  onAdd={() => {
                    setEditingPrompt(null)
                    setEditing({ name: "", template: STARTER_TEMPLATE, threshold: 0.5 })
                  }}
                  onEdit={(s) => {
                    setEditingPrompt(null)
                    setEditing({ slug: s.slug, name: s.name, template: s.template ?? STARTER_TEMPLATE, threshold: s.threshold })
                  }}
                  onRemove={removeScorer}
                  note="Graded against each run's final answer."
                  onSuggest={suggestScorers}
                  suggesting={suggesting}
                  proposals={proposals}
                  onUseProposal={useProposal}
                  onClearProposals={() => setProposals([])}
                />
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-foreground">Models to compare</p>
                  <MultiSelectDropdown
                    label="model"
                    placeholder="Server default"
                    options={modelSpecOptions}
                    selected={metricsModels}
                    onToggle={(v, on) =>
                      setMetricsModels((prev) => (on ? [...prev, v] : prev.filter((x) => x !== v)))
                    }
                    disabled={busy}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {metricsModels.length > 1
                      ? `Each model runs separately, then compared side by side.`
                      : "The judge model that grades each answer. Pick more than one to run each separately and compare them."}
                  </p>
                  <CostHint
                    graderCount={graderCount}
                    modelCount={modelCount}
                    exampleCount={exampleCount}
                    estCalls={estCalls}
                    note={costNote}
                    unit="grader"
                  />
                  <MissingKeysCallout
                    providers={missingProviders}
                    configured={credConfigured}
                    onAdd={setAddingKeyFor}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Metrics</p>
                  <MultiSelectDropdown
                    label="metric"
                    placeholder="Select metrics"
                    options={METRIC_CHOICES.map((m) => ({ value: m, label: metricLabel(m) }))}
                    selected={chosenMetrics}
                    onToggle={(m, on) =>
                      setChosenMetrics((prev) => (on ? [...prev, m] : prev.filter((x) => x !== m)))
                    }
                    disabled={busy}
                  />
                </div>

                {chosenMetrics.length > 0 ? (
                  <MetricPromptTabs
                    metrics={chosenMetrics}
                    activeTab={chosenMetrics.includes(activeTab) ? activeTab : chosenMetrics[0]}
                    onTabChange={setActiveTab}
                    prompts={prompts}
                    overrides={promptOverrides}
                    loading={promptsLoading}
                    error={promptsError}
                    onEdit={openPromptEditor}
                  />
                ) : null}

                <CustomScorers
                  scorers={scorers}
                  selected={selectedScorers}
                  loading={scorersLoading}
                  error={scorersError}
                  disabled={busy}
                  onToggle={toggleScorer}
                  onAdd={() => {
                    setEditingPrompt(null)
                    setEditing({ name: "", template: STARTER_TEMPLATE, threshold: 0.5 })
                  }}
                  onEdit={(s) => {
                    setEditingPrompt(null)
                    setEditing({ slug: s.slug, name: s.name, template: s.template ?? STARTER_TEMPLATE, threshold: s.threshold })
                  }}
                  onRemove={removeScorer}
                  onSuggest={suggestScorers}
                  suggesting={suggesting}
                  proposals={proposals}
                  onUseProposal={useProposal}
                  onClearProposals={() => setProposals([])}
                />
              </>
            )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleRun} disabled={!canRun || busy}>
            {busy ? (
              <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
            ) : (
              <HugeiconsIcon icon={PlayIcon} size={13} />
            )}
            Run evaluation
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Scorer editor (extended drawer body) ────────────────────────────────────

function ScorerEditorBody({
  draft,
  onChange,
  disabled,
}: {
  draft: ScorerDraft
  onChange: (draft: ScorerDraft) => void
  disabled: boolean
}) {
  const hasAnswer = hasPlaceholder(draft.template, "answer")
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden px-5 py-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Name</label>
          <input
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder="Scorer name (e.g. Tone check)"
            disabled={disabled}
            autoFocus
            className="h-8 w-full rounded-md border border-border/60 bg-background px-2.5 text-sm text-foreground outline-none focus:border-primary/50"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Pass ≥</label>
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={draft.threshold}
            onChange={(e) => onChange({ ...draft, threshold: Number(e.target.value) })}
            disabled={disabled}
            className="h-8 w-24 rounded-md border border-border/60 bg-background px-2.5 text-sm text-foreground outline-none focus:border-primary/50"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <label className="mb-1 text-[11px] text-muted-foreground">Prompt</label>
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border/60">
          <PromptEditor
            value={draft.template}
            onChange={(v) => onChange({ ...draft, template: v })}
            placeholder={STARTER_TEMPLATE}
            varSyntax="both"
          />
        </div>
      </div>

      {!hasAnswer ? (
        <p className="text-[11px] text-destructive">
          The prompt must reference <span className="font-mono">{"{{answer}}"}</span> (the output being graded).
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Placeholders: <span className="font-mono">{"{{answer}}"}</span>, <span className="font-mono">{"{{question}}"}</span>,{" "}
          <span className="font-mono">{"{{context}}"}</span>. Return{" "}
          <span className="font-mono">{'{"score", "reason"}'}</span>.
        </p>
      )}
    </div>
  )
}

// ── Cost hint ───────────────────────────────────────────────────────────────

/** Pre-launch scale of a run in judge calls. Amber when >1 model, since each
 *  model repeats the whole run. Counts, not money, matching the rest of the app. */
function CostHint({
  graderCount,
  modelCount,
  exampleCount,
  estCalls,
  note,
  unit,
}: {
  graderCount: number
  modelCount: number
  exampleCount: number
  estCalls: number
  note: string
  unit: string
}) {
  if (graderCount <= 0 || exampleCount <= 0) return null
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`
  return (
    <div
      className={cn(
        "rounded-md border px-2.5 py-2 text-[11px] leading-relaxed",
        modelCount > 1
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          : "border-border/60 bg-muted/20 text-muted-foreground",
      )}
    >
      {modelCount > 1 ? (
        <>
          <span className="font-medium">{modelCount}× the cost of a single-model run.</span>{" "}
          {plural(modelCount, "model")} × {plural(exampleCount, "example")} ×{" "}
          {plural(graderCount, unit)} is at least{" "}
          <span className="font-mono">{estCalls.toLocaleString()}</span> judge calls. Each model
          bills separately, on your key where you have one saved.
        </>
      ) : (
        <>
          At least <span className="font-mono">{estCalls.toLocaleString()}</span> judge calls (
          {plural(exampleCount, "example")} × {plural(graderCount, unit)}).
        </>
      )}{" "}
      {note}
    </div>
  )
}

// ── Prompt row (shared by metric tabs and the agentic prompt list) ──────────

function PromptRow({
  name,
  template,
  forked,
  orgOverridden,
  index,
  onEdit,
}: {
  name: string
  template: string
  forked: boolean
  orgOverridden: boolean
  index?: number
  onEdit: () => void
}) {
  const preview = template.replace(/\s+/g, " ").slice(0, 80)
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-left transition-colors hover:bg-muted/40"
    >
      {typeof index === "number" ? (
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground/60">{index}</span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-foreground">{name}</span>
          {forked ? (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
              This dataset
            </span>
          ) : orgOverridden ? (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              Org
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground/70">
          {preview}…
        </span>
      </span>
      <HugeiconsIcon icon={PencilEdit02Icon} size={13} className="shrink-0 text-muted-foreground" />
    </button>
  )
}

// ── Agentic layer prompts ───────────────────────────────────────────────────

/**
 * The judge prompts the agentic evaluator runs (tool selection, trajectory,
 * multi-agent coordination), each opening the same workbench as the metric
 * prompts so its place in the pipeline is visible while editing.
 */
function AgenticPrompts({
  prompts,
  overrides,
  loading,
  error,
  onEdit,
}: {
  prompts: Record<string, JudgePromptRow>
  overrides: Record<string, string>
  loading: boolean
  error: string | null
  onEdit: (metric: string, name: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-foreground">Judge prompts</p>
          <p className="text-[11px] text-muted-foreground">
            The layers the agentic evaluator judges — including which tools <em>and MCP
            servers</em> were chosen. Edits apply to this dataset only.
          </p>
        </div>
        {loading ? (
          <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {error ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : loading ? (
        <p className="py-3 text-[11px] text-muted-foreground">Loading prompts…</p>
      ) : (
        <div className="space-y-1.5">
          {AGENTIC_PROMPTS.map((name, idx) => {
            const row = prompts[name]
            if (!row) {
              return (
                <p key={name} className="text-[11px] text-muted-foreground">
                  Prompt <span className="font-mono">{name}</span> is unavailable.
                </p>
              )
            }
            return (
              <PromptRow
                key={name}
                name={name}
                index={idx + 1}
                template={overrides[name] ?? row.template}
                forked={overrides[name] !== undefined}
                orgOverridden={row.is_overridden}
                onEdit={() => onEdit("agentic", name)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Per-metric prompt tabs (presentational) ─────────────────────────────────

/**
 * Tab strip over the selected metrics. Each tab lists the judge prompts that
 * metric runs, in pipeline order, and opens one in the wide workbench. Editing
 * happens there so there is room for a real editor plus the flow diagram.
 */
function MetricPromptTabs({
  metrics,
  activeTab,
  onTabChange,
  prompts,
  overrides,
  loading,
  error,
  onEdit,
}: {
  metrics: string[]
  activeTab: string
  onTabChange: (metric: string) => void
  prompts: Record<string, JudgePromptRow>
  overrides: Record<string, string>
  loading: boolean
  error: string | null
  onEdit: (metric: string, name: string) => void
}) {
  const names = metricPromptNames(activeTab)
  const multi = isMultiStep(activeTab)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-foreground">Prompts</p>
          <p className="text-[11px] text-muted-foreground">
            Edits apply to this dataset only.
          </p>
        </div>
        {loading ? (
          <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border/60">
        {metrics.map((m) => {
          const on = m === activeTab
          return (
            <button
              key={m}
              type="button"
              onClick={() => onTabChange(m)}
              className={cn(
                "-mb-px border-b-2 px-2.5 py-1.5 text-[11px] transition-colors",
                on
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {metricLabel(m)}
            </button>
          )
        })}
      </div>

      {multi ? (
        <p className="text-[11px] text-muted-foreground">
          {names.length} judge calls run in sequence. Open one to edit it and see where it sits in the pipeline.
        </p>
      ) : null}

      {error ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : loading ? (
        <p className="py-3 text-[11px] text-muted-foreground">Loading prompts…</p>
      ) : (
        <div className="space-y-1.5">
          {names.map((name, idx) => {
            const row = prompts[name]
            if (!row) {
              return (
                <p key={name} className="text-[11px] text-muted-foreground">
                  Prompt <span className="font-mono">{name}</span> is unavailable.
                </p>
              )
            }
            return (
              <PromptRow
                key={name}
                name={name}
                index={multi ? idx + 1 : undefined}
                template={overrides[name] ?? row.template}
                forked={overrides[name] !== undefined}
                orgOverridden={row.is_overridden}
                onEdit={() => onEdit(activeTab, name)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Prompt workbench (wide: editor + pipeline diagram) ──────────────────────

/**
 * The wide editing surface for one metric prompt: the same CodeMirror editor
 * the Prompts page uses, with the metric's evaluation architecture underneath
 * so it is clear which stage of a multi-step check is being edited.
 */
function PromptWorkbench({
  metric,
  name,
  draft,
  requiredVars,
  isForked,
  disabled,
  onChange,
}: {
  metric: string
  name: string
  draft: string
  requiredVars: string[]
  isForked: boolean
  disabled: boolean
  onChange: (draft: string) => void
}) {
  const missing = requiredVars.filter((v) => !hasPlaceholder(draft, v))

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden px-5 py-4">
      <div className="flex items-center gap-2">
        {isForked ? (
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
            This dataset
          </span>
        ) : (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            Inherited
          </span>
        )}
        {requiredVars.length > 0 ? (
          <span className="text-[10px] text-muted-foreground">
            Required:{" "}
            {requiredVars.map((v) => (
              <span
                key={v}
                className={cn("mr-1 font-mono", missing.includes(v) && "text-destructive")}
              >
                {`{{${v}}}`}
              </span>
            ))}
          </span>
        ) : null}
      </div>

      {/* Editor */}
      <div className="min-h-0 flex-[3] overflow-hidden rounded-md border border-border/60">
        <PromptEditor value={draft} onChange={onChange} varSyntax="both" />
      </div>

      {missing.length > 0 ? (
        <p className="text-[11px] text-destructive">
          Missing required placeholder{missing.length === 1 ? "" : "s"}:{" "}
          {missing.map((v) => `{{${v}}}`).join(", ")}
        </p>
      ) : null}

      {/* Evaluation architecture */}
      <div className="min-h-0 flex-[2]">
        <p className="mb-1 text-[11px] font-medium text-foreground">
          {metric === "agentic" ? "How the agentic evaluator works" : `How ${metric} is evaluated`}
        </p>
        <div className="h-[calc(100%-1.25rem)] min-h-40 overflow-hidden rounded-md border border-border/60 bg-muted/10">
          <MetricFlowDiagram metric={metric} activePrompt={name} />
        </div>
      </div>
    </div>
  )
}


// ── Dataset custom scorers (presentational) ─────────────────────────────────

function CustomScorers({
  scorers,
  selected,
  loading,
  error,
  disabled,
  onToggle,
  onAdd,
  onEdit,
  onRemove,
  note,
  onSuggest,
  suggesting,
  proposals,
  onUseProposal,
  onClearProposals,
}: {
  scorers: DatasetScorer[]
  selected: Set<string>
  loading: boolean
  error: string | null
  disabled: boolean
  onToggle: (slug: string, on: boolean) => void
  onAdd: () => void
  onEdit: (scorer: DatasetScorer) => void
  onRemove: (slug: string) => void
  /** Overrides the default sub-heading, e.g. for the agentic path. */
  note?: string
  onSuggest: () => void
  suggesting: boolean
  proposals: ScorerProposal[]
  onUseProposal: (p: ScorerProposal) => void
  onClearProposals: () => void
}) {
  const selectedScorers = scorers.filter((s) => selected.has(s.slug))

  return (
    <div className="space-y-2 border-t border-border/60 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-foreground">Custom scorers</p>
          <p className="text-[11px] text-muted-foreground">
            {note ?? "Saved to this dataset. Toggle which ones run this time."}
          </p>
        </div>
        {loading ? (
          <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <MultiSelectDropdown
            label="scorer"
            placeholder={scorers.length === 0 ? "No scorers yet" : "Select scorers"}
            emptyText="No custom scorers saved yet."
            options={scorers.map((s) => ({ value: s.slug, label: s.name }))}
            selected={Array.from(selected)}
            onToggle={onToggle}
            disabled={disabled}
            onAdd={onAdd}
            addLabel="Add custom scorer"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={onSuggest}
          disabled={disabled || suggesting}
          title="Draft scorers from this dataset's examples"
        >
          {suggesting ? (
            <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
          ) : (
            <HugeiconsIcon icon={SparklesIcon} size={13} />
          )}
          Suggest
        </Button>
      </div>

      {proposals.length > 0 ? (
        <div className="space-y-1.5 rounded-md border border-primary/30 bg-primary/5 p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-foreground">
              {proposals.length} suggested scorer{proposals.length === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              onClick={onClearProposals}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </button>
          </div>
          {proposals.map((p, i) => (
            <div
              key={`${p.name}-${i}`}
              className="flex items-start gap-2 rounded border border-border/50 bg-background/70 px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium text-foreground">{p.name}</p>
                {p.description ? (
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{p.description}</p>
                ) : null}
              </div>
              <Button
                size="sm"
                className="h-6 shrink-0 px-2 text-[11px]"
                onClick={() => onUseProposal(p)}
                disabled={disabled}
              >
                Review
              </Button>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground/70">
            Opens in the editor — nothing is saved until you confirm.
          </p>
        </div>
      ) : null}

      {selectedScorers.map((s) => (
        <div
          key={s.slug}
          className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">{s.name}</p>
            <p className="font-mono text-[10px] text-muted-foreground/60">
              {s.slug} · pass ≥ {s.threshold}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={() => onEdit(s)}
            disabled={disabled}
          >
            <HugeiconsIcon icon={PencilEdit02Icon} size={12} />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-destructive hover:text-destructive"
            onClick={() => onRemove(s.slug)}
            disabled={disabled}
          >
            <HugeiconsIcon icon={Delete02Icon} size={12} />
          </Button>
        </div>
      ))}
    </div>
  )
}
