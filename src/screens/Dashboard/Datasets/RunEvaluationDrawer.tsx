"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Cancel01Icon,
  Database02Icon,
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
import { SearchSelect } from "@/components/SearchSelect"
import { useModels, toSpecs, specModel } from "@/lib/useModels"
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

/**
 * The thing being evaluated: a prompt + model executed against every example to
 * produce fresh output, which is then what gets graded.
 *
 * Omitting the task grades the output each example already carries — the right
 * choice when the dataset holds real production traces and you want to know how
 * *those* scored. Supplying one is how you answer the other question: if I
 * change this prompt or this model, do my scores go up or down?
 */
export interface TaskConfig {
  prompt_id?: string
  prompt_version?: number
  template?: string
  system?: string
  model?: string
}

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
  /** Present ⇒ generate fresh output with this prompt before grading. */
  task?: TaskConfig
  /** Names the run, so a list of runs reads as a list of experiments. */
  name?: string
  /**
   * How many times to run each example. Only meaningful with a task: the point
   * is to see how much a score moves when nothing about the input changed.
   */
  trials?: number
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

/**
 * Provider calls one task run is allowed to make, mirroring the API's
 * MAX_TASK_EXAMPLES. Trials divide into it rather than multiplying past it, so
 * the ceiling means the same thing whatever the trial count.
 */
const MAX_TASK_GENERATIONS = 500

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

// A task template starts by showing the one variable that always exists, so the
// syntax is learned from a working example rather than from documentation.
const STARTER_TASK_TEMPLATE = "{{input}}"

/** Variables every task template can reference, whatever the dataset holds. */
const TASK_VARS = ["input", "expected"] as const

/** A saved prompt, as the task picker needs it. */
interface SavedPromptRef {
  prompt_id: string
  name: string
  slug: string
  template: string
  model: string | null
  version: number
  kind: string
}

interface JudgePromptRow {
  name: string
  description: string | null
  required_vars: string[]
  template: string
  platform_template: string
  is_overridden: boolean
  version: number
}

/** How a scorer decides its number: ask a model, or run an expression. */
type ScorerKind = "judge" | "code"

/**
 * One option a choice-scored judge can pick, and what it is worth.
 *
 * Asking a model for a calibrated float is asking it to do the thing it is worst
 * at; picking between written options is a classification task it does well. The
 * number then comes from this table, so it never varies between runs.
 */
interface ScorerChoice {
  label: string
  score: number
}

interface DatasetScorer {
  slug: string
  name: string
  template: string | null
  kind: ScorerKind
  choices: ScorerChoice[] | null
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
  kind: ScorerKind
  /** null ⇒ the judge returns a free 0–1 score, the behaviour judges have always had. */
  choices: ScorerChoice[] | null
  threshold: number
}

// A code scorer opens on a check people actually write, so the language is
// learned from a working example rather than from a reference page.
const STARTER_CODE = "len(output) < 500"

// Turning choices on opens with pass/fail, which is what most rubrics are.
const STARTER_CHOICES: ScorerChoice[] = [
  { label: "Y", score: 1 },
  { label: "N", score: 0 },
]

/**
 * Whether a choice set can be saved. Mirrors the server's rules so the failure
 * is shown on the button rather than after a round trip. `null` (no choice set)
 * is always fine — it means the judge scores freely.
 */
