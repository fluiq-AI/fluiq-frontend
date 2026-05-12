import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Loading03Icon,
  RefreshIcon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import type { EvaluationScore, TraceListResponse, TraceRecord } from "@/pages/Dashboard/Traces/types"
import {
  formatDate,
  formatScore,
  scoreBandClass,
} from "@/pages/Dashboard/Traces/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface EvalRow {
  trace: TraceRecord
  evaluation: EvaluationScore
}

interface MetricStats {
  metric: string
  count: number
  avg: number
  passCount: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PASS_THRESHOLD = 0.7
const FETCH_LIMIT = 500

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

function passRateClass(rate: number): string {
  if (rate >= 0.8) return "text-emerald-600 dark:text-emerald-400"
  if (rate >= 0.5) return "text-amber-600 dark:text-amber-400"
  return "text-destructive"
}

function passRateBarClass(rate: number): string {
  if (rate >= 0.8) return "[&>div]:bg-emerald-500"
  if (rate >= 0.5) return "[&>div]:bg-amber-500"
  return "[&>div]:bg-destructive"
}

function getTraceName(t: TraceRecord): string {
  const e = t.event
  if (typeof e["function"] === "string" && e["function"]) return e["function"] as string
  if (typeof e["name"] === "string" && e["name"]) return e["name"] as string
  if (typeof e["model"] === "string" && e["model"]) return e["model"] as string
  return t.api_key_prefix ? `${t.api_key_prefix}…` : "—"
}

// ── Page ──────────────────────────────────────────────────────────────────────

function Tests() {
  const [traces, setTraces]   = useState<TraceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await authFetch<TraceListResponse>(
        `/api/v1/traces?limit=${FETCH_LIMIT}&offset=0`,
      )
      setTraces(data.traces)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load evaluations")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await authFetch<TraceListResponse>(
          `/api/v1/traces?limit=${FETCH_LIMIT}&offset=0`,
        )
        if (cancelled) return
        setTraces(data.traces)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.detail : "Failed to load evaluations")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Flatten all (trace, eval) pairs that have a score
  const evalRows = useMemo<EvalRow[]>(() => {
    const rows: EvalRow[] = []
    for (const t of traces) {
      for (const e of t.evaluations ?? []) {
        if (typeof e.score === "number" && Number.isFinite(e.score)) {
          rows.push({ trace: t, evaluation: e })
        }
      }
    }
    // Most-recent first (ingested_at descending)
    rows.sort((a, b) => b.trace.ingested_at.localeCompare(a.trace.ingested_at))
    return rows
  }, [traces])

  // Aggregate by metric
  const metricStats = useMemo<MetricStats[]>(() => {
    const map = new Map<string, { sum: number; count: number; pass: number }>()
    for (const { evaluation: e } of evalRows) {
      const s = e.score as number
      const prev = map.get(e.metric) ?? { sum: 0, count: 0, pass: 0 }
      map.set(e.metric, {
        sum:   prev.sum + s,
        count: prev.count + 1,
        pass:  prev.pass + (s >= PASS_THRESHOLD ? 1 : 0),
      })
    }
    return Array.from(map.entries())
      .map(([metric, { sum, count, pass }]) => ({
        metric,
        count,
        avg:       sum / count,
        passCount: pass,
      }))
      .sort((a, b) => b.count - a.count)
  }, [evalRows])

  const totalEvals = evalRows.length
  const avgScore = totalEvals > 0
    ? evalRows.reduce((s, r) => s + (r.evaluation.score as number), 0) / totalEvals
    : null
  const passRate = totalEvals > 0
    ? evalRows.filter((r) => (r.evaluation.score as number) >= PASS_THRESHOLD).length / totalEvals
    : null

  const isEmpty = !loading && totalEvals === 0
  const hasData = totalEvals > 0

  return (
    <>
      {/* ── Header ── */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Tests
          </h1>
          <p className="mt-2 text-muted-foreground">
            Evaluation results from your AI pipelines.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
        >
          <HugeiconsIcon
            icon={loading ? Loading03Icon : RefreshIcon}
            size={14}
            className={loading ? "animate-spin" : undefined}
          />
          Refresh
        </Button>
      </div>

      {/* ── Error banner ── */}
      {error ? (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <HugeiconsIcon icon={Alert02Icon} size={14} />
          {error}
        </div>
      ) : null}

      {/* ── Summary stat cards ── */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total Evaluations"
          value={loading && !hasData ? "—" : totalEvals.toLocaleString()}
          sub={hasData ? `across ${traces.filter((t) => (t.evaluations?.length ?? 0) > 0).length} traces` : undefined}
          loading={loading && !hasData}
        />
        <StatCard
          label="Average Score"
          value={avgScore !== null ? formatScore(avgScore) : "—"}
          sub={hasData ? `pass threshold ≥ ${PASS_THRESHOLD}` : undefined}
          valueClass={avgScore !== null ? scoreBandClass(avgScore).split(" ").find((c) => c.startsWith("text-")) : undefined}
          loading={loading && !hasData}
        />
        <StatCard
          label="Pass Rate"
          value={passRate !== null ? formatPct(passRate) : "—"}
          sub={hasData ? `${evalRows.filter((r) => (r.evaluation.score as number) >= PASS_THRESHOLD).length} / ${totalEvals} passed` : undefined}
          valueClass={passRate !== null ? passRateClass(passRate) : undefined}
          loading={loading && !hasData}
        />
      </div>

      {isEmpty ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={TestTube01Icon} size={16} />
              <CardTitle className="text-base">No evaluations yet</CardTitle>
            </div>
            <CardDescription>
              Evaluations are automatically triggered when your SDK-instrumented pipelines run.
              Make sure your API key is active and traces are being ingested.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use{" "}
              <code className="font-mono text-foreground">@trace</code>
              {" "}decorators or the LangChain integration — evaluations will appear here once results come in.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">

          {/* ── Metric breakdown + insights ── */}
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Metric breakdown — 2/3 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">By Metric</CardTitle>
                  {loading ? (
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      size={14}
                      className="animate-spin text-muted-foreground"
                    />
                  ) : null}
                </div>
                <CardDescription>
                  Average score and pass rate per evaluation metric.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metricStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No metric data.</p>
                ) : (
                  <div className="space-y-4">
                    {metricStats.map((m) => {
                      const mPassRate = m.passCount / m.count
                      return (
                        <div key={m.metric} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-foreground">{m.metric}</span>
                              <span className="rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
                                {m.count}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 font-mono font-medium",
                                  scoreBandClass(m.avg),
                                )}
                              >
                                avg {formatScore(m.avg)}
                              </span>
                              <span className={cn("font-medium", passRateClass(mPassRate))}>
                                {formatPct(mPassRate)} pass
                              </span>
                            </div>
                          </div>
                          <Progress
                            value={Math.round(m.avg * 100)}
                            className={cn("h-1.5", passRateBarClass(mPassRate))}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Insights — 1/3 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Insights</CardTitle>
                <CardDescription>
                  Metrics that need attention.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {passRate !== null && passRate >= 0.8 ? (
                    <InsightItem
                      level="good"
                      title="Strong overall pass rate"
                      body={`${formatPct(passRate)} of evaluations are passing the score threshold.`}
                    />
                  ) : passRate !== null && passRate >= 0.5 ? (
                    <InsightItem
                      level="warn"
                      title="Moderate pass rate"
                      body={`${formatPct(passRate)} pass rate. Review failing traces to identify patterns.`}
                    />
                  ) : passRate !== null ? (
                    <InsightItem
                      level="bad"
                      title="Low pass rate"
                      body={`Only ${formatPct(passRate)} of evaluations are passing. Check prompt quality and retrieval relevance.`}
                    />
                  ) : null}

                  {metricStats
                    .filter((m) => m.count >= 3 && m.passCount / m.count < 0.5)
                    .map((m) => (
                      <InsightItem
                        key={m.metric}
                        level="warn"
                        title={`Low ${m.metric}`}
                        body={`Only ${formatPct(m.passCount / m.count)} pass rate on ${m.count} evals. Average score: ${formatScore(m.avg)}.`}
                      />
                    ))}

                  {metricStats
                    .filter((m) => m.count >= 3 && m.passCount / m.count >= 0.9)
                    .map((m) => (
                      <InsightItem
                        key={m.metric}
                        level="good"
                        title={`${m.metric} is healthy`}
                        body={`${formatPct(m.passCount / m.count)} pass rate across ${m.count} evaluations.`}
                      />
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Recent evaluations table ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Evaluations</CardTitle>
              <CardDescription>
                Individual evaluation results ordered by most recently ingested.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2.5 text-left">Trace</th>
                      <th className="px-4 py-2.5 text-left">Metric</th>
                      <th className="px-4 py-2.5 text-left">Score</th>
                      <th className="px-4 py-2.5 text-left">Pass</th>
                      <th className="px-4 py-2.5 text-left">Evaluator</th>
                      <th className="px-4 py-2.5 text-left">Model</th>
                      <th className="px-4 py-2.5 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalRows.slice(0, 200).map(({ trace: t, evaluation: e }, idx) => {
                      const score = e.score as number
                      const passed = score >= PASS_THRESHOLD
                      return (
                        <tr
                          key={`${t.ingested_at}-${e.metric}-${idx}`}
                          className="border-b border-border/60 align-middle hover:bg-muted/30"
                        >
                          <td className="max-w-40 truncate px-4 py-2.5 font-mono text-xs text-muted-foreground">
                            {getTraceName(t)}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs">{e.metric}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-medium",
                                scoreBandClass(score),
                              )}
                            >
                              {formatScore(score)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {passed ? (
                              <HugeiconsIcon
                                icon={CheckmarkCircle02Icon}
                                size={14}
                                className="text-emerald-600 dark:text-emerald-400"
                              />
                            ) : (
                              <HugeiconsIcon
                                icon={Cancel01Icon}
                                size={14}
                                className="text-destructive"
                              />
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {e.evaluator || <span className="text-muted-foreground/50">—</span>}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                            {e.judge_model || <span className="text-muted-foreground/50">—</span>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                            {formatDate(t.ingested_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {evalRows.length > 200 ? (
                <p className="px-4 py-3 text-xs text-muted-foreground">
                  Showing 200 of {evalRows.length.toLocaleString()} evaluations.
                </p>
              ) : null}
            </CardContent>
          </Card>

        </div>
      )}
    </>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  valueClass,
  loading,
}: {
  label: string
  value: string
  sub?: string
  valueClass?: string
  loading?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1 font-heading text-2xl font-semibold tabular-nums",
            loading ? "text-muted-foreground/50" : (valueClass ?? "text-foreground"),
          )}
        >
          {value}
        </p>
        {sub ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

type InsightLevel = "good" | "warn" | "bad"

const INSIGHT_CONFIG: Record<InsightLevel, { dot: string; titleClass: string }> = {
  good: { dot: "bg-emerald-500", titleClass: "text-emerald-700 dark:text-emerald-400" },
  warn: { dot: "bg-amber-500",   titleClass: "text-amber-700 dark:text-amber-400"   },
  bad:  { dot: "bg-destructive", titleClass: "text-destructive"                      },
}

function InsightItem({
  level,
  title,
  body,
}: {
  level: InsightLevel
  title: string
  body: string
}) {
  const cfg = INSIGHT_CONFIG[level]
  return (
    <div className="flex gap-3">
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", cfg.dot)} />
      <div>
        <p className={cn("text-sm font-medium leading-snug", cfg.titleClass)}>{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}

export default Tests
