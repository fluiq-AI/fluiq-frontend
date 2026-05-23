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
import type { TraceListResponse } from "@/pages/Dashboard/Traces/utils/types"

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectProvider(model: unknown): "openai" | "anthropic" | "google" | "other" {
  if (typeof model !== "string" || !model) return "other"
  const m = model.toLowerCase()
  if (m.startsWith("gpt-") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4") || m.startsWith("text-embedding") || m.includes("openai")) return "openai"
  if (m.startsWith("claude-") || m.includes("anthropic")) return "anthropic"
  if (m.startsWith("gemini-") || m.includes("google")) return "google"
  return "other"
}

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
  const [traces, setTraces] = useState<TraceListResponse["traces"]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>(30)
  const [chartType, setChartType] = useState<ChartType>("line")
  const [provider, setProvider] = useState<Provider>("all")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await authFetch<TraceListResponse>("/api/v1/traces?limit=1000")
        if (!cancelled) setTraces(data.traces)
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
    for (const t of traces) {
      if (!t.cost || t.cost <= 0) continue
      const date = t.ingested_at.slice(0, 10)
      if (!byDate[date]) continue
      const prov = detectProvider(t.event["model"])
      byDate[date].all += t.cost
      if (prov !== "other") byDate[date][prov] += t.cost
    }
    return dateRange.map(({ date }) => byDate[date])
  }, [traces, period])

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
