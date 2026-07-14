"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AiSecurity02Icon,
  Alert02Icon,
  Loading03Icon,
  PlayIcon,
  RoboticIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"

// ── Types ─────────────────────────────────────────────────────────────────────

interface RunSummary {
  kind?: string
  total?: number
  completed?: number
  avg_run_score?: number | null
  pass_rate?: number | null
  layers?: Record<string, number | null>
  metrics?: Record<string, number | null>
  risk_levels?: Record<string, number>
  flagged?: number
  blocked?: number
  threats?: Record<string, number>
}

interface DatasetRun {
  run_id: string
  kind: "agentic" | "security"
  status: "running" | "complete" | "failed"
  total: number
  item_count: number
  summary: RunSummary
  created_at: string | null
}

interface RunReport {
  run: DatasetRun
  summary: RunSummary
  items: unknown[]
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

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z")
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

// ── Component ───────────────────────────────────────────────────────────────────

export function DatasetRuns({
  dataset,
}: {
  dataset: { dataset_id: string; example_count: number }
}) {
  const [runs, setRuns] = useState<DatasetRun[]>([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState<"agentic" | "security" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [report, setReport] = useState<RunReport | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadRuns = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authFetch<{ runs: DatasetRun[] }>(`/api/v1/datasets/${dataset.dataset_id}/runs`)
      setRuns(data.runs)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load runs")
    } finally {
      setLoading(false)
    }
  }, [dataset.dataset_id])

  // Reset when switching datasets.
  useEffect(() => {
    setSelectedRunId(null)
    setReport(null)
    setError(null)
    loadRuns()
  }, [dataset.dataset_id, loadRuns])

  const loadReport = useCallback(async (runId: string) => {
    try {
      const data = await authFetch<RunReport>(`/api/v1/datasets/runs/${runId}`)
      setReport(data)
      setRuns((prev) => prev.map((r) => (r.run_id === runId ? data.run : r)))
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load report")
    }
  }, [])

  // Poll the selected run's report while it's still running.
  useEffect(() => {
    if (pollRef.current) clearTimeout(pollRef.current)
    if (!selectedRunId || !report || report.run.status !== "running") return
    pollRef.current = setTimeout(() => loadReport(selectedRunId), 3500)
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [selectedRunId, report, loadReport])

  async function launch(kind: "agentic" | "security") {
    setLaunching(kind)
    setError(null)
    try {
      const run = await authFetch<DatasetRun>(`/api/v1/datasets/${dataset.dataset_id}/runs`, {
        method: "POST",
        body: { kind },
      })
      setRuns((prev) => [run, ...prev])
      setSelectedRunId(run.run_id)
      setReport(null)
      loadReport(run.run_id)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to start run")
    } finally {
      setLaunching(null)
    }
  }

  function selectRun(runId: string) {
    setSelectedRunId(runId)
    setReport(null)
    loadReport(runId)
  }

  const noExamples = dataset.example_count === 0

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={noExamples || launching !== null}
          onClick={() => launch("agentic")}
        >
          {launching === "agentic" ? (
            <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
          ) : (
            <HugeiconsIcon icon={PlayIcon} size={13} />
          )}
          Run Agentic Eval
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

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          <HugeiconsIcon icon={Alert02Icon} size={13} />
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
          Loading runs…
        </div>
      ) : runs.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
          No runs yet. Launch an agentic evaluation or security scan over the whole dataset.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
          {/* Runs list */}
          <div className="space-y-1.5">
            {runs.map((r) => (
              <button
                key={r.run_id}
                type="button"
                onClick={() => selectRun(r.run_id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors",
                  selectedRunId === r.run_id
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/60 hover:bg-muted/40",
                )}
              >
                <HugeiconsIcon
                  icon={r.kind === "security" ? AiSecurity02Icon : RoboticIcon}
                  size={13}
                  className="shrink-0 text-muted-foreground"
                />
                <span className="flex-1 truncate">
                  <span className="font-medium capitalize">{r.kind}</span>
                  <span className="ml-1 text-muted-foreground/60">{fmtDate(r.created_at)}</span>
                </span>
                <StatusPill status={r.status} />
              </button>
            ))}
          </div>

          {/* Report */}
          <div className="rounded-md border border-border/60 p-4">
            {!report ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Select a run to view its report.
              </p>
            ) : (
              <ReportView report={report} />
            )}
          </div>
        </div>
      )}
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

function ReportView({ report }: { report: RunReport }) {
  const { run, summary } = report
  const done = summary.completed ?? 0
  const total = summary.total ?? run.total

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold capitalize">{run.kind} report</h4>
        <span className="text-[11px] text-muted-foreground">
          {done}/{total} examples scored
          {run.status === "running" ? " · updating…" : ""}
        </span>
      </div>

      {run.kind === "agentic" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Avg run score" value={pct(summary.avg_run_score)} color={scoreColor(summary.avg_run_score)} />
            <Stat label="Pass rate" value={pct(summary.pass_rate)} color={scoreColor(summary.pass_rate)} />
          </div>
          {summary.layers && Object.keys(summary.layers).length > 0 ? (
            <ScoreRows title="Layers" rows={summary.layers} />
          ) : null}
          {summary.metrics && Object.keys(summary.metrics).length > 0 ? (
            <ScoreRows title="Metrics (text examples)" rows={summary.metrics} />
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Flagged" value={String(summary.flagged ?? 0)} color={(summary.flagged ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"} />
            <Stat label="Would block" value={String(summary.blocked ?? 0)} color={(summary.blocked ?? 0) > 0 ? "text-destructive" : "text-muted-foreground"} />
          </div>
          {summary.risk_levels && Object.keys(summary.risk_levels).length > 0 ? (
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">Risk levels</p>
              <div className="flex flex-wrap gap-2">
                {(["clean", "low", "medium", "high"] as const).map((lvl) =>
                  summary.risk_levels?.[lvl] ? (
                    <span key={lvl} className={cn("rounded-md bg-muted/50 px-2 py-1 text-xs", RISK_COLOR[lvl])}>
                      <span className="font-medium capitalize">{lvl}</span> {summary.risk_levels[lvl]}
                    </span>
                  ) : null,
                )}
              </div>
            </div>
          ) : null}
          {summary.threats && Object.keys(summary.threats).length > 0 ? (
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">Threats detected</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(summary.threats).map(([k, n]) => (
                  <span key={k} className="rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                    {k.replace(/_/g, " ")} · {n}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {summary.flagged === 0 && (summary.completed ?? 0) > 0 ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">No security risks detected across the dataset.</p>
          ) : null}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60">{label}</p>
      <p className={cn("mt-0.5 font-mono text-lg font-semibold tabular-nums", color)}>{value}</p>
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
