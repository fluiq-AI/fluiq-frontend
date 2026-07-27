"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AiSecurity02Icon,
  Alert02Icon,
  Cancel01Icon,
  Loading03Icon,
  PlayIcon,
  RoboticIcon,
  Tick02Icon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { useRealtimeStream } from "@/lib/useRealtimeStream"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/Pagination"
import type { DatasetKind } from "./NewDatasetDialog"
import {
  RunEvaluationDrawer,
  type EvalMode,
  type EvalLaunchConfig,
} from "./RunEvaluationDrawer"

// ── Types ─────────────────────────────────────────────────────────────────────

interface RunSummary {
  kind?: string
  total?: number
  completed?: number
  avg_run_score?: number | null
  avg_score?: number | null
  pass_rate?: number | null
  layers?: Record<string, number | null>
  metrics?: Record<string, number | null>
  risk_levels?: Record<string, number>
  flagged?: number
  blocked?: number
  threats?: Record<string, number>
}

type RunKind = "agentic" | "security" | "metrics"

interface DatasetRun {
  run_id: string
  kind: RunKind
  /** Judge model ("provider:model") this run graded with, when one was chosen. */
  model?: string | null
  status: "running" | "complete" | "failed"
  total: number
  item_count: number
  summary: RunSummary
  created_at: string | null
  finished_at?: string | null
  /** Groups the runs launched together by one multi-model comparison. */
  batch_id?: string | null
}

interface ReportItem {
  example_id: string
  trace_id: string
  input?: string | null
  expected_output?: string | null
  done: boolean
  result?: { metric: string; score: number | null }[] | Record<string, unknown> | null
}

/** Per-example security verdict, as returned on a security run's report items. */
interface SecurityResult {
  risk_level?: string | null
  risk_score?: number | null
  should_block?: number
  [flag: string]: unknown
}

// Mirrors the API's _THREAT_KEYS, in the same order.
const THREAT_KEYS = [
  "injection", "jailbreak", "skeleton_key", "secrets", "indirect_injection",
  "rag_poisoning", "tool_exfiltration", "tool_policy_violation",
  "cross_agent_injection", "image_injection",
] as const

const RISK_RANK: Record<string, number> = { high: 3, medium: 2, low: 1, clean: 0 }

/** Actual judge work a run consumed. Counts, not money. */
interface RunUsage {
  judge_calls: number
  input_tokens: number
  output_tokens: number
}

interface RunReport {
  run: DatasetRun
  summary: RunSummary
  items: ReportItem[]
  usage?: RunUsage
}

interface CompareMetric {
  metric: string
  avg: number
  baseline_avg: number
  delta: number
}

interface CompareExample {
  example_id: string
  input: string
  score: number | null
  baseline_score: number | null
  delta: number | null
  status: "regressed" | "improved" | "unchanged" | "added" | "pending"
}

interface CompareReport {
  run: DatasetRun
  baseline: DatasetRun
  metrics: CompareMetric[]
  examples: CompareExample[]
  summary: { regressed: number; improved: number; unchanged: number; added: number; missing: number }
}

// ── Multi-run (model-vs-model) comparison ────────────────────────────────────

interface MultiCompareReport {
  runs: DatasetRun[]
  overall: Record<string, number | null>
  completed: Record<string, number>
  metrics: { metric: string; scores: Record<string, number | null> }[]
  examples: {
    example_id: string
    input: string
    scores: Record<string, number | null>
    spread: number | null
  }[]
  /** Metric the per-example table is drilled into; null means overall score. */
  metric?: string | null
  metric_options?: string[]
}

