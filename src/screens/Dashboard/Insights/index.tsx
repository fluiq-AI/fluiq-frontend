import { useCallback, useEffect, useState } from "react"
import {
  Alert02Icon,
  ArrowRight01Icon,
  Coins01Icon,
  Copy01Icon,
  Loading03Icon,
  RefreshIcon,
  RoboticIcon,
  SparklesIcon,
  TimeQuarter02Icon,
  TradeDownIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"

// ── Types (mirror routes/optimize fetch_optimization_insights) ──────────────────

interface TopPrompt {
  model: string
  preview: string
  calls: number
  avg_latency: number
  total_cost: number
  projected_savings: number
}
interface Cacheable {
  total_spend: number
  recoverable_spend: number
  total_calls: number
  recoverable_calls: number
  pct: number
}
interface TopModel {
  model: string
  calls: number
  total_cost: number
  avg_cost: number
  tokens: number
}
interface TopAgent {
  agent_key: string
  agent_kind: string
  integration: string
  runs: number
  total_cost: number
  avg_cost: number
}
interface Slowest {
  model: string
  calls: number
  p50: number
  p95: number
}
interface ErrorHotspot {
  name: string
  calls: number
  errors: number
  error_rate: number
}
interface Downgrade {
  model: string
  suggested: string
  calls: number
  candidate_spend: number
  est_savings: number
  avg_output_tokens: number
}
interface InsightsResponse {
  window_hours: number
  top_prompts: TopPrompt[]
  cacheable: Cacheable
  top_models: TopModel[]
  top_agents: TopAgent[]
  slowest: Slowest[]
  errors: ErrorHotspot[]
  downgrades: Downgrade[]
}

const WINDOW_OPTIONS = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
  { label: "30d", hours: 720 },
]

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmtCost(n: number): string {
  if (n === 0) return "$0"
  if (n < 0.01) return `$${n.toFixed(4)}`
  if (n < 1) return `$${n.toFixed(3)}`
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString()
}
function fmtPct(rate: number): string {
  return `${(rate * 100).toFixed(rate >= 0.995 ? 0 : 1)}%`
}
function projMonthly(recoverable: number, windowHours: number): number {
  if (windowHours <= 0) return 0
  return (recoverable / windowHours) * 720
}

// ── Page ──────────────────────────────────────────────────────────────────────

