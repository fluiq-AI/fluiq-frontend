"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Loading03Icon, RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { SearchSelect } from "@/components/SearchSelect"

// ── Types ─────────────────────────────────────────────────────────────────────

interface TrafficPoint {
  bucket: string
  spans: number
  runs: number
  p50: number | null
  p95: number | null
  errors: number
}

interface SpendPoint {
  bucket: string
  cost: number
  tokens: number
  cached_tokens: number
}

interface ScorePoint {
  bucket: string
  judge_score: number | null
  judged: number
  feedback_score: number | null
  feedback_count: number
}

interface ModelRow {
  model: string
  provider: string
  calls: number
  tokens: number
  cost: number
}

interface MonitorResponse {
  window_hours: number
  bucket_minutes: number
  traffic: TrafficPoint[]
  spend: SpendPoint[]
  scores: ScorePoint[]
  models: ModelRow[]
  totals: {
    spans: number
    runs: number
    errors: number
    cost: number
    tokens: number
    worst_p95: number | null
    judge_score: number | null
    judged: number
    feedback_score: number | null
    feedback_count: number
  }
}

const WINDOWS = [
  { value: "1", label: "Last hour" },
  { value: "6", label: "Last 6 hours" },
  { value: "24", label: "Last 24 hours" },
  { value: "72", label: "Last 3 days" },
  { value: "168", label: "Last 7 days" },
  { value: "720", label: "Last 30 days" },
]

const CHART: ChartConfig = {
  spans:  { label: "Spans",   color: "#1860D3" },
  runs:   { label: "Runs",    color: "#6FA8FF" },
  p50:    { label: "p50",     color: "#6FA8FF" },
  p95:    { label: "p95",     color: "#1860D3" },
  cost:   { label: "Cost",    color: "#10B981" },
  tokens: { label: "Tokens",  color: "#8B5CF6" },
  errors: { label: "Errors",  color: "#EF4444" },
  judge_score:    { label: "Judge score",   color: "#1860D3" },
  feedback_score: { label: "User feedback", color: "#F59E0B" },
}

// ── Formatting ────────────────────────────────────────────────────────────────

function compact(n: number): string {
  if (n < 1000) return String(Math.round(n))
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
}