/** Short column label for a run: its model, else the run kind + time. */
function runLabel(r: DatasetRun): string {
  if (r.model) return r.model.split(":")[1] ?? r.model
  return `${r.kind} · ${fmtDate(r.created_at)}`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(v: number | null | undefined): string {
  return typeof v === "number" ? `${Math.round(v * 100)}%` : "—"
}

function scoreColor(v: number | null | undefined): string {
  if (typeof v !== "number") return "text-muted-foreground"
  if (v >= 0.8) return "text-emerald-600 dark:text-emerald-400"
  if (v >= 0.5) return "text-amber-600 dark:text-amber-400"
  return "text-destructive"
}

const RISK_COLOR: Record<string, string> = {
  clean: "text-emerald-600 dark:text-emerald-400",
  low: "text-amber-600 dark:text-amber-400",
  medium: "text-orange-600 dark:text-orange-400",
  high: "text-destructive",
}

/** Parse an API timestamp, treating a missing zone as UTC (what the API sends). */
function parseIso(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z")
  return Number.isNaN(d.getTime()) ? null : d
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  const d = parseIso(iso)
  return d ? d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : iso
}

/** How long a run took, or null while it is still in flight. */
function fmtDuration(startIso: string | null, endIso: string | null | undefined): string | null {
  const start = parseIso(startIso)
  const end = parseIso(endIso)
  if (!start || !end) return null
  const secs = Math.round((end.getTime() - start.getTime()) / 1000)
  if (secs < 0) return null
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ${secs % 60}s`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

/** Examples scoring below this are treated as failures worth reading first. */
const FAIL_THRESHOLD = 0.7

/** One-line summary of a finished run, used for the completion toast. */
function completionMessage(report: RunReport): string {
  const { run, summary } = report
  if (run.kind === "security") {
    const flagged = summary.flagged ?? 0
    const blocked = summary.blocked ?? 0
    return flagged === 0
      ? "Security scan complete. Nothing flagged."
      : `Security scan complete. ${flagged} flagged, ${blocked} would block.`
  }
  const score = run.kind === "agentic" ? summary.avg_run_score : summary.avg_score
  const parts = [`${pct(score)} avg`]
  if (run.kind === "agentic" && typeof summary.pass_rate === "number") {
    parts.push(`${pct(summary.pass_rate)} pass`)
  }
  const failing = report.items.filter((it) => {
    if (!Array.isArray(it.result)) return false
    const scores = it.result.map((r) => r.score).filter((v): v is number => typeof v === "number")
    if (scores.length === 0) return false
    return scores.reduce((a, b) => a + b, 0) / scores.length < FAIL_THRESHOLD
  }).length
  if (failing > 0) parts.push(`${failing} below ${Math.round(FAIL_THRESHOLD * 100)}%`)
  const label = run.kind === "agentic" ? "Agentic evaluation" : "Evaluation"
  return `${label} complete. ${parts.join(", ")}.`
}

// ── Component ───────────────────────────────────────────────────────────────────

const RUNS_PAGE_SIZE = 10

export function DatasetRuns({
  dataset,
  tab,
  onTabChange,
  exampleCount,
}: {
  dataset: { dataset_id: string; example_count: number; kind?: DatasetKind }
  tab: "runs" | "dataset"
  onTabChange: (tab: "runs" | "dataset") => void
  exampleCount: number
}) {
  // Single-prompt datasets have no trajectory, so agentic eval doesn't apply.
  // The evaluation config (evaluator, judge/jury, metrics) lives in the
  // Run-evaluation drawer.
  const isSingle = dataset.kind === "single"
  const [runs, setRuns] = useState<DatasetRun[]>([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState<RunKind | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [showEvalDrawer, setShowEvalDrawer] = useState(false)
  const [report, setReport] = useState<RunReport | null>(null)
  const [compare, setCompare] = useState<CompareReport | null>(null)
  const [comparing, setComparing] = useState(false)
  // Runs ticked for a side-by-side (model-vs-model) comparison.
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set())
  const [multiCompare, setMultiCompare] = useState<MultiCompareReport | null>(null)
  const [multiLoading, setMultiLoading] = useState(false)
  // Runs list paging, and whether the report drawer is showing.
  const [runsPage, setRunsPage] = useState(0)
  const [runsHasMore, setRunsHasMore] = useState(false)
  const [showReport, setShowReport] = useState(false)
  // A2: comparison against the previous comparable run, fetched automatically
  // so a finished run answers "did it get better or worse" without being asked.
  const [autoDelta, setAutoDelta] = useState<CompareReport | null>(null)
  // Coalesce a burst of per-example SSE completions into a single report
  // refresh. Replaces the old fixed-interval poll — nothing here is on a timer
  // except this short debounce, which only ever fires in reaction to an event.
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // One-shot safety net (armed once per run selection, not a recurring poll).
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Trace ids of the running run's items; an SSE event for any of them means
  // fresh results have landed and the report should be refreshed.
  const pendingTraceIds = useRef<Set<string>>(new Set())
  // Last seen status per run, and runs already announced, so the completion
  // toast fires exactly once on the running → complete edge.
  const lastStatus = useRef<Record<string, string>>({})
  const notifiedRuns = useRef<Set<string>>(new Set())
  // Runs whose auto-delta has been attempted, so it is fetched once per run.
  const autoComparedRuns = useRef<Set<string>>(new Set())
  // Run ids behind the open comparison, so drilling into a metric refetches
  // the same set rather than depending on the checkbox state.
  const compareIds = useRef<string[]>([])
  // Debounced quiet refetch of the runs list while a run is still in flight —
  // the list endpoint finalizes any run whose results have landed, so this is
  // what flips an unopened run from "running" to "complete" without polling.
  const runsRefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runsSettleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadRuns = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true)
    try {
      const data = await authFetch<{ runs: DatasetRun[] }>(
        `/api/v1/datasets/${dataset.dataset_id}/runs?limit=${RUNS_PAGE_SIZE}&offset=${runsPage * RUNS_PAGE_SIZE}`,
      )
      setRuns(data.runs)
      setRunsHasMore(data.runs.length >= RUNS_PAGE_SIZE)
    } catch (err) {
      if (!opts?.quiet) setError(err instanceof ApiError ? err.detail : "Failed to load runs")
    } finally {
      if (!opts?.quiet) setLoading(false)
    }
  }, [dataset.dataset_id, runsPage])

  // Reset when switching datasets.
  useEffect(() => {
    setSelectedRunId(null)
    setReport(null)
    setError(null)
    setShowReport(false)
  }, [dataset.dataset_id])

  useEffect(() => { setRunsPage(0) }, [dataset.dataset_id])

  useEffect(() => { loadRuns() }, [loadRuns])

  const loadReport = useCallback(async (runId: string) => {
    try {
      const data = await authFetch<RunReport>(`/api/v1/datasets/runs/${runId}`)
      setReport(data)
      setRuns((prev) => prev.map((r) => (r.run_id === runId ? data.run : r)))

      // Announce the moment a run finishes. The report updates live over SSE, so
      // without this the completion is easy to miss when looking elsewhere. Only
      // fires on a real running → complete transition, and only once per run.
      const previous = lastStatus.current[runId]
      lastStatus.current[runId] = data.run.status
      if (
        previous === "running" &&
        data.run.status === "complete" &&
        !notifiedRuns.current.has(runId)
      ) {
        notifiedRuns.current.add(runId)
        toast.success(completionMessage(data))
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load report")
    }
  }, [])

  // The selected run, but only while it's still in flight. `report` is the same
  // object across renders that don't refetch, so `runningRun` stays a stable
  // truthy value — the SSE stream below is opened once and not re-subscribed on
  // every event.
  const runningRun =
    selectedRunId && report && report.run.status === "running" ? report : null
  // Any run on the list still in flight — used to keep the stream open and
  // refresh the list even for runs the user hasn't opened.
  const anyRunning = runs.some((r) => r.status === "running")

  // Debounced quiet list refetch. On a burst of SSE events only one fetch
  // fires; the server finalizes any now-complete run during that fetch.
  const scheduleRunsRefetch = useCallback(() => {
    if (runsRefetchTimer.current) clearTimeout(runsRefetchTimer.current)
    runsRefetchTimer.current = setTimeout(() => loadRuns({ quiet: true }), 1000)
  }, [loadRuns])

  // Keep the pending-trace set in sync with the running run's items.
  useEffect(() => {
    pendingTraceIds.current = new Set(
      runningRun ? runningRun.items.map((it) => it.trace_id) : [],
    )
  }, [runningRun])

  // Debounced, event-driven refresh of the selected run's report.
  const scheduleRefetch = useCallback(() => {
    if (!selectedRunId) return
    if (refetchTimer.current) clearTimeout(refetchTimer.current)
    refetchTimer.current = setTimeout(() => loadReport(selectedRunId), 600)
  }, [selectedRunId, loadReport])

  // Fire a single delayed report re-check after a run is launched or selected.
  // A fast run can finish before the SSE stream's handshake completes, so its
  // `trace.enriched` events are never seen — this one-shot fetch closes that
  // race. It is armed once per selection (not re-armed on events), so it is a
  // safety net, not a poll.
  const armSettle = useCallback(
    (runId: string) => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
      settleTimer.current = setTimeout(() => loadReport(runId), 2500)
    },
    [loadReport],
  )

  // One-shot list refetch after a launch, covering a run that finishes before
  // the stream's handshake completes (fast security scans especially).
  const armRunsSettle = useCallback(() => {
    if (runsSettleTimer.current) clearTimeout(runsSettleTimer.current)
    runsSettleTimer.current = setTimeout(() => loadRuns({ quiet: true }), 3000)
  }, [loadRuns])

  useEffect(
    () => () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current)
      if (settleTimer.current) clearTimeout(settleTimer.current)
      if (runsRefetchTimer.current) clearTimeout(runsRefetchTimer.current)
      if (runsSettleTimer.current) clearTimeout(runsSettleTimer.current)
    },
    [],
  )

  // Subscribe to the org trace stream only while a run is in flight. Each
  // completed example — agentic/metrics eval or security scan — publishes a
  // `trace.enriched` event carrying its trace_id (evaluator/security workers →
  // KAFKA_TRACE_PERSISTED_TOPIC → SSE). When one matches a pending item we
  // refresh the report. No timers, no polling: the connection closes the moment
  // the run finalizes (status flips off "running" → path becomes null).
  useRealtimeStream({
    path: runningRun || anyRunning ? "/api/v1/traces/stream" : null,
    events: ["trace.enriched", "trace"],
    onEvent: (data) => {
      if (!data || typeof data !== "object") return
      const d = data as { trace_id?: string; root_trace_id?: string }
      const pending = pendingTraceIds.current
      if (
        (d.trace_id && pending.has(d.trace_id)) ||
        (d.root_trace_id && pending.has(d.root_trace_id))
      ) {
        scheduleRefetch()
      }
      // The list rows don't carry item trace ids, so any completion event while
      // a run is in flight triggers a debounced list refetch — which finalizes
      // and updates a run the user never opened.
      if (anyRunning) scheduleRunsRefetch()
    },
    // A dropped-then-reopened stream may have missed the final event; resync
    // once on reconnect so a run can't get stuck showing "running".
    onReopen: () => {
      if (selectedRunId) loadReport(selectedRunId)
      if (anyRunning) loadRuns({ quiet: true })
    },
  })

  function buildRunBody(kind: RunKind, cfg?: EvalLaunchConfig): Record<string, unknown> {
    const body: Record<string, unknown> = { kind }
    if (kind === "metrics" && cfg?.metrics) body.metrics = cfg.metrics
    // Custom scorers apply to both evaluators, not just metrics.
    if (kind !== "security" && cfg?.custom_judges) body.custom_judges = cfg.custom_judges
    if (cfg?.batch_id) body.batch_id = cfg.batch_id
    // Security scans are regex/NER only, so no judge is involved.
    if (kind !== "security" && cfg) {
      if (cfg.judge) body.judge = cfg.judge
      if (kind === "agentic") {
        if (cfg.depth) body.depth = cfg.depth
        if (cfg.depth === "deep" && cfg.jury && cfg.jury.length > 0) {
          body.jury = cfg.jury
        }
      }
    }
    return body
  }

  async function postRun(kind: RunKind, cfg?: EvalLaunchConfig): Promise<DatasetRun> {
    return authFetch<DatasetRun>(`/api/v1/datasets/${dataset.dataset_id}/runs`, {
      method: "POST",
      body: buildRunBody(kind, cfg),
    })
  }

  async function launch(kind: RunKind, cfg?: EvalLaunchConfig) {
    setLaunching(kind)
    setError(null)
    try {
      const run = await postRun(kind, cfg)
      setRuns((prev) => [run, ...prev])
      setSelectedRunId(run.run_id)
      setReport(null)
      setCompare(null)
      loadReport(run.run_id)
      armSettle(run.run_id)
      armRunsSettle()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to start run")
    } finally {
      setLaunching(null)
    }
  }

  // The drawer collects the eval config, then hands it back here to launch.
  // Multiple models launch one run each (sequentially, so the runs list keeps a
  // stable order) — that's what makes them comparable side by side afterwards.
  async function launchEval(mode: EvalMode, cfg: EvalLaunchConfig) {
    setShowEvalDrawer(false)
    const models = cfg.models ?? []
    if (models.length <= 1) {
      await launch(mode, { ...cfg, judge: models[0] || cfg.judge })
      return
    }
    setLaunching(mode)
    setError(null)
    try {
      // One batch id across the group, so the UI can tell when every model has
      // finished and offer the comparison without manual ticking.
      const batchId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const created: DatasetRun[] = []
      for (const model of models) {
        const run = await postRun(mode, { ...cfg, judge: model, batch_id: batchId })
        created.push(run)
      }
      setRuns((prev) => [...created.slice().reverse(), ...prev])
      const first = created[0]
      setSelectedRunId(first.run_id)
      setReport(null)
      setCompare(null)
      loadReport(first.run_id)
      armSettle(first.run_id)
      armRunsSettle()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to start runs")
    } finally {
      setLaunching(null)
    }
  }

  function selectRun(runId: string) {
    setSelectedRunId(runId)
    setReport(null)
    setCompare(null)
    setAutoDelta(null)
    setShowReport(true)
    loadReport(runId)
    // Only the race-prone case (a run still in flight) needs the settle re-check.
    if (runs.find((r) => r.run_id === runId)?.status === "running") {
      armSettle(runId)
    }
  }

  function toggleCompare(runId: string) {
    setCompareSet((prev) => {
      const next = new Set(prev)
      if (next.has(runId)) next.delete(runId)
      else next.add(runId)
      return next
    })
    setMultiCompare(null)
  }

  // A2: once a run is complete, compare it to the most recent earlier run that
  // is genuinely comparable (same dataset, kind and model). Scores alone don't
  // say much; whether they moved does. Fetched once per run.
  useEffect(() => {
    if (!report || report.run.status !== "complete") return
    if (report.run.kind === "security") return
    const runId = report.run.run_id
    if (autoComparedRuns.current.has(runId)) return

    const started = parseIso(report.run.created_at)?.getTime() ?? 0
    const baseline = runs
      .filter(
        (r) =>
          r.run_id !== runId &&
          r.kind === report.run.kind &&
          (r.model ?? null) === (report.run.model ?? null) &&
          r.status === "complete" &&
          (parseIso(r.created_at)?.getTime() ?? 0) < started,
      )
      .sort(
        (a, b) =>
          (parseIso(b.created_at)?.getTime() ?? 0) - (parseIso(a.created_at)?.getTime() ?? 0),
      )[0]
    if (!baseline) return

    autoComparedRuns.current.add(runId)
    authFetch<CompareReport>(
      `/api/v1/datasets/runs/${runId}/compare?against=${baseline.run_id}`,
    )
      .then(setAutoDelta)
      .catch(() => {
        // A missing baseline comparison is not worth surfacing as an error.
      })
  }, [report, runs])

  async function loadMultiCompare(explicitIds?: string[], metric?: string | null) {
    const ids =
      explicitIds ?? runs.filter((r) => compareSet.has(r.run_id)).map((r) => r.run_id)
    if (ids.length < 2) return
    setMultiLoading(true)
    setError(null)
    try {
      compareIds.current = ids
      const qs = metric ? `&metric=${encodeURIComponent(metric)}` : ""
      const data = await authFetch<MultiCompareReport>(
        `/api/v1/datasets/run-comparison?runs=${ids.join(",")}${qs}`,
      )
      setMultiCompare(data)
      setCompare(null)
      setShowReport(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to compare runs")
    } finally {
      setMultiLoading(false)
    }
  }

  async function loadCompare(runId: string, baselineId: string) {
    setComparing(true)
    setError(null)
    try {
      const data = await authFetch<CompareReport>(
        `/api/v1/datasets/runs/${runId}/compare?against=${baselineId}`,
      )
      setCompare(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to compare runs")
    } finally {
      setComparing(false)
    }
  }

  const noExamples = dataset.example_count === 0

  // A6: the sibling runs of the selected run's multi-model launch. Once every
  // one has finished, offer the comparison directly instead of asking the user
  // to tick each run.
  const batchId = report?.run.batch_id ?? null
  const batchRuns = batchId ? runs.filter((r) => r.batch_id === batchId) : []
  const batchReady =
    batchRuns.length >= 2 &&
    batchRuns.every((r) => r.status === "complete") &&
    !multiCompare

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={noExamples || launching !== null}
          onClick={() => setShowEvalDrawer(true)}
        >
          {launching === "agentic" || launching === "metrics" ? (
            <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
          ) : (
            <HugeiconsIcon icon={PlayIcon} size={13} />
          )}
          Run Evaluation
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={noExamples || launching !== null}
          onClick={() => launch("security")}
        >
          {launching === "security" ? (
            <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
          ) : (
            <HugeiconsIcon icon={AiSecurity02Icon} size={13} />
          )}
          Run Security
        </Button>
        {noExamples ? (
          <span className="text-[11px] text-muted-foreground">Add examples to run a job.</span>
        ) : null}
      </div>

      {/* Runs / Dataset tabs, under the batch action buttons. */}
      <div className="flex items-center gap-1 border-b border-border/60">
        {([
          { id: "runs" as const, label: "Runs" },
          { id: "dataset" as const, label: `Dataset (${exampleCount})` },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-1.5 text-xs transition-colors",
              tab === t.id
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <RunEvaluationDrawer
        open={showEvalDrawer}
        onClose={() => setShowEvalDrawer(false)}
        datasetId={dataset.dataset_id}
        exampleCount={dataset.example_count}
        isSingle={isSingle}
        launching={launching}
        onLaunch={launchEval}
      />

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          <HugeiconsIcon icon={Alert02Icon} size={13} />
          {error}
        </div>
      ) : null}

      {tab !== "runs" ? null : loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
          Loading runs…
        </div>
      ) : runs.length === 0 && runsPage === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
          No runs yet. Launch an evaluation or security scan over the whole dataset.
        </p>
      ) : (
        <div>
          {/* Runs list. Selecting one opens its report in the drawer below. */}
          <div className="space-y-1.5">
            {batchReady ? (
              <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5">
                <span className="flex-1 text-[11px] text-foreground">
                  All {batchRuns.length} models finished
                </span>
                <Button
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => {
                    const ids = batchRuns.map((r) => r.run_id)
                    setCompareSet(new Set(ids))
                    loadMultiCompare(ids)
                  }}
                  disabled={multiLoading}
                >
                  {multiLoading ? (
                    <HugeiconsIcon icon={Loading03Icon} size={11} className="animate-spin" />
                  ) : null}
                  Compare results
                </Button>
              </div>
            ) : null}

            {compareSet.size >= 2 ? (
              <div className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5">
                <span className="flex-1 text-[11px] text-foreground">
                  {compareSet.size} runs selected
                </span>
                <Button
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => loadMultiCompare()}
                  disabled={multiLoading}
                >
                  {multiLoading ? (
                    <HugeiconsIcon icon={Loading03Icon} size={11} className="animate-spin" />
                  ) : null}
                  Compare
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => { setCompareSet(new Set()); setMultiCompare(null) }}
                >
                  Clear
                </Button>
              </div>
            ) : null}

            {runs.map((r) => (
              <div
                key={r.run_id}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors",
                  selectedRunId === r.run_id && !multiCompare
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/60 hover:bg-muted/40",
                )}
              >
                <input
                  type="checkbox"
                  checked={compareSet.has(r.run_id)}
                  onChange={() => toggleCompare(r.run_id)}
                  title="Add to comparison"
                  className="size-3 shrink-0 accent-primary"
                />
                <button
                  type="button"
                  onClick={() => { setMultiCompare(null); selectRun(r.run_id) }}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <HugeiconsIcon
                    icon={
                      r.kind === "security"
                        ? AiSecurity02Icon
                        : r.kind === "metrics"
                          ? TestTube01Icon
                          : RoboticIcon
                    }
                    size={13}
                    className="shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium capitalize">{r.kind}</span>
                    {r.model ? (
                      <span className="ml-1 font-mono text-[10px] text-primary/80">
                        {r.model.split(":")[1] ?? r.model}
                      </span>
                    ) : null}
                    <span className="ml-1 text-muted-foreground/60">{fmtDate(r.created_at)}</span>
                  </span>
                </button>
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>

          <Pagination
            page={runsPage}
            hasMore={runsHasMore}
            loading={loading}
            onPrev={() => setRunsPage((p) => Math.max(0, p - 1))}
            onNext={() => setRunsPage((p) => p + 1)}
            className="mt-2"
          />
        </div>
      )}

      {/* Report drawer. The report is dense enough that it reads far better in
          a wide panel than squeezed beside the list. */}
      {showReport ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Run report"
          className="fixed inset-0 z-50 flex"
        >
          <div className="flex-1 bg-black/40" onClick={() => setShowReport(false)} />
          <div className="flex h-full w-full max-w-3xl flex-col border-l border-border/60 bg-background shadow-xl duration-200 animate-in slide-in-from-right-6">
            <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
              <div className="min-w-0">
                <h2 className="font-heading text-base font-semibold">
                  {multiCompare ? "Model comparison" : "Run report"}
                </h2>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {multiCompare
                    ? `${multiCompare.runs.length} runs side by side`
                    : report
                      ? `${report.run.kind} · ${fmtDate(report.run.created_at)}`
                      : "Loading…"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReport(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close report"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {multiCompare ? (
                <MultiCompareView
                  report={multiCompare}
                  loading={multiLoading}
                  onMetricChange={(m) => loadMultiCompare(compareIds.current, m)}
                />
              ) : !report ? (
                <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
                  <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
                  Loading report…
                </div>
              ) : (
                <ReportView
                  report={report}
                  autoDelta={autoDelta}
                  baselines={runs.filter(
                    (r) =>
                      r.run_id !== report.run.run_id &&
                      r.kind === report.run.kind &&
                      r.kind !== "security" &&
                      r.status === "complete",
                  )}
                  compare={compare}
                  comparing={comparing}
                  onCompare={(baselineId) =>
                    baselineId
                      ? loadCompare(report.run.run_id, baselineId)
                      : setCompare(null)
                  }
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "complete"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : status === "failed"
        ? "bg-destructive/15 text-destructive"
        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
  return (
    <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase", cls)}>
      {status === "running" ? "running" : status}
    </span>
  )
}

function ReportView({
  report,
  autoDelta,
  baselines,
  compare,
  comparing,
  onCompare,
}: {
  report: RunReport
  autoDelta: CompareReport | null
  baselines: DatasetRun[]
  compare: CompareReport | null
  comparing: boolean
  onCompare: (baselineId: string) => void
}) {
  const { run, summary } = report

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold capitalize">{run.kind} report</h4>
        <div className="flex items-center gap-2">
          {baselines.length > 0 ? (
            <select
              value={compare?.baseline.run_id ?? ""}
              onChange={(e) => onCompare(e.target.value)}
              className="rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] text-muted-foreground focus-visible:outline-none"
            >
              <option value="">Compare vs…</option>
              {baselines.map((b) => (
                <option key={b.run_id} value={b.run_id}>
                  {fmtDate(b.created_at)}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      {comparing ? (
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
          Comparing runs…
        </div>
      ) : compare ? (
        <CompareView compare={compare} />
      ) : null}

      <VerdictCard report={report} />

      {autoDelta && !compare ? <DeltaStrip compare={autoDelta} /> : null}

      {run.kind === "agentic" ? (
        <div className="space-y-4">
          {summary.layers && Object.keys(summary.layers).length > 0 ? (
            <ScoreRows title="Layers" rows={summary.layers} />
          ) : null}
          {summary.metrics && Object.keys(summary.metrics).length > 0 ? (
            <ScoreRows title="Metrics and custom scorers" rows={summary.metrics} />
          ) : null}
        </div>
      ) : run.kind === "metrics" ? (
        <div className="space-y-4">
          {summary.metrics && Object.keys(summary.metrics).length > 0 ? (
            <ScoreRows title="Metrics" rows={summary.metrics} />
          ) : null}
          <MetricsItemTable items={report.items} />
        </div>
      ) : (
        <div className="space-y-4">
          <RiskDistribution summary={summary} />
          <ThreatCoverage summary={summary} />
          <SecurityItemTable items={report.items} />
        </div>
      )}
    </div>
  )
}

/** Compact count: 1234 → 1.2k, 1234567 → 1.2M. */
function formatCount(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
}

/**
 * How this run moved against the previous comparable one. A score on its own
 * says little; whether it went up or down is the actual answer, so this is
 * fetched automatically rather than waiting for someone to pick a baseline.
 */
function DeltaStrip({ compare }: { compare: CompareReport }) {
  const { summary, metrics, baseline } = compare
  const moved = metrics.filter((m) => Math.abs(m.delta) >= 0.005)

  return (
    <div className="rounded-md border border-border/60 bg-background px-3 py-2">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
          vs previous run · {fmtDate(baseline.created_at)}
        </span>
        {summary.regressed > 0 ? (
          <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
            {summary.regressed} regressed
          </span>
        ) : null}
        {summary.improved > 0 ? (
          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            {summary.improved} improved
          </span>
        ) : null}
        {summary.regressed === 0 && summary.improved === 0 ? (
          <span className="text-[10px] text-muted-foreground">No example moved.</span>
        ) : null}
      </div>
      {moved.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {moved.map((m) => (
            <span key={m.metric} className="font-mono text-[11px] tabular-nums">
              <span className="capitalize text-muted-foreground">
                {m.metric.replace(/_/g, " ")}
              </span>{" "}
              <span
                className={cn(
                  "font-semibold",
                  m.delta > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive",
                )}
              >
                {m.delta > 0 ? "+" : ""}
                {(m.delta * 100).toFixed(1)}pt
              </span>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">Metric averages held steady.</p>
      )}
    </div>
  )
}

/**
 * The verdict for a finished (or in-flight) run: the one number that answers
 * "how did it do", with the run's shape alongside it. Sits above the detail
 * breakdowns, which is why those no longer repeat the headline score.
 */
function VerdictCard({ report }: { report: RunReport }) {
  const { run, summary } = report
  const done = summary.completed ?? 0
  const total = summary.total ?? run.total
  const duration = fmtDuration(run.created_at, run.finished_at)
  const running = run.status === "running"

  const flagged = summary.flagged ?? 0
  const headline =
    run.kind === "security"
      ? {
          label: flagged > 0 ? "Flagged" : "Clean",
          value: String(flagged),
          color:
            flagged > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400",
        }
      : {
          label: "Average score",
          value: pct(run.kind === "agentic" ? summary.avg_run_score : summary.avg_score),
          color: scoreColor(run.kind === "agentic" ? summary.avg_run_score : summary.avg_score),
        }

  const facts: { label: string; value: string; color?: string }[] = []
  if (run.kind === "agentic") {
    facts.push({
      label: "Pass rate",
      value: pct(summary.pass_rate),
      color: scoreColor(summary.pass_rate),
    })
  }
  if (run.kind === "security") {
    facts.push({
      label: "Would block",
      value: String(summary.blocked ?? 0),
      color: (summary.blocked ?? 0) > 0 ? "text-destructive" : undefined,
    })
  }
  facts.push({ label: "Graded", value: `${done}/${total}` })
  if (duration) facts.push({ label: "Took", value: duration })
  // What the run actually consumed, closing the loop with the pre-run estimate.
  const usage = report.usage
  if (usage && usage.judge_calls > 0) {
    facts.push({ label: "Judge calls", value: formatCount(usage.judge_calls) })
    facts.push({
      label: "Judge tokens",
      value: formatCount(usage.input_tokens + usage.output_tokens),
    })
  }
  if (run.model) facts.push({ label: "Model", value: run.model.split(":")[1] ?? run.model })

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md border border-border/60 bg-muted/20 px-4 py-3">
      <div className="min-w-24">
        <p className={cn("font-mono text-3xl font-semibold leading-none tabular-nums", headline.color)}>
          {headline.value}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
          {headline.label}
        </p>
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-2">
        {facts.map((f) => (
          <div key={f.label}>
            <p className={cn("font-mono text-sm font-medium tabular-nums", f.color ?? "text-foreground")}>
              {f.value}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
              {f.label}
            </p>
          </div>
        ))}
      </div>
      {running ? (
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
          still running
        </span>
      ) : null}
    </div>
  )
}

function MetricsItemTable({ items }: { items: ReportItem[] }) {
  const [onlyFailures, setOnlyFailures] = useState(false)

  // Worst first: the failures are the reason the run was launched, so they lead
  // rather than being buried under whatever happened to be graded first.
  const scored = useMemo(() => {
    return items
      .filter((it) => Array.isArray(it.result) && it.result.length > 0)
      .map((it) => {
        const rows = it.result as { metric: string; score: number | null }[]
        const values = rows.map((r) => r.score).filter((s): s is number => typeof s === "number")
        const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
        return { it, rows, avg }
      })
      .sort((a, b) => (a.avg ?? Infinity) - (b.avg ?? Infinity))
  }, [items])

  const failing = scored.filter((s) => s.avg !== null && s.avg < FAIL_THRESHOLD)
  const shown = onlyFailures ? failing : scored

  if (scored.length === 0) return null

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
          Per example · worst first
        </p>
        {failing.length > 0 ? (
          <button
            type="button"
            onClick={() => setOnlyFailures((v) => !v)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
              onlyFailures
                ? "border-destructive/40 bg-destructive/10 font-medium text-destructive"
                : "border-border/60 text-muted-foreground hover:bg-muted/40",
            )}
          >
            {onlyFailures
              ? "Show all"
              : `${failing.length} below ${Math.round(FAIL_THRESHOLD * 100)}%`}
          </button>
        ) : null}
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
        {shown.map(({ it, rows, avg }) => (
          <div
            key={it.example_id}
            className={cn(
              "flex items-center gap-2 rounded border px-2 py-1.5 text-[11px]",
              avg !== null && avg < FAIL_THRESHOLD
                ? "border-destructive/30 bg-destructive/5"
                : "border-border/40 bg-background/60",
            )}
          >
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {(it.input || "").slice(0, 120) || it.example_id}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {rows.map((r) => (
                <span key={r.metric} className="font-mono text-[10px] text-muted-foreground">
                  {r.metric.slice(0, 4)} <b className={scoreColor(r.score)}>{pct(r.score)}</b>
                </span>
              ))}
              <span className={cn("w-10 text-right font-mono font-semibold", scoreColor(avg))}>
                {pct(avg)}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Per-example security verdicts, riskiest first. Same idea as the metrics
 * table: the examples that would be blocked or flagged are the reason the scan
 * was run, so they lead rather than being buried in insertion order.
 */
// Human-readable name + one-line explanation for each threat, so the report
// says what was actually found rather than a raw column name.
const THREAT_META: Record<string, { label: string; description: string }> = {
  injection:             { label: "Prompt injection",       description: "Input tries to override the system's own instructions." },
  jailbreak:             { label: "Jailbreak",              description: "Attempts to bypass safety guardrails for restricted output." },
  skeleton_key:          { label: "Skeleton key",           description: "A known multi-step jailbreak that coaxes guardrails off." },
  secrets:               { label: "Secrets & PII",          description: "API keys, credentials, or personal data appear in the text." },
  indirect_injection:    { label: "Indirect injection",     description: "Malicious instructions hidden in retrieved or tool content." },
  rag_poisoning:         { label: "RAG poisoning",          description: "Poisoned documents in the context steer the answer." },
  tool_exfiltration:     { label: "Tool exfiltration",      description: "Tool arguments smuggle data to an attacker-controlled place." },
  tool_policy_violation: { label: "Tool policy violation",  description: "A tool or MCP call outside the allowed policy / allowlist." },
  cross_agent_injection: { label: "Cross-agent injection",  description: "One agent injects instructions into another across a hand-off." },
  image_injection:       { label: "Image injection",        description: "Instructions embedded in an image (via OCR) hijack the model." },
}

const RISK_ORDER = ["clean", "low", "medium", "high"] as const

const RISK_BAR: Record<string, string> = {
  clean: "bg-emerald-500",
  low: "bg-amber-500",
  medium: "bg-orange-500",
  high: "bg-destructive",
}

/** Stacked bar of how the examples split across risk levels. */
function RiskDistribution({ summary }: { summary: RunSummary }) {
  const levels = summary.risk_levels ?? {}
  const total = RISK_ORDER.reduce((n, lvl) => n + (levels[lvl] ?? 0), 0)
  if (total === 0) return null

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
        Risk distribution
      </p>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {RISK_ORDER.map((lvl) => {
          const n = levels[lvl] ?? 0
          if (n === 0) return null
          return (
            <div
              key={lvl}
              className={RISK_BAR[lvl]}
              style={{ width: `${(n / total) * 100}%` }}
              title={`${lvl}: ${n}`}
            />
          )
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {RISK_ORDER.map((lvl) =>
          levels[lvl] ? (
            <span key={lvl} className="flex items-center gap-1.5 text-[11px]">
              <span className={cn("size-2 rounded-full", RISK_BAR[lvl])} />
              <span className="capitalize text-muted-foreground">{lvl}</span>
              <span className={cn("font-mono font-medium", RISK_COLOR[lvl])}>{levels[lvl]}</span>
            </span>
          ) : null,
        )}
      </div>
    </div>
  )
}

/**
 * Full coverage of every threat category the scanner checks — each shown as
 * clean or with a detected count — so the report says what was actually looked
 * for (prompt injection, jailbreak, secrets/PII, RAG poisoning, …), not only
 * what happened to be found. Detected categories sort to the top.
 */
function ThreatCoverage({ summary }: { summary: RunSummary }) {
  if ((summary.completed ?? 0) === 0) return null
  const counts = summary.threats ?? {}

  const rows = Object.keys(THREAT_META)
    .map((key) => ({ key, ...THREAT_META[key], count: counts[key] ?? 0 }))
    .sort((a, b) => b.count - a.count)

  const detectedTypes = rows.filter((r) => r.count > 0).length

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
        Threat coverage
        {detectedTypes === 0 ? (
          <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
            all clear
          </span>
        ) : (
          <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-semibold text-destructive">
            {detectedTypes} type{detectedTypes === 1 ? "" : "s"} detected
          </span>
        )}
      </p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {rows.map((r) => {
          const hit = r.count > 0
          return (
            <div
              key={r.key}
              className={cn(
                "flex items-start gap-2 rounded-md border px-2.5 py-1.5",
                hit ? "border-destructive/30 bg-destructive/5" : "border-border/50 bg-muted/10",
              )}
            >
              <HugeiconsIcon
                icon={hit ? Alert02Icon : Tick02Icon}
                size={13}
                className={cn(
                  "mt-0.5 shrink-0",
                  hit ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[11px] font-medium text-foreground">{r.label}</p>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-[10px] font-semibold",
                      hit ? "text-destructive" : "text-muted-foreground/60",
                    )}
                  >
                    {hit ? `${r.count} flagged` : "clean"}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                  {r.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {(summary.blocked ?? 0) > 0 ? (
        <p className="mt-1.5 text-[10px] text-destructive">
          {summary.blocked} example{summary.blocked === 1 ? "" : "s"} would be blocked by the guardrail.
        </p>
      ) : null}
    </div>
  )
}

function SecurityItemTable({ items }: { items: ReportItem[] }) {
  const [onlyFlagged, setOnlyFlagged] = useState(false)

  const scanned = useMemo(() => {
    return items
      .filter((it) => it.result && !Array.isArray(it.result))
      .map((it) => {
        const res = it.result as SecurityResult
        const level = (res.risk_level as string) || "clean"
        const blocked = Number(res.should_block ?? 0) > 0
        const threats = THREAT_KEYS.filter((k) => Number(res[k] ?? 0) > 0)
        return {
          it,
          level,
          blocked,
          threats,
          score: typeof res.risk_score === "number" ? res.risk_score : null,
          flagged: blocked || (RISK_RANK[level] ?? 0) > 0,
        }
      })
      .sort(
        (a, b) =>
          Number(b.blocked) - Number(a.blocked) ||
          (RISK_RANK[b.level] ?? 0) - (RISK_RANK[a.level] ?? 0) ||
          (b.score ?? 0) - (a.score ?? 0),
      )
  }, [items])

  const flagged = scanned.filter((r) => r.flagged)
  const shown = onlyFlagged ? flagged : scanned

  if (scanned.length === 0) return null

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
          Per example · riskiest first
        </p>
        {flagged.length > 0 ? (
          <button
            type="button"
            onClick={() => setOnlyFlagged((v) => !v)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
              onlyFlagged
                ? "border-destructive/40 bg-destructive/10 font-medium text-destructive"
                : "border-border/60 text-muted-foreground hover:bg-muted/40",
            )}
          >
            {onlyFlagged ? "Show all" : `${flagged.length} flagged`}
          </button>
        ) : null}
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
        {shown.map(({ it, level, blocked, threats, score }) => (
          <div
            key={it.example_id}
            className={cn(
              "flex items-center gap-2 rounded border px-2 py-1.5 text-[11px]",
              blocked
                ? "border-destructive/30 bg-destructive/5"
                : "border-border/40 bg-background/60",
            )}
          >
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {(it.input || "").slice(0, 120) || it.example_id}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {threats.map((t) => (
                <span
                  key={t}
                  className="rounded bg-destructive/10 px-1.5 py-0.5 text-[9px] text-destructive"
                  title={THREAT_META[t]?.description ?? undefined}
                >
                  {THREAT_META[t]?.label ?? t.replace(/_/g, " ")}
                </span>
              ))}
              {blocked ? (
                <span className="rounded bg-destructive px-1.5 py-0.5 text-[9px] font-medium text-destructive-foreground">
                  block
                </span>
              ) : null}
              {score !== null ? (
                <span className="w-9 text-right font-mono text-[10px] text-muted-foreground/70" title="Risk score">
                  {score.toFixed(2)}
                </span>
              ) : null}
              <span
                className={cn(
                  "w-14 text-right font-medium capitalize",
                  RISK_COLOR[level] ?? "text-muted-foreground",
                )}
              >
                {level}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const COMPARE_STATUS_STYLE: Record<CompareExample["status"], string> = {
  regressed: "bg-destructive/10 text-destructive",
  improved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  unchanged: "bg-muted text-muted-foreground",
  added: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
}

function CompareView({ compare }: { compare: CompareReport }) {
  const { summary, metrics, examples, baseline } = compare
  return (
    <div className="space-y-3 rounded-md border border-border/60 bg-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium">
          vs baseline <span className="text-muted-foreground">{fmtDate(baseline.created_at)}</span>
        </p>
        <div className="flex gap-1.5 text-[10px]">
          {summary.regressed > 0 ? (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
              {summary.regressed} regressed
            </span>
          ) : null}
          {summary.improved > 0 ? (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
              {summary.improved} improved
            </span>
          ) : null}
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {summary.unchanged} unchanged
          </span>
        </div>
      </div>

      {metrics.length > 0 ? (
        <div className="space-y-1">
          {metrics.map((m) => (
            <div key={m.metric} className="flex items-center gap-2 text-[11px]">
              <span className="w-32 shrink-0 truncate capitalize text-muted-foreground">
                {m.metric.replace(/_/g, " ")}
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {pct(m.baseline_avg)} → <b className={scoreColor(m.avg)}>{pct(m.avg)}</b>
              </span>
              <span
                className={cn(
                  "font-mono text-[10px] tabular-nums",
                  m.delta < -0.01 ? "text-destructive" : m.delta > 0.01 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                )}
              >
                {m.delta >= 0 ? "+" : ""}{Math.round(m.delta * 100)}pp
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {examples.some((e) => e.status === "regressed") ? (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
            Regressed examples
          </p>
          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {examples
              .filter((e) => e.status === "regressed")
              .map((e) => (
                <div
                  key={e.example_id}
                  className="flex items-center gap-2 rounded border border-border/40 bg-background/60 px-2 py-1.5 text-[11px]"
                >
                  <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium", COMPARE_STATUS_STYLE[e.status])}>
                    {e.delta !== null ? `${Math.round(e.delta * 100)}pp` : e.status}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{e.input || e.example_id}</span>
                  <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                    {pct(e.baseline_score)} → <b className={scoreColor(e.score)}>{pct(e.score)}</b>
                  </span>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
          No regressions against this baseline.
        </p>
      )}
    </div>
  )
}

function ScoreRows({ title, rows }: { title: string; rows: Record<string, number | null> }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">{title}</p>
      <div className="space-y-1.5">
        {Object.entries(rows).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-32 shrink-0 truncate text-xs capitalize text-muted-foreground">{k.replace(/_/g, " ")}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  typeof v === "number" && v >= 0.8 ? "bg-emerald-500" : typeof v === "number" && v >= 0.5 ? "bg-amber-500" : "bg-destructive",
                )}
                style={{ width: `${Math.round((v ?? 0) * 100)}%` }}
              />
            </div>
            <span className={cn("w-10 shrink-0 text-right font-mono text-xs tabular-nums", scoreColor(v))}>{pct(v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Multi-run comparison (model vs model) ────────────────────────────────────

/**
 * Side-by-side view of N runs of the same dataset. Built for comparing judge
 * models: a per-metric matrix (one column per run/model) plus the per-example
 * table ordered by disagreement, since the examples the models score most
 * differently are the ones actually worth reading.
 */
function MultiCompareView({
  report,
  loading,
  onMetricChange,
}: {
  report: MultiCompareReport
  loading: boolean
  onMetricChange: (metric: string | null) => void
}) {
  const { runs, overall, completed, metrics, examples } = report
  const drill = report.metric ?? null
  const options = report.metric_options ?? metrics.map((m) => m.metric)

  // Best (highest) value per metric row, so the winner can be highlighted.
  const bestFor = (scores: Record<string, number | null>): number | null => {
    const vals = Object.values(scores).filter((v): v is number => typeof v === "number")
    return vals.length ? Math.max(...vals) : null
  }

  const bestOverall = bestFor(overall)

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-foreground">Model comparison</p>
        <p className="text-[11px] text-muted-foreground">
          {runs.length} runs over the same examples. Highest score per row is highlighted.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/60">
              <th className="py-1.5 pr-3 text-left font-medium text-muted-foreground">Metric</th>
              {runs.map((r) => (
                <th key={r.run_id} className="px-2 py-1.5 text-right font-medium text-foreground">
                  <span className="font-mono text-[11px]">{runLabel(r)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60 bg-muted/20">
              <td className="py-1.5 pr-3 font-medium text-foreground">Overall</td>
              {runs.map((r) => {
                const v = overall[r.run_id]
                const best = bestOverall !== null && v === bestOverall
                return (
                  <td
                    key={r.run_id}
                    className={cn(
                      "px-2 py-1.5 text-right font-mono tabular-nums",
                      scoreColor(v),
                      best && "font-semibold",
                    )}
                  >
                    {pct(v)}
                    {best ? " ★" : ""}
                  </td>
                )
              })}
            </tr>
            {metrics.map((m) => {
              const best = bestFor(m.scores)
              return (
                <tr key={m.metric} className="border-b border-border/40">
                  <td className="py-1.5 pr-3 capitalize text-muted-foreground">
                    {m.metric.replace(/_/g, " ")}
                  </td>
                  {runs.map((r) => {
                    const v = m.scores[r.run_id]
                    const isBest = best !== null && v === best
                    return (
                      <td
                        key={r.run_id}
                        className={cn(
                          "px-2 py-1.5 text-right font-mono tabular-nums",
                          scoreColor(v),
                          isBest && "font-semibold",
                        )}
                      >
                        {pct(v)}
                        {isBest ? " ★" : ""}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            <tr>
              <td className="py-1.5 pr-3 text-[11px] text-muted-foreground/70">Graded</td>
              {runs.map((r) => (
                <td
                  key={r.run_id}
                  className="px-2 py-1.5 text-right font-mono text-[11px] tabular-nums text-muted-foreground/70"
                >
                  {completed[r.run_id] ?? 0}/{r.total}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground">Examples by disagreement</p>
          <div className="flex items-center gap-1.5">
            {loading ? (
              <HugeiconsIcon
                icon={Loading03Icon}
                size={12}
                className="animate-spin text-muted-foreground"
              />
            ) : null}
            <select
              value={drill ?? ""}
              onChange={(e) => onMetricChange(e.target.value || null)}
              disabled={loading}
              className="rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] text-muted-foreground focus-visible:outline-none"
            >
              <option value="">Overall score</option>
              {options.map((m) => (
                <option key={m} value={m}>
                  {m.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full min-w-[420px] border-collapse text-xs">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b border-border/60">
                <th className="py-1.5 pr-3 text-left font-medium text-muted-foreground">Input</th>
                {runs.map((r) => (
                  <th key={r.run_id} className="px-2 py-1.5 text-right font-medium text-muted-foreground">
                    <span className="font-mono text-[10px]">{runLabel(r)}</span>
                  </th>
                ))}
                <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Spread</th>
              </tr>
            </thead>
            <tbody>
              {examples.map((ex) => (
                <tr key={ex.example_id} className="border-b border-border/40">
                  <td className="max-w-[220px] truncate py-1.5 pr-3 text-foreground" title={ex.input}>
                    {ex.input || "—"}
                  </td>
                  {runs.map((r) => (
                    <td
                      key={r.run_id}
                      className={cn(
                        "px-2 py-1.5 text-right font-mono tabular-nums",
                        scoreColor(ex.scores[r.run_id]),
                      )}
                    >
                      {pct(ex.scores[r.run_id])}
                    </td>
                  ))}
                  <td
                    className={cn(
                      "px-2 py-1.5 text-right font-mono tabular-nums",
                      ex.spread !== null && ex.spread >= 0.3
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {ex.spread !== null ? ex.spread.toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
