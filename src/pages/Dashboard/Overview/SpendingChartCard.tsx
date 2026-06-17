import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { Loading03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
// ── Types ─────────────────────────────────────────────────────────────────────

type Provider = "all" | "openai" | "anthropic" | "google"
type Period = 7 | 14 | 30
type ChartType = "bar" | "line"

interface DayCost {
  date: string        // YYYY-MM-DD — used as XAxis key
  label: string       // formatted e.g. "May 20"
  all: number
  openai: number
  anthropic: number
  google: number
}

// Daily spend already aggregated by provider on the server. The chart pulls
// this (≤30 rows) instead of ~1000 fully-joined trace rows.
interface SpendingDay {
  date: string
  all: number
  openai: number
  anthropic: number
  google: number
  other: number
}
interface SpendingResponse {
  days: SpendingDay[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateDateRange(days: number): { date: string; label: string }[] {
  const result = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    const date = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
      ...(days === 7 ? { weekday: "short" } : {}),
    })
    result.push({ date, label })
  }
  return result
}

function formatUSD(v: number): string {
  if (v === 0) return "$0"
  if (v < 0.001) return "<$0.001"
  if (v < 0.01) return `$${v.toFixed(3)}`
  if (v < 1) return `$${v.toFixed(2)}`
  if (v < 100) return `$${v.toFixed(2)}`
  return `$${v.toFixed(0)}`
}

// ── Chart config ──────────────────────────────────────────────────────────────

const CHART_CONFIG = {
  all:       { label: "All models",  color: "grey" },
  openai:    { label: "OpenAI",      color: "#10b981" },
  anthropic: { label: "Anthropic",   color: "#f97316" },
  google:    { label: "Google",      color: "#3b82f6" },
} satisfies ChartConfig

// ── Card ──────────────────────────────────────────────────────────────────────

export function SpendingChartCard() {
  const [spending, setSpending] = useState<SpendingDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>(30)
  const [chartType, setChartType] = useState<ChartType>("line")
  const [provider, setProvider] = useState<Provider>("all")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Server returns the full 30-day window pre-aggregated by provider; the
        // period toggle just slices it client-side, so no refetch on change.
        const data = await authFetch<SpendingResponse>("/api/v1/traces/spending?days=30")
        if (!cancelled) setSpending(data.days)
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.detail : "Failed to load spending data")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const chartData = useMemo<DayCost[]>(() => {
    const dateRange = generateDateRange(period)
    const byDate: Record<string, DayCost> = {}
    for (const { date, label } of dateRange) {
      byDate[date] = { date, label, all: 0, openai: 0, anthropic: 0, google: 0 }
    }
    for (const d of spending) {
      const slot = byDate[d.date]
      if (!slot) continue
      slot.all += d.all
      slot.openai += d.openai
      slot.anthropic += d.anthropic
      slot.google += d.google
    }
    return dateRange.map(({ date }) => byDate[date])
  }, [spending, period])

  const totalSpend = useMemo(
    () => chartData.reduce((s, d) => s + d[provider], 0),
    [chartData, provider],
  )

  const activeColor = CHART_CONFIG[provider].color

  const PROVIDERS: { key: Provider; label: string }[] = [
    { key: "all",       label: "All models" },
    { key: "openai",    label: "OpenAI" },
    { key: "anthropic", label: "Anthropic" },
    { key: "google",    label: "Google" },
  ]

  const PERIODS: { key: Period; label: string }[] = [
    { key: 7,  label: "7D" },
    { key: 14, label: "14D" },
    { key: 30, label: "30D" },
  ]

  const allZero = chartData.every((d) => d[provider] === 0)

  // Show fewer x-axis ticks for longer periods
  const tickInterval = period === 7 ? 0 : period === 14 ? 1 : 4

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <CardTitle className="text-base">Spending</CardTitle>
            {!loading && !error ? (
              <span className="font-mono text-sm font-semibold">
                {formatUSD(totalSpend)}
              </span>
            ) : null}
            {!loading && !error ? (
              <span className="text-xs text-muted-foreground">last {period} days</span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {/* Chart type toggle */}
            <div className="flex rounded-md border border-border/60 bg-muted/30 p-0.5">
              {(["line", "bar"] as ChartType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setChartType(t)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                    chartType === t
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Period selector */}
            <div className="flex rounded-md border border-border/60 bg-muted/30 p-0.5">
              {PERIODS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPeriod(key)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    period === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Provider filter */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {PROVIDERS.map(({ key, label }) => {
            const active = provider === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setProvider(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  active
                    ? "border-transparent text-white"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
                style={active ? { backgroundColor: CHART_CONFIG[key].color } : undefined}
              >
                {key !== "all" ? (
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: active ? "white" : CHART_CONFIG[key].color }}
                  />
                ) : null}
                {label}
              </button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className="pb-4 pt-0">
        {loading ? (
          <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
            <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-destructive">{error}</p>
        ) : allZero ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No spending recorded in the last {period} days
            {provider !== "all" ? ` for ${PROVIDERS.find((p) => p.key === provider)?.label}` : ""}.
          </div>
        ) : (
          <ChartContainer config={CHART_CONFIG} className="h-48 w-full">
            {chartType === "bar" ? (
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.06} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.45 }}
                  interval={tickInterval}
                />
                <YAxis
                  tickFormatter={formatUSD}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.45 }}
                  width={52}
                />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatUSD(Number(value))}
                      labelKey="label"
                    />
                  }
                  cursor={{ fill: "currentColor", fillOpacity: 0.04 }}
                />
                <Bar
                  dataKey={provider}
                  fill={activeColor}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.06} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.45 }}
                  interval={tickInterval}
                />
                <YAxis
                  tickFormatter={formatUSD}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.45 }}
                  width={52}
                />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatUSD(Number(value))}
                      labelKey="label"
                    />
                  }
                />
                <Line
                  dataKey={provider}
                  stroke={activeColor}
                  strokeWidth={2}
                  dot={{ r: 3, fill: activeColor, strokeWidth: 0 }}
                  activeDot={{ r: 4.5, fill: activeColor, strokeWidth: 0 }}
                  type="monotone"
                />
              </LineChart>
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