function usd(n: number): string {
  if (n === 0) return "$0"
  if (n < 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(2)}`
}

function seconds(n: number | null | undefined): string {
  if (n == null) return "—"
  return n < 1 ? `${Math.round(n * 1000)}ms` : `${n.toFixed(2)}s`
}

function pct(n: number | null | undefined): string {
  return n == null ? "—" : `${Math.round(n * 100)}%`
}

/** Bucket timestamps are ISO; the axis wants something short and readable. */
function tickLabel(bucket: string, bucketMinutes: number): string {
  const d = new Date(bucket.replace(" ", "T") + (bucket.endsWith("Z") ? "" : "Z"))
  if (Number.isNaN(d.getTime())) return bucket
  return bucketMinutes >= 1440
    ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Operational metrics over time.
 *
 * Overview answers a billing question — what am I paying, how much quota is
 * left. This answers the one you ask when something feels wrong: is the app
 * slower, dearer, or worse than it was yesterday, and which model changed?
 */
function Monitor() {
  const [hours, setHours] = useState("24")
  const [model, setModel] = useState("")
  const [data, setData] = useState<MonitorResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ hours })
      if (model) params.set("model", model)
      setData(await authFetch<MonitorResponse>(`/api/v1/monitor?${params}`))
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load monitor data")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [hours, model])

  useEffect(() => {
    load()
  }, [load])

  const bucketMinutes = data?.bucket_minutes ?? 60
  const label = useCallback(
    (b: string) => tickLabel(b, bucketMinutes),
    [bucketMinutes],
  )

  const traffic = useMemo(
    () => (data?.traffic ?? []).map((p) => ({ ...p, label: label(p.bucket) })),
    [data, label],
  )
  const spend = useMemo(
    () => (data?.spend ?? []).map((p) => ({ ...p, label: label(p.bucket) })),
    [data, label],
  )
  const scores = useMemo(
    () =>
      (data?.scores ?? []).map((p) => ({
        ...p,
        label: label(p.bucket),
        // Recharts draws a gap for null, which is right: an unjudged bucket is
        // not a zero score, and connecting across it would invent a trend.
        judge_score: p.judged > 0 ? p.judge_score : null,
        feedback_score: p.feedback_count > 0 ? p.feedback_score : null,
      })),
    [data, label],
  )

  const modelOptions = useMemo(
    () => (data?.models ?? []).map((m) => ({ value: m.model, label: m.model })),
    [data],
  )

  const totals = data?.totals
  const errorRate =
    totals && totals.spans > 0 ? totals.errors / totals.spans : null

  const empty = !loading && !error && (totals?.spans ?? 0) === 0

  // A tick per point is unreadable past ~20 buckets.
  const tickInterval = Math.max(0, Math.ceil(traffic.length / 12) - 1)

  return (
    <div>
      <DashboardPageHeader
        title="Monitor"
        description="How the application is behaving over time — volume, latency, spend, and quality."
      />

      <div className="space-y-4 px-6 py-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <SearchSelect
              value={hours}
              onChange={setHours}
              options={WINDOWS}
              placeholder="Window"
              searchable={false}
            />
          </div>
          <div className="w-56">
            <SearchSelect
              value={model}
              onChange={setModel}
              options={modelOptions}
              placeholder="All models"
              clearLabel="All models"
              emptyText="No models in this window."
            />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <HugeiconsIcon
              icon={loading ? Loading03Icon : RefreshIcon}
              size={14}
              className={loading ? "animate-spin" : undefined}
            />
            Refresh
          </Button>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {empty ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No traffic in this window.
              {model ? " Try clearing the model filter, or " : " Try "}
              widening it.
            </CardContent>
          </Card>
        ) : null}

        {/* Headline numbers. Deliberately the same set the charts show, so the
            eye can go from "that number looks wrong" to the shape that caused it. */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Runs" value={totals ? compact(totals.runs) : "—"}
                sub={totals ? `${compact(totals.spans)} spans` : undefined} />
          <Stat label="Worst p95" value={seconds(totals?.worst_p95)}
                sub="slowest bucket" />
          <Stat label="Spend" value={totals ? usd(totals.cost) : "—"}
                sub={totals ? `${compact(totals.tokens)} tokens` : undefined} />
          <Stat
            label="Judge score"
            value={pct(totals?.judge_score)}
            sub={totals?.judged ? `${compact(totals.judged)} judged` : "nothing judged"}
            tone={
              totals?.judge_score == null ? "muted"
                : totals.judge_score >= 0.8 ? "good"
                : totals.judge_score >= 0.5 ? "warn" : "bad"
            }
          />
          <Stat
            label="Errors"
            value={errorRate == null ? "—" : `${(errorRate * 100).toFixed(1)}%`}
            sub={totals ? `${compact(totals.errors)} of ${compact(totals.spans)}` : undefined}
            tone={errorRate == null ? "muted" : errorRate > 0.02 ? "bad" : "good"}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Volume" hint="Spans ingested, and how many were agent-run roots.">
            <ChartContainer config={CHART} className="h-48 w-full">
              <AreaChart data={traffic} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.06} />
                <Axis dataKey="label" interval={tickInterval} />
                <YAxis {...AXIS} tickFormatter={compact} width={44} />
                <Tooltip content={<ChartTooltipContent labelKey="label" />} />
                <Area dataKey="spans" stroke={CHART.spans.color} fill={CHART.spans.color}
                      fillOpacity={0.12} strokeWidth={1.5} />
                <Area dataKey="runs" stroke={CHART.runs.color} fill={CHART.runs.color}
                      fillOpacity={0.12} strokeWidth={1.5} />
              </AreaChart>
            </ChartContainer>
          </ChartCard>

          <ChartCard title="Latency" hint="p50 and p95 per bucket, in seconds.">
            <ChartContainer config={CHART} className="h-48 w-full">
              <LineChart data={traffic} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.06} />
                <Axis dataKey="label" interval={tickInterval} />
                <YAxis {...AXIS} tickFormatter={(v) => seconds(Number(v))} width={52} />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      labelKey="label"
                      formatter={(v) => seconds(Number(v))}
                    />
                  }
                />
                <Line dataKey="p50" stroke={CHART.p50.color} dot={false} strokeWidth={1.5} />
                <Line dataKey="p95" stroke={CHART.p95.color} dot={false} strokeWidth={1.5} />
              </LineChart>
            </ChartContainer>
          </ChartCard>

          <ChartCard title="Spend" hint="What the traffic in each bucket cost.">
            <ChartContainer config={CHART} className="h-48 w-full">
              <AreaChart data={spend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.06} />
                <Axis dataKey="label" interval={tickInterval} />
                <YAxis {...AXIS} tickFormatter={(v) => usd(Number(v))} width={56} />
                <Tooltip
                  content={
                    <ChartTooltipContent labelKey="label" formatter={(v) => usd(Number(v))} />
                  }
                />
                <Area dataKey="cost" stroke={CHART.cost.color} fill={CHART.cost.color}
                      fillOpacity={0.12} strokeWidth={1.5} />
              </AreaChart>
            </ChartContainer>
          </ChartCard>

          <ChartCard
            title="Quality"
            hint="Automated judge scores and end-user feedback, kept apart — they answer different questions."
          >
            <ChartContainer config={CHART} className="h-48 w-full">
              <LineChart data={scores} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.06} />
                <Axis dataKey="label" interval={tickInterval} />
                <YAxis {...AXIS} domain={[0, 1]} tickFormatter={(v) => pct(Number(v))} width={44} />
                <Tooltip
                  content={
                    <ChartTooltipContent labelKey="label" formatter={(v) => pct(Number(v))} />
                  }
                />
                <Line dataKey="judge_score" stroke={CHART.judge_score.color}
                      dot={false} strokeWidth={1.5} connectNulls={false} />
                <Line dataKey="feedback_score" stroke={CHART.feedback_score.color}
                      dot={false} strokeWidth={1.5} connectNulls={false} />
              </LineChart>
            </ChartContainer>
          </ChartCard>
        </div>

        {(data?.models ?? []).length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By model</CardTitle>
              <p className="text-xs text-muted-foreground">
                A line moving tells you something changed; this tells you which model.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-muted-foreground">
                      <th className="pb-1.5 font-medium">Model</th>
                      <th className="pb-1.5 text-right font-medium">Calls</th>
                      <th className="pb-1.5 text-right font-medium">Tokens</th>
                      <th className="pb-1.5 text-right font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.models ?? []).map((m) => (
                      <tr
                        key={`${m.provider}:${m.model}`}
                        onClick={() => setModel(m.model === model ? "" : m.model)}
                        className={cn(
                          "cursor-pointer border-b border-border/30 transition-colors last:border-0 hover:bg-muted/40",
                          model === m.model && "bg-primary/5",
                        )}
                      >
                        <td className="py-1.5 font-mono">{m.model}</td>
                        <td className="py-1.5 text-right tabular-nums">{compact(m.calls)}</td>
                        <td className="py-1.5 text-right tabular-nums">{compact(m.tokens)}</td>
                        <td className="py-1.5 text-right tabular-nums">{usd(m.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

// ── Chart primitives ──────────────────────────────────────────────────────────

const AXIS = {
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 11, fill: "currentColor", fillOpacity: 0.45 },
} as const

function Axis({ dataKey, interval }: { dataKey: string; interval: number }) {
  return <XAxis dataKey={dataKey} interval={interval} {...AXIS} />
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function Stat({
  label,
  value,
  sub,
  tone = "normal",
}: {
  label: string
  value: string
  sub?: string
  tone?: "normal" | "good" | "warn" | "bad" | "muted"
}) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60">{label}</p>
        <p
          className={cn(
            "mt-0.5 font-mono text-xl font-semibold tabular-nums",
            tone === "good" && "text-emerald-600 dark:text-emerald-400",
            tone === "warn" && "text-amber-600 dark:text-amber-400",
            tone === "bad" && "text-destructive",
            tone === "muted" && "text-muted-foreground",
          )}
        >
          {value}
        </p>
        {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  )
}

export default Monitor
