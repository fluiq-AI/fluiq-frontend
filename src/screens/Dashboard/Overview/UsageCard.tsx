import { useEffect, useState } from "react"
import {
  ChartLineData01Icon,
  TestTube01Icon,
  Activity01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"

interface QuotaCounter {
  used: number
  limit: number | null
}

interface QuotaResponse {
  tier: string
  traces: QuotaCounter
  evaluations: QuotaCounter
  // Trace retention window in days; null = unlimited (paid).
  retention_days: number | null
  // ISO instant an active trial reverts to Free; null when not on a trial.
  trial_ends_at: string | null
}

// Whole days remaining until an ISO instant, floored at 0.
function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`
  return n.toLocaleString()
}

export function UsageCard() {
  const [data, setData] = useState<QuotaResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch<QuotaResponse>("/api/v1/quota")
        if (!cancelled) setData(res)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load usage")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={ChartLineData01Icon} size={16} />
            <CardTitle className="text-base">Usage</CardTitle>
          </div>
          {data ? (
            <div className="flex items-center gap-1.5">
              {data.trial_ends_at ? (
                <Badge variant="secondary">
                  Trial · {daysUntil(data.trial_ends_at)}d left
                </Badge>
              ) : null}
              <Badge variant="outline">{data.tier}</Badge>
            </div>
          ) : null}
        </div>
        <CardDescription>
          {data?.trial_ends_at
            ? `Your ${data.tier} trial reverts to Free in ${daysUntil(data.trial_ends_at)} days.`
            : "Monthly traces and evaluations against your tier's limits."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">{"Loading\u2026"}</p>
        ) : (
          <>
            <UsageRow
              icon={Activity01Icon}
              label="Traces"
              counter={data.traces}
            />
            <UsageRow
              icon={TestTube01Icon}
              label="Evaluations"
              counter={data.evaluations}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function UsageRow({
  icon,
  label,
  counter,
}: {
  icon: typeof Activity01Icon
  label: string
  counter: QuotaCounter
}) {
  const unlimited = counter.limit === null
  const pct = unlimited
    ? 0
    : Math.min(100, Math.round((counter.used / Math.max(1, counter.limit!)) * 100))
  const over = !unlimited && counter.used >= (counter.limit ?? 0)

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <HugeiconsIcon icon={icon} size={14} />
          {label}
        </span>
        <span className="font-mono text-xs">
          {unlimited ? (
            <span className="text-muted-foreground">
              {formatNumber(counter.used)}{" "}
              <span className="text-muted-foreground/60">/ Unlimited</span>
            </span>
          ) : (
            <span className={over ? "text-destructive" : "text-foreground"}>
              {formatNumber(counter.used)}{" "}
              <span className="text-muted-foreground">
                / {formatNumber(counter.limit!)}
              </span>
            </span>
          )}
        </span>
      </div>
      {unlimited ? null : (
        <Progress
          value={pct}
          className={over ? "*:data-[slot=progress-indicator]:bg-destructive" : ""}
        />
      )}
    </div>
  )
}