function choicesUsable(choices: ScorerChoice[] | null): boolean {
  if (choices === null) return true
  if (choices.length < 2) return false
  const labels = choices.map((c) => c.label.trim().toLowerCase())
  if (labels.some((l) => !l)) return false
  if (new Set(labels).size !== labels.length) return false
  return choices.every((c) => c.score >= 0 && c.score <= 1)
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
  const allModels = useModels()
  const modelSpecOptions = toSpecs(allModels).map((s) => ({ value: s.spec, label: s.label }))
  // Judge models for a metrics run. Picking more than one launches a run per
  // model so their scores can be compared; empty means the server default.
  const [metricsModels, setMetricsModels] = useState<string[]>([])
  // Judge models for an agentic run — same multi-model comparison as metrics.
  const [agenticModels, setAgenticModels] = useState<string[]>([])
  const [chosenMetrics, setChosenMetrics] = useState<string[]>(DEFAULT_METRICS)
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_METRICS[0])

  // ── Task: what is being evaluated ──
  // Off by default, because the existing behaviour — grading the output each
  // example already carries — is the right answer for a dataset of real traces.
  // Turning it on is how you ask the other question: if I change this prompt or
  // this model, do my scores move?
  const [taskOn, setTaskOn] = useState(false)
  const [taskSource, setTaskSource] = useState<"prompt" | "inline">("prompt")
  const [taskPromptId, setTaskPromptId] = useState<string>("")
  const [taskTemplate, setTaskTemplate] = useState<string>(STARTER_TASK_TEMPLATE)
  const [taskModel, setTaskModel] = useState<string>("")
  const [trials, setTrials] = useState(1)
  const [savedPrompts, setSavedPrompts] = useState<SavedPromptRef[]>([])
  const [promptsListError, setPromptsListError] = useState<string | null>(null)
  const [runName, setRunName] = useState<string>("")

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

  // Saved prompts the task can run. Judge prompts are excluded: they grade an
  // answer, they don't produce one.
  const loadSavedPrompts = useCallback(async () => {
    setPromptsListError(null)
    try {
      const res = await authFetch<{ prompts: SavedPromptRef[] }>("/api/v1/prompts")
      setSavedPrompts((res.prompts ?? []).filter((p) => p.kind !== "judge"))
    } catch (err) {
      setPromptsListError(err instanceof ApiError ? err.detail : "Failed to load prompts")
      setSavedPrompts([])
    }
  }, [])

  // Scorers, judge prompts, and key availability load whenever the drawer opens.
  useEffect(() => {
    if (!open) return
    loadScorers()
    loadPrompts()
    loadCredentials()
    loadSavedPrompts()
  }, [open, loadScorers, loadPrompts, loadCredentials, loadSavedPrompts])

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

  const chosenTaskPrompt = savedPrompts.find((p) => p.prompt_id === taskPromptId)
  // The task's own model, resolved the way the server will: an explicit choice
  // wins, otherwise the saved prompt's model.
  const effectiveTaskModel = taskOn
    ? specModel(taskModel) || (taskSource === "prompt" ? chosenTaskPrompt?.model ?? "" : "")
    : ""
  // Generation is BYOK only — there is no managed key path for a task, because
  // the task is the customer's own product, not our grading. The provider comes
  // from the price table rather than a second copy of the server's prefix rules,
  // so the two can't drift as models are added.
  const taskProvider = effectiveTaskModel
    ? allModels.find((m) => m.id === effectiveTaskModel)?.provider ?? null
    : null

  // Providers of the selected models that have no key path (neither a saved
  // BYOK key nor a managed platform key). A run can't use them, so it's blocked.
  const missingProviders = Array.from(
    new Set([
      ...activeModels.map((m) => m.split(":")[0]),
      ...(taskProvider && !savedProviders.has(taskProvider) ? [taskProvider] : []),
    ]),
  ).filter((p) => !savedProviders.has(p) && !managedProviders.has(p))
  const keysReady = missingProviders.length === 0

  // An enabled task must actually be runnable: something to run, and a model to
  // run it on. Launching without these fails server-side, so block it here.
  const taskReady =
    !taskOn ||
    (Boolean(effectiveTaskModel) &&
      (taskSource === "prompt" ? Boolean(chosenTaskPrompt) : taskTemplate.trim().length > 0))

  const canRun =
    keysReady &&
    taskReady &&
    (effectiveMode !== "metrics" || chosenMetrics.length > 0 || selected.length > 0)

  // Rough scale of a run, so the cost of judge/model choice is visible before
  // launch. Every grader costs at least one judge call per example, and each
  // extra model repeats the whole run. A metrics grader is a built-in metric or
  // a custom scorer; an agentic run's judged layers depend on depth (fast stops
  // after tool selection, standard/deep add trajectory + coordination). Treat
  // it as a floor: multi-step metrics and a deep jury make more calls each, and
  // a run that retrieves adds one retrieval-layer call per retrieval step at
  // every depth.
  const modelCount = Math.max(1, activeModels.length)
  const agenticLayers = judgeSel.depth === "fast" ? 1 : 3
  // Only judge scorers cost a model call. Counting code scorers here would
  // overstate the run and, worse, make the cheap option look expensive.
  const judgeScorerCount = selected.filter((s) => s.kind !== "code").length
  const codeScorerCount = selected.length - judgeScorerCount
  const graderCount =
    effectiveMode === "agentic"
      ? agenticLayers + judgeScorerCount
      : chosenMetrics.length + judgeScorerCount
  const estCalls = exampleCount * graderCount * modelCount
  const costNote =
    (effectiveMode === "agentic"
      ? judgeSel.depth === "deep"
        ? "Deep depth adds a jury, multiplying judge calls per layer."
        : "Tool selection runs only on spans with tool calls; retrieval adds a call per retrieval step."
      : "Multi-step metrics like hallucination make more than one call each.") +
    (codeScorerCount > 0
      ? ` ${codeScorerCount} code scorer${codeScorerCount === 1 ? "" : "s"} run free.`
      : "")

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
    if (editing.kind === "judge" && !hasPlaceholder(editing.template, "answer")) {
      toast.error("The prompt must reference {{answer}} (the output being graded).")
      return
    }
    if (editing.kind === "code" && !editing.template.trim()) {
      toast.error("Write the expression the scorer evaluates.")
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
          kind: editing.kind,
          choices: editing.kind === "judge" ? editing.choices : null,
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
    setEditing({ name: p.name, template: p.prompt, kind: "judge", choices: null, threshold: p.threshold })
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

  /**
   * The task to send, or undefined to keep grading the output each example
   * already carries. A saved prompt is sent by id + version so the run records
   * exactly which prompt it executed, and stays reproducible after that prompt
   * is edited.
   */
  function buildTask(): TaskConfig | undefined {
    if (!taskOn) return undefined
    const model = specModel(taskModel)
    if (taskSource === "prompt") {
      const chosen = savedPrompts.find((p) => p.prompt_id === taskPromptId)
      if (!chosen) return undefined
      return {
        prompt_id: chosen.prompt_id,
        prompt_version: chosen.version,
        ...(model ? { model } : {}),
      }
    }
    return { template: taskTemplate, ...(model ? { model } : {}) }
  }

  function handleRun() {
    if (!canRun || busy) return
    const task = buildTask()
    const name = runName.trim() || undefined
    const custom_judges: Record<string, number> = {}
    for (const s of selected) custom_judges[s.slug] = s.threshold
    const shared = {
      task,
      name,
      // Sent only with a task. Re-scoring one recorded output N times would
      // measure the judge's variance, not the model's, and quietly bill for it.
      trials: task && trials > 1 ? trials : undefined,
      custom_judges: Object.keys(custom_judges).length ? custom_judges : undefined,
    }
    if (effectiveMode === "metrics") {
      onLaunch("metrics", { ...shared, models: metricsModels, metrics: chosenMetrics })
    } else {
      onLaunch("agentic", {
        ...shared,
        models: agenticModels,
        depth: judgeSel.depth,
        jury: judgeSel.jury,
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
                savingScorer ||
                !editing.name.trim() ||
                !editing.template.trim() ||
                // A judge that never references the answer cannot see what it
                // is grading; a code scorer reads `output` as a variable and has
                // no placeholders to require.
                (editing.kind === "judge" && !hasPlaceholder(editing.template, "answer")) ||
                // Blank or duplicate labels are rejected server-side; catching
                // them here saves a round trip to be told so.
                !choicesUsable(editing.choices)
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
            <TaskSection
              on={taskOn}
              onToggle={setTaskOn}
              source={taskSource}
              onSourceChange={setTaskSource}
              prompts={savedPrompts}
              promptsError={promptsListError}
              promptId={taskPromptId}
              onPromptChange={setTaskPromptId}
              template={taskTemplate}
              onTemplateChange={setTaskTemplate}
              model={taskModel}
              onModelChange={setTaskModel}
              modelOptions={modelSpecOptions}
              inheritedModel={chosenTaskPrompt?.model ?? null}
              exampleCount={exampleCount}
              trials={trials}
              onTrialsChange={setTrials}
              disabled={busy}
            />

            <div className="space-y-1.5">
              <label htmlFor="run-name" className="text-xs font-medium text-foreground">
                Run name <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="run-name"
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
                disabled={busy}
                placeholder={taskOn ? "e.g. Support prompt v3 on GPT-5" : "e.g. Weekly baseline"}
                className="w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-primary/50 disabled:opacity-50"
              />
              <p className="text-[11px] text-muted-foreground">
                Names this run so the history reads as a list of experiments rather
                than a list of timestamps.
              </p>
            </div>

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
                    setEditing({ name: "", template: STARTER_TEMPLATE, kind: "judge", choices: null, threshold: 0.5 })
                  }}
                  onEdit={(s) => {
                    setEditingPrompt(null)
                    setEditing({
                      slug: s.slug, name: s.name, kind: s.kind, choices: s.choices,
                      template: s.template ?? (s.kind === "code" ? STARTER_CODE : STARTER_TEMPLATE),
                      threshold: s.threshold,
                    })
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
                    setEditing({ name: "", template: STARTER_TEMPLATE, kind: "judge", choices: null, threshold: 0.5 })
                  }}
                  onEdit={(s) => {
                    setEditingPrompt(null)
                    setEditing({
                      slug: s.slug, name: s.name, kind: s.kind, choices: s.choices,
                      template: s.template ?? (s.kind === "code" ? STARTER_CODE : STARTER_TEMPLATE),
                      threshold: s.threshold,
                    })
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

// ── Task: what is being evaluated ───────────────────────────────────────────

/**
 * Chooses between the two questions a run can answer.
 *
 * Off (the default): grade the output every example already carries — the right
 * question for a dataset of real production traces.
 *
 * On: run this prompt on this model against every example and grade the fresh
 * output — the question you ask before shipping a prompt or model change.
 */
function TaskSection({
  on,
  onToggle,
  source,
  onSourceChange,
  prompts,
  promptsError,
  promptId,
  onPromptChange,
  template,
  onTemplateChange,
  model,
  onModelChange,
  modelOptions,
  inheritedModel,
  exampleCount,
  trials,
  onTrialsChange,
  disabled,
}: {
  on: boolean
  onToggle: (on: boolean) => void
  source: "prompt" | "inline"
  onSourceChange: (s: "prompt" | "inline") => void
  prompts: SavedPromptRef[]
  promptsError: string | null
  promptId: string
  onPromptChange: (id: string) => void
  template: string
  onTemplateChange: (t: string) => void
  model: string
  onModelChange: (m: string) => void
  modelOptions: { value: string; label: string }[]
  inheritedModel: string | null
  exampleCount: number
  trials: number
  onTrialsChange: (n: number) => void
  disabled: boolean
}) {
  const chosen = prompts.find((p) => p.prompt_id === promptId)
  const activeTemplate = source === "prompt" ? chosen?.template ?? "" : template
  // How many examples the run will actually reach, given the generation ceiling.
  const gradedExamples = Math.min(
    exampleCount,
    Math.floor(MAX_TASK_GENERATIONS / Math.max(1, trials)),
  )

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground">What to evaluate</p>

      <div className="grid grid-cols-2 gap-2">
        {([
          {
            value: false,
            icon: Database02Icon,
            title: "Recorded output",
            desc: "Grade what each example already holds",
          },
          {
            value: true,
            icon: PlayIcon,
            title: "Run a prompt",
            desc: "Generate fresh output, then grade it",
          },
        ]).map((opt) => {
          const isSel = on === opt.value
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onToggle(opt.value)}
              disabled={disabled}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors disabled:opacity-50",
                isSel
                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                  : "border-border/60 hover:bg-muted/40",
              )}
            >
              <HugeiconsIcon
                icon={opt.icon}
                size={16}
                className={isSel ? "text-primary" : "text-muted-foreground"}
              />
              <p className={cn("mt-1.5 text-sm font-medium", isSel ? "text-primary" : "text-foreground")}>
                {opt.title}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{opt.desc}</p>
            </button>
          )
        })}
      </div>

      {!on ? null : (
        <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 px-3 py-3">
          <div className="flex gap-1.5">
            {([
              { v: "prompt" as const, label: "Saved prompt" },
              { v: "inline" as const, label: "Write one" },
            ]).map((t) => (
              <button
                key={t.v}
                type="button"
                onClick={() => onSourceChange(t.v)}
                disabled={disabled}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50",
                  source === t.v
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {source === "prompt" ? (
            <div className="space-y-1.5">
              <SearchSelect
                value={promptId}
                onChange={onPromptChange}
                options={prompts.map((p) => ({
                  value: p.prompt_id,
                  label: `${p.name} · v${p.version}`,
                }))}
                placeholder={prompts.length ? "Choose a prompt" : "No saved prompts"}
                emptyText="No prompts saved yet."
                disabled={disabled || prompts.length === 0}
              />
              {promptsError ? (
                <p className="text-[11px] text-destructive">{promptsError}</p>
              ) : prompts.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  Save a prompt on the Prompts page to run it here, or write one below.
                </p>
              ) : chosen ? (
                <>
                  <pre className="max-h-28 overflow-auto rounded-md border border-border/60 bg-background px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
                    {chosen.template}
                  </pre>
                  <p className="text-[11px] text-muted-foreground">
                    Pinned to v{chosen.version}, so this run stays reproducible after
                    the prompt is edited.
                  </p>
                </>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1.5">
              <PromptEditor
                value={template}
                onChange={onTemplateChange}
                placeholder="Answer the customer: {{input}}"
                className="min-h-[7rem]"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-foreground">Model</p>
            <SearchSelect
              value={model}
              onChange={onModelChange}
              options={modelOptions}
              placeholder={inheritedModel ? `${inheritedModel} (from prompt)` : "Choose a model"}
              clearLabel={inheritedModel ? `${inheritedModel} (from prompt)` : undefined}
              disabled={disabled}
            />
            <p className="text-[11px] text-muted-foreground">
              Runs on your own provider key — this is your product being tested, not
              our grading, so a platform key is never used for it.
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-foreground">Trials per example</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {[1, 2, 3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onTrialsChange(n)}
                  disabled={disabled}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50",
                    trials === n
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/60 text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {n}×
                </button>
              ))}
              {trials > 1 ? (
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {(gradedExamples * trials).toLocaleString()} generations
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {trials === 1
                ? "One shot per example. Enough to compare prompts, not enough to tell a real regression from a noisy model."
                : `Runs each example ${trials} times and reports the average with its spread — so a score that swings between identical runs shows up as noise rather than as a result. Costs ${trials}× as much.`}
            </p>
            {/* One launch is capped at MAX_TASK_GENERATIONS provider calls, and
                trials count against it. Said here rather than discovered from a
                run that quietly covered a fifth of the dataset. */}
            {gradedExamples < exampleCount ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                A run is capped at {MAX_TASK_GENERATIONS.toLocaleString()} generations, so this grades
                the first {gradedExamples.toLocaleString()} of {exampleCount.toLocaleString()} examples
                {trials > 1 ? ` at ${trials}× each` : ""}.
              </p>
            ) : null}
          </div>

          <TaskVariableHint template={activeTemplate} exampleCount={exampleCount} />
        </div>
      )}
    </div>
  )
}

/**
 * Names the variables a task template can use, and — more usefully — warns when
 * a template references none of them, because that sends the identical prompt
 * for every row and produces a run whose scores mean nothing.
 */
function TaskVariableHint({
  template,
  exampleCount,
}: {
  template: string
  exampleCount: number
}) {
  const used = TASK_VARS.filter((v) => hasPlaceholder(template, v))
  const referencesAnything = /\{\{\s*\w+\s*\}\}/.test(template)

  return (
    <div className="space-y-1.5 border-t border-border/60 pt-2.5">
      <p className="text-[11px] text-muted-foreground">
        Variables:{" "}
        {TASK_VARS.map((v) => (
          <code
            key={v}
            className={cn(
              "mr-1 rounded px-1 py-0.5 font-mono text-[10px]",
              used.includes(v)
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {`{{${v}}}`}
          </code>
        ))}
        plus any column your examples carry in metadata.
      </p>
      {!referencesAnything && template.trim() ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          This template uses no variables, so each example&apos;s input is appended
          to it. Add <code className="font-mono">{"{{input}}"}</code> to control
          where it goes.
        </p>
      ) : null}
      <p className="text-[11px] text-muted-foreground">
        {exampleCount} generation{exampleCount === 1 ? "" : "s"} before any grading
        begins.
      </p>
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
  const isCode = draft.kind === "code"
  const hasAnswer = hasPlaceholder(draft.template, "answer")

  /** Switching kind swaps in that kind's starter, but never discards work the
   *  author has already done to the body. */
  function setKind(kind: ScorerKind) {
    if (kind === draft.kind) return
    const untouched =
      !draft.template.trim() ||
      draft.template === STARTER_TEMPLATE ||
      draft.template === STARTER_CODE
    onChange({
      ...draft,
      kind,
      template: untouched
        ? kind === "code" ? STARTER_CODE : STARTER_TEMPLATE
        : draft.template,
    })
  }

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

      {/* Kind. Only offered when creating: changing it on a saved scorer would
          silently re-grade every dataset already referencing that slug. */}
      {draft.slug ? null : (
        <div className="grid grid-cols-2 gap-2">
          {([
            {
              kind: "judge" as const,
              title: "LLM judge",
              desc: "Ask a model. For subjective calls like tone or helpfulness.",
            },
            {
              kind: "code" as const,
              title: "Code",
              desc: "Run an expression. Exact, instant, free — and never varies.",
            },
          ]).map((opt) => {
            const isSel = draft.kind === opt.kind
            return (
              <button
                key={opt.kind}
                type="button"
                onClick={() => setKind(opt.kind)}
                disabled={disabled}
                className={cn(
                  "rounded-lg border p-2.5 text-left transition-colors disabled:opacity-50",
                  isSel
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/60 hover:bg-muted/40",
                )}
              >
                <p className={cn("text-xs font-medium", isSel ? "text-primary" : "text-foreground")}>
                  {opt.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {opt.desc}
                </p>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <label className="mb-1 text-[11px] text-muted-foreground">
          {isCode ? "Expression" : "Prompt"}
        </label>
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border/60">
          <PromptEditor
            value={draft.template}
            onChange={(v) => onChange({ ...draft, template: v })}
            placeholder={isCode ? STARTER_CODE : STARTER_TEMPLATE}
            varSyntax={isCode ? "none" : "both"}
          />
        </div>
      </div>

      {isCode ? (
        <CodeScorerHelp source={draft.template} disabled={disabled} />
      ) : (
        <>
          <ChoiceEditor
            choices={draft.choices}
            onChange={(choices) => onChange({ ...draft, choices })}
            disabled={disabled}
          />
          {!hasAnswer ? (
            <p className="text-[11px] text-destructive">
              The prompt must reference <span className="font-mono">{"{{answer}}"}</span> (the output being graded).
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Placeholders: <span className="font-mono">{"{{answer}}"}</span>,{" "}
              <span className="font-mono">{"{{question}}"}</span>,{" "}
              <span className="font-mono">{"{{context}}"}</span>.
              {draft.choices ? null : (
                <>
                  {" "}Return <span className="font-mono">{'{"score", "reason"}'}</span>.
                </>
              )}
            </p>
          )}
        </>
      )}
    </div>
  )
}

/**
 * The options a judge may pick from, and what each is worth.
 *
 * Off by default: a free 0–1 score is what judges have always returned, and
 * switching every existing scorer to a rubric would change what their numbers
 * mean. On, the judge is offered exactly these labels and the score is read from
 * the table — so it stops varying between runs.
 */
function ChoiceEditor({
  choices,
  onChange,
  disabled,
}: {
  choices: ScorerChoice[] | null
  onChange: (choices: ScorerChoice[] | null) => void
  disabled: boolean
}) {
  const on = choices !== null
  const labels = (choices ?? []).map((c) => c.label.trim().toLowerCase())
  const duplicate = labels.some((l, i) => l && labels.indexOf(l) !== i)
  const blank = (choices ?? []).some((c) => !c.label.trim())

  function update(index: number, patch: Partial<ScorerChoice>) {
    onChange((choices ?? []).map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={on}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked ? STARTER_CHOICES : null)}
          className="mt-0.5 size-3 accent-primary"
        />
        <span className="min-w-0">
          <span className="text-[11px] font-medium text-foreground">
            Pick from fixed options
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
            The judge chooses a label and the score comes from your table, instead
            of the model inventing a number. Steadier between runs.
          </span>
        </span>
      </label>

      {!on ? null : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_4.5rem_1.5rem] gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/60">
            <span>Option</span>
            <span>Score</span>
            <span />
          </div>
          {(choices ?? []).map((choice, i) => (
            <div key={i} className="grid grid-cols-[1fr_4.5rem_1.5rem] items-center gap-1.5">
              <input
                value={choice.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="e.g. Y"
                disabled={disabled}
                className="h-7 w-full rounded border border-border/60 bg-background px-2 text-[11px] outline-none focus:border-primary/50"
              />
              <input
                type="number"
                min={0}
                max={1}
                step={0.25}
                value={choice.score}
                onChange={(e) => update(i, { score: Number(e.target.value) })}
                disabled={disabled}
                className="h-7 w-full rounded border border-border/60 bg-background px-2 text-[11px] outline-none focus:border-primary/50"
              />
              <button
                type="button"
                aria-label={`Remove option ${choice.label || i + 1}`}
                disabled={disabled || (choices ?? []).length <= 2}
                onClick={() => onChange((choices ?? []).filter((_, j) => j !== i))}
                title={
                  (choices ?? []).length <= 2
                    ? "A choice set needs at least two options"
                    : undefined
                }
                className="inline-flex size-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted hover:text-destructive disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground/60"
              >
                <HugeiconsIcon icon={Delete02Icon} size={12} />
              </button>
            </div>
          ))}

          <button
            type="button"
            disabled={disabled || (choices ?? []).length >= 12}
            onClick={() => onChange([...(choices ?? []), { label: "", score: 0.5 }])}
            className="text-[11px] text-primary transition-colors hover:underline disabled:opacity-40 disabled:no-underline"
          >
            + Add option
          </button>

          {blank ? (
            <p className="text-[11px] text-destructive">Every option needs a label.</p>
          ) : duplicate ? (
            <p className="text-[11px] text-destructive">
              Two options share a label — the judge could not tell them apart.
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}

/**
 * Reference for the scorer language, plus a way to try it on one example.
 *
 * Authoring a scorer blind and discovering it was wrong across a whole run is
 * the slow way to get it right, so the check happens here in a second.
 */
function CodeScorerHelp({ source, disabled }: { source: string; disabled: boolean }) {
  const [sample, setSample] = useState("")
  const [expected, setExpected] = useState("")
  const [result, setResult] = useState<
    { ok: true; score: number; reason: string } | { ok: false; error: string } | null
  >(null)
  const [testing, setTesting] = useState(false)

  async function test() {
    if (!source.trim() || testing) return
    setTesting(true)
    try {
      setResult(
        await authFetch<
          { ok: true; score: number; reason: string } | { ok: false; error: string }
        >("/api/v1/prompts/code-scorer/test", {
          method: "POST",
          body: { source, output: sample, expected },
        }),
      )
    } catch (err) {
      setResult({ ok: false, error: err instanceof ApiError ? err.detail : "Test failed" })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
      <p className="text-[11px] text-muted-foreground">
        Reads{" "}
        {["output", "expected", "input", "metadata"].map((v) => (
          <code key={v} className="mr-1 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
            {v}
          </code>
        ))}
        — return a number 0–1, or true/false.
      </p>
      <p className="text-[11px] text-muted-foreground">
        Helpers:{" "}
        <span className="font-mono text-[10px]">
          contains · matches · is_json · json_parse · similarity · word_count · clamp
        </span>
      </p>

      <div className="grid gap-1.5 sm:grid-cols-2">
        <input
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          placeholder="Try an output…"
          disabled={disabled}
          className="h-7 w-full rounded border border-border/60 bg-background px-2 text-[11px] outline-none focus:border-primary/50"
        />
        <input
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          placeholder="…and an expected value (optional)"
          disabled={disabled}
          className="h-7 w-full rounded border border-border/60 bg-background px-2 text-[11px] outline-none focus:border-primary/50"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-[11px]"
          onClick={test}
          disabled={disabled || testing || !source.trim()}
        >
          {testing ? (
            <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
          ) : (
            <HugeiconsIcon icon={PlayIcon} size={12} />
          )}
          Test
        </Button>
        {result === null ? null : result.ok ? (
          <span className="text-[11px]">
            <span className="text-muted-foreground">scored </span>
            <b className="font-mono text-emerald-600 dark:text-emerald-400">
              {result.score.toFixed(2)}
            </b>
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[11px] text-destructive" title={result.error}>
            {result.error}
          </span>
        )}
      </div>
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
            // A code scorer is free and instant where a judge costs a model
            // call per example, so which one a scorer is belongs on the label.
            options={scorers.map((s) => ({
              value: s.slug,
              label: s.kind === "code" ? `${s.name} · code` : s.name,
            }))}
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
