import { useEffect, useState } from "react"
import {
  DatabaseSync01Icon,
  FlashIcon,
  Layers01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"

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

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`
  return n.toLocaleString()
}

function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(rate >= 0.995 ? 0 : 1)}%`
}

export function CacheStatsCard() {
  const [data, setData] = useState<CacheStatsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch<CacheStatsResponse>(
          "/api/v1/optimize/cache-stats?window_hours=24",
        )
        if (!cancelled) setData(res)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load cache stats")
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
            <HugeiconsIcon icon={DatabaseSync01Icon} size={16} />
            <CardTitle className="text-base">Cache</CardTitle>
          </div>
          {data ? (
            <Badge variant="outline">{data.window_hours}h</Badge>
          ) : null}
        </div>
        <CardDescription>
          Hit rate across SDK caches running with{" "}
          <code className="font-mono text-foreground">trace=True</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">{"Loading\u2026"}</p>
        ) : data.hits + data.misses === 0 ? (
          <p className="text-sm text-muted-foreground">
            No cache activity in the last {data.window_hours}h. Pass{" "}
            <code className="font-mono text-foreground">trace=True</code> to{" "}
            <code className="font-mono text-foreground">EmbeddingCache</code>
            {" "}or{" "}
            <code className="font-mono text-foreground">PromptCache</code>
            {" "}to start reporting.
          </p>
        ) : (
          <>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <HugeiconsIcon icon={FlashIcon} size={14} />
                  Hit rate
                </span>
                <span className="font-mono text-xs text-foreground">
                  {formatPct(data.hit_rate)}{" "}
                  <span className="text-muted-foreground">
                    ({formatNumber(data.hits)} / {formatNumber(data.hits + data.misses)})
                  </span>
                </span>
              </div>
              <Progress value={Math.round(data.hit_rate * 100)} />
            </div>

            {data.per_kind.length > 1 ? (
              <div className="grid gap-1.5 border-t border-border/60 pt-3">
                {data.per_kind.map((row) => (
                  <div
                    key={row.kind}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <HugeiconsIcon icon={Layers01Icon} size={12} />
                      {row.kind}
                    </span>
                    <span className="font-mono text-foreground">
                      {formatPct(row.hit_rate)}{" "}
                      <span className="text-muted-foreground">
                        ({formatNumber(row.hits + row.misses)})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
