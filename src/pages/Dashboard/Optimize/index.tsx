import { useCallback, useEffect, useState } from "react"
import {
  Alert02Icon,
  DatabaseSync01Icon,
  FlashIcon,
  Layers01Icon,
  Loading03Icon,
  MagicWand01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface CacheKindStats {
  kind: string
  hits: number
  misses: number
  calls: number
  hit_rate: number
}

interface CacheStatsResponse {
  window_hours: number
  hits: number
  misses: number
  calls: number
  hit_rate: number
  per_kind: CacheKindStats[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WINDOW_OPTIONS = [
  { label: "1h",  hours: 1   },
  { label: "6h",  hours: 6   },
  { label: "24h", hours: 24  },
  { label: "7d",  hours: 168 },
  { label: "30d", hours: 720 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString()
}

function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(rate >= 0.995 ? 0 : 1)}%`
}

function hitRateTextColor(rate: number) {
  if (rate >= 0.8) return "text-emerald-600 dark:text-emerald-400"
  if (rate >= 0.5) return "text-amber-600 dark:text-amber-400"
  return "text-destructive"
}

function hitRateBarClass(rate: number) {
  if (rate >= 0.8) return "[&>div]:bg-emerald-500"
  if (rate >= 0.5) return "[&>div]:bg-amber-500"
  return "[&>div]:bg-destructive"
}

type InsightLevel = "good" | "warn" | "bad" | "info"

function rateInsight(rate: number): { level: InsightLevel; title: string; body: string } {
  if (rate >= 0.85) return {
    level: "good",
    title: "Excellent hit rate",
    body:  "Your cache is highly effective. Most requests are served without hitting the model.",
  }
  if (rate >= 0.6) return {
    level: "good",
    title: "Good hit rate",
    body:  "Cache is performing well. Review miss patterns on lower-performing cache types to go further.",
  }
  if (rate >= 0.3) return {
    level: "warn",
    title: "Moderate hit rate",
    body:  "There is room to improve. Try tuning cache TTL, improving key normalisation, or pre-warming the cache.",
  }
  return {
    level: "bad",
    title: "Low hit rate",
    body:  "Most requests bypass the cache. Check your cache key strategy, TTL settings, and ensure caches are being reused across requests.",
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

function Optimize() {
  const [windowHours, setWindowHours] = useState(24)
  const [data, setData]               = useState<CacheStatsResponse | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  // Manual refresh — setState calls outside effects are fine.
  const refresh = useCallback(async (hours: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch<CacheStatsResponse>(
        `/api/v1/optimize/cache-stats?window_hours=${hours}`,
      )
      setData(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load cache stats")
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-fetch when windowHours changes. IIFE keeps all setState calls after
  // the first await, satisfying react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch<CacheStatsResponse>(
          `/api/v1/optimize/cache-stats?window_hours=${windowHours}`,
        )
        if (cancelled) return
        setData(res)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.detail : "Failed to load cache stats")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [windowHours])

  const isEmpty   = data != null && data.hits + data.misses === 0
  const hasData   = data != null && !isEmpty
  const showStale = !loading && data != null

  return (
    <>
      <DashboardPageHeader
        title="Optimize"
        description="Cache performance analytics for your SDK-instrumented pipelines."
      />
      <div className="px-6 py-6">
      <div className="mb-4 flex items-center justify-end gap-2">
        <div className="flex items-center rounded-md border border-border/60 bg-muted/40 p-0.5">
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.hours}
              type="button"
              onClick={() => { setWindowHours(opt.hours); setLoading(true) }}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                windowHours === opt.hours
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => refresh(windowHours)} disabled={loading}>
          <HugeiconsIcon icon={loading ? Loading03Icon : RefreshIcon} size={14} className={loading ? "animate-spin" : undefined} />
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
          label="Hit Rate"
          value={hasData ? formatPct(data!.hit_rate) : "—"}
          sub={hasData ? `${formatNumber(data!.hits)} hits saved` : undefined}
          valueClass={hasData ? hitRateTextColor(data!.hit_rate) : undefined}
          loading={loading && !showStale}
        />
        <StatCard
          label="Total Calls"
          value={data ? formatNumber(data.calls) : "—"}
          sub={data ? `over last ${data.window_hours}h` : undefined}
          loading={loading && !showStale}
        />
        <StatCard
          label="Cache Misses"
          value={hasData ? formatNumber(data!.misses) : "—"}
          sub={hasData ? `${formatPct(1 - data!.hit_rate)} miss rate` : undefined}
          valueClass={hasData && data!.misses > 0 ? "text-muted-foreground" : undefined}
          loading={loading && !showStale}
        />
      </div>

      {/* ── Main 2-column layout ── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Cache performance card — 2/3 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={DatabaseSync01Icon} size={16} />
                <CardTitle className="text-base">Cache Performance</CardTitle>
              </div>
              {loading && showStale ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={14}
                  className="animate-spin text-muted-foreground"
                />
              ) : null}
            </div>
            <CardDescription>
              Hit and miss counts from SDK caches instrumented with{" "}
              <code className="font-mono text-foreground">trace=True</code>.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading && !data ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : isEmpty ? (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  No cache activity in the last {data!.window_hours}h.
                </p>
                <p className="text-xs text-muted-foreground">
                  Pass{" "}
                  <code className="font-mono text-foreground">trace=True</code>{" "}
                  to{" "}
                  <code className="font-mono text-foreground">EmbeddingCache</code>
                  {" "}or{" "}
                  <code className="font-mono text-foreground">PromptCache</code>
                  {" "}to start collecting data.
                </p>
              </div>
            ) : data ? (
              <div className="space-y-6">

                {/* Overall hit-rate bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <HugeiconsIcon icon={FlashIcon} size={14} />
                      Overall hit rate
                    </span>
                    <span className={cn("font-mono font-medium", hitRateTextColor(data.hit_rate))}>
                      {formatPct(data.hit_rate)}
                      <span className="ml-1.5 font-normal text-xs text-muted-foreground">
                        {formatNumber(data.hits)} / {formatNumber(data.calls)}
                      </span>
                    </span>
                  </div>
                  <Progress
                    value={Math.round(data.hit_rate * 100)}
                    className={hitRateBarClass(data.hit_rate)}
                  />
                </div>

                {/* Hits-vs-misses stacked bar */}
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Hits vs misses
                  </p>
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${data.hit_rate * 100}%` }}
                      title={`${formatNumber(data.hits)} hits`}
                    />
                    <div
                      className="h-full bg-destructive/50 transition-all duration-500"
                      style={{ width: `${(1 - data.hit_rate) * 100}%` }}
                      title={`${formatNumber(data.misses)} misses`}
                    />
                  </div>
                  <div className="flex items-center gap-5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />
                      Hits — {formatNumber(data.hits)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-sm bg-destructive/50" />
                      Misses — {formatNumber(data.misses)}
                    </span>
                  </div>
                </div>

                {/* Per-kind breakdown */}
                {data.per_kind.length > 0 ? (
                  <div className="space-y-3 border-t border-border/60 pt-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      By cache type
                    </p>
                    {data.per_kind.map((k) => (
                      <div key={k.kind} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <HugeiconsIcon icon={Layers01Icon} size={12} />
                            {k.kind}
                          </span>
                          <span className={cn("font-mono", hitRateTextColor(k.hit_rate))}>
                            {formatPct(k.hit_rate)}
                            <span className="ml-1 text-muted-foreground">
                              ({formatNumber(k.hits)}/{formatNumber(k.calls)})
                            </span>
                          </span>
                        </div>
                        <Progress
                          value={Math.round(k.hit_rate * 100)}
                          className={cn("h-1.5", hitRateBarClass(k.hit_rate))}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Insights card — 1/3 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={MagicWand01Icon} size={16} />
              <CardTitle className="text-base">Insights</CardTitle>
            </div>
            <CardDescription>
              Recommendations based on your cache data.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading && !data ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : isEmpty ? (
              <InsightItem
                level="info"
                title="Enable cache tracing"
                body="Pass trace=True to EmbeddingCache or PromptCache to start collecting performance data here."
              />
            ) : data ? (
              <div className="space-y-4">
                {/* Overall rating */}
                <InsightItem {...rateInsight(data.hit_rate)} />

                {/* Per-kind warnings */}
                {data.per_kind
                  .filter((k) => k.hit_rate < 0.5 && k.calls >= 5)
                  .map((k) => (
                    <InsightItem
                      key={k.kind}
                      level="warn"
                      title={`Low ${k.kind} hit rate`}
                      body={`${k.kind} is at ${formatPct(k.hit_rate)}. Review cache key strategy or increase TTL.`}
                    />
                  ))}

                {/* Per-kind positives */}
                {data.per_kind
                  .filter((k) => k.hit_rate >= 0.8 && k.calls >= 5)
                  .map((k) => (
                    <InsightItem
                      key={k.kind}
                      level="good"
                      title={`${k.kind} is healthy`}
                      body={`Hit rate ${formatPct(k.hit_rate)} — this cache type is working well.`}
                    />
                  ))}

                {/* Tip when only one cache type */}
                {data.per_kind.length <= 1 ? (
                  <InsightItem
                    level="info"
                    title="Add more cache types"
                    body="Instrument both EmbeddingCache and PromptCache to get granular per-type analytics."
                  />
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

      </div>
      </div>
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

const INSIGHT_CONFIG: Record<InsightLevel, { dot: string; titleClass: string }> = {
  good: { dot: "bg-emerald-500", titleClass: "text-emerald-700 dark:text-emerald-400" },
  warn: { dot: "bg-amber-500",   titleClass: "text-amber-700 dark:text-amber-400"   },
  bad:  { dot: "bg-destructive", titleClass: "text-destructive"                      },
  info: { dot: "bg-primary",     titleClass: "text-foreground"                       },
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

export default Optimize