function Insights() {
  const [data, setData] = useState<InsightsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [windowHours, setWindowHours] = useState(168)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch<InsightsResponse>(
        `/api/v1/optimize/insights?window_hours=${windowHours}`,
      )
      setData(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load insights")
    } finally {
      setLoading(false)
    }
  }, [windowHours])

  useEffect(() => { load() }, [load])

  const c = data?.cacheable
  const monthlySavings = c ? projMonthly(c.recoverable_spend, data!.window_hours) : 0
  const isEmpty =
    !!data &&
    data.top_prompts.length === 0 &&
    data.top_models.length === 0 &&
    (c?.total_calls ?? 0) === 0

  return (
    <>
      <DashboardPageHeader
        title="Insights"
        description="Where your LLM spend, latency, and errors actually go — and the fastest wins to recover them."
      />
      <div className="px-6 py-6 space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-border/60 bg-background p-0.5">
            {WINDOW_OPTIONS.map((w) => (
              <button
                key={w.hours}
                type="button"
                onClick={() => setWindowHours(w.hours)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  windowHours === w.hours
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <HugeiconsIcon icon={loading ? Loading03Icon : RefreshIcon} size={14} className={loading ? "animate-spin" : undefined} />
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <HugeiconsIcon icon={Alert02Icon} size={14} />
            {error}
          </div>
        ) : loading && !data ? (
          <div className="flex items-center gap-2 px-1 py-10 text-sm text-muted-foreground">
            <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
            Analyzing your traces…
          </div>
        ) : isEmpty ? (
          <div className="rounded-md border border-dashed border-border/60 px-6 py-16 text-center">
            <HugeiconsIcon icon={SparklesIcon} size={28} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No LLM activity in this window yet.</p>
            <p className="mt-1 text-[11px] text-muted-foreground/60">
              Instrument your app and traffic will surface cost, latency, and caching insights here.
            </p>
          </div>
        ) : data ? (
          <>
            {/* ── Cacheable-spend headline ── */}
            {c && c.total_calls > 0 ? (
              <Card className="border-emerald-500/30 bg-emerald-500/[0.04]">
                <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/15">
                      <HugeiconsIcon icon={Coins01Icon} size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {fmtPct(c.pct)} of your LLM spend is repeated prompts
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fmtNum(c.recoverable_calls)} of {fmtNum(c.total_calls)} calls are exact repeats — cache them with{" "}
                        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">fluiq.optimize()</code>.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-6 pl-12 sm:pl-0">
                    <div>
                      <p className="font-heading text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {fmtCost(c.recoverable_spend)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60">recoverable · {WINDOW_OPTIONS.find((w) => w.hours === windowHours)?.label}</p>
                    </div>
                    <div>
                      <p className="font-heading text-2xl font-semibold tabular-nums text-foreground">
                        ~{fmtCost(monthlySavings)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60">projected / mo</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* ── Top repeated prompts ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={Copy01Icon} size={16} />
                  <CardTitle className="text-base">Top repeated prompts</CardTitle>
                </div>
                <CardDescription>Identical (model + prompt) calls — your best caching candidates, ranked by frequency.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {data.top_prompts.length === 0 ? (
                  <p className="px-6 pb-6 text-sm text-muted-foreground">No repeated prompts in this window — nice, your traffic is diverse.</p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {data.top_prompts.map((p, i) => (
                      <div key={i} className="flex items-center gap-4 px-6 py-3">
                        <span className="w-5 shrink-0 text-right font-mono text-[11px] text-muted-foreground/50">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-xs text-foreground/90">{p.preview || "(empty prompt)"}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[10px] text-muted-foreground/60">
                            <span className="font-mono">{p.model || "—"}</span>
                            {p.avg_latency > 0 ? <span>{p.avg_latency.toFixed(2)}s avg</span> : null}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-primary">×{fmtNum(p.calls)}</span>
                        </div>
                        <div className="w-24 shrink-0 text-right">
                          <p className="font-mono text-xs tabular-nums text-foreground">{fmtCost(p.total_cost)}</p>
                          <p className="font-mono text-[10px] tabular-nums text-emerald-600 dark:text-emerald-400">save {fmtCost(p.projected_savings)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Cost: models + agents ── */}
            <div className="grid gap-6 lg:grid-cols-2">
              <RankCard
                icon={Coins01Icon}
                title="Most expensive models"
                description="Where the spend concentrates by model."
                rows={data.top_models.map((m) => ({
                  label: m.model || "—",
                  sub: `${fmtNum(m.calls)} calls · ${fmtNum(m.tokens)} tok · ${fmtCost(m.avg_cost)}/call`,
                  value: fmtCost(m.total_cost),
                }))}
                empty="No priced model calls yet."
              />
              <RankCard
                icon={RoboticIcon}
                title="Most expensive agents"
                description="Spend rolled up per agent / chain / graph."
                rows={data.top_agents.map((a) => ({
                  label: a.agent_key || "—",
                  sub: `${a.integration || a.agent_kind} · ${fmtNum(a.runs)} runs · ${fmtCost(a.avg_cost)}/run`,
                  value: fmtCost(a.total_cost),
                }))}
                empty="No agent runs with cost yet."
              />
            </div>

            {/* ── Model-downgrade hints ── */}
            {data.downgrades.length > 0 ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={TradeDownIcon} size={16} />
                    <CardTitle className="text-base">Model-downgrade hints</CardTitle>
                  </div>
                  <CardDescription>
                    Premium models answering with very short outputs — likely simple tasks a cheaper sibling can handle. Verify quality before switching.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/60">
                    {data.downgrades.map((d, i) => (
                      <div key={i} className="flex items-center gap-4 px-6 py-3">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">{d.model}</span>
                          <HugeiconsIcon icon={ArrowRight01Icon} size={13} className="shrink-0 text-muted-foreground/50" />
                          <span className="truncate rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">{d.suggested}</span>
                        </div>
                        <span className="hidden shrink-0 text-[10px] text-muted-foreground/60 sm:inline">
                          {fmtNum(d.calls)} calls · ~{Math.round(d.avg_output_tokens)} out tok
                        </span>
                        <div className="w-24 shrink-0 text-right">
                          <p className="font-mono text-xs tabular-nums text-foreground">{fmtCost(d.candidate_spend)}</p>
                          <p className="font-mono text-[10px] tabular-nums text-emerald-600 dark:text-emerald-400">save ~{fmtCost(d.est_savings)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* ── Performance + reliability ── */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={TimeQuarter02Icon} size={16} />
                    <CardTitle className="text-base">Slowest models</CardTitle>
                  </div>
                  <CardDescription>p95 latency by model (≥5 calls).</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {data.slowest.length === 0 ? (
                    <p className="px-6 pb-6 text-sm text-muted-foreground">Not enough calls to rank latency yet.</p>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {data.slowest.map((s, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 px-6 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs text-foreground">{s.model || "—"}</p>
                            <p className="text-[10px] text-muted-foreground/60">{fmtNum(s.calls)} calls · p50 {s.p50.toFixed(2)}s</p>
                          </div>
                          <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">{s.p95.toFixed(2)}s <span className="text-[10px] text-muted-foreground/60">p95</span></span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={Alert02Icon} size={16} />
                    <CardTitle className="text-base">Error hotspots</CardTitle>
                  </div>
                  <CardDescription>Highest failure rate by function / agent (≥5 calls).</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {data.errors.length === 0 ? (
                    <p className="px-6 pb-6 text-sm text-muted-foreground">No errors in this window. 🎉</p>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {data.errors.map((e, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 px-6 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs text-foreground">{e.name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground/60">{fmtNum(e.errors)} / {fmtNum(e.calls)} failed</p>
                          </div>
                          <span className={cn(
                            "shrink-0 rounded px-1.5 py-0.5 font-mono text-xs tabular-nums font-medium",
                            e.error_rate >= 0.25 ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                          )}>
                            {fmtPct(e.error_rate)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}

// ── Reusable ranked list card ──────────────────────────────────────────────────

function RankCard({
  icon,
  title,
  description,
  rows,
  empty,
}: {
  icon: typeof Coins01Icon
  title: string
  description: string
  rows: { label: string; sub: string; value: string }[]
  empty: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={icon} size={16} />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-6 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{r.label}</p>
                  <p className="truncate text-[10px] text-muted-foreground/60">{r.sub}</p>
                </div>
                <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">{r.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default Insights
