import { useEffect, useState } from "react"
import { Layers01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
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

interface AgenticLayerStat {
  layer: string
  score: number | null
  count: number
}

interface AgenticSummaryResponse {
  window_hours: number
  runs: number
  pass_rate: number | null
  avg_run_score: number | null
  layers: AgenticLayerStat[]
}

const LAYER_LABELS: Record<string, string> = {
  deterministic: "Deterministic",
  tool_selection: "Tool selection",
  trajectory: "Trajectory",
  coordination: "Coordination",
}

function formatPct(rate: number | null): string {
  if (rate === null) return "—"
  return `${(rate * 100).toFixed(rate >= 0.995 ? 0 : 1)}%`
}

export function AgenticEvalCard() {
  const [data, setData] = useState<AgenticSummaryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch<AgenticSummaryResponse>(
          "/api/v1/evaluate/agentic-summary?window_hours=24",
        )
        if (!cancelled) setData(res)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load agentic evals")
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
            <HugeiconsIcon icon={Layers01Icon} size={16} />
            <CardTitle className="text-base">Agentic evals</CardTitle>
          </div>
          {data ? <Badge variant="outline">{data.window_hours}h</Badge> : null}
        </div>
        <CardDescription>
          Tool-selection, trajectory &amp; multi-agent run health.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">{"Loading…"}</p>
        ) : data.runs === 0 ? (
          <p className="text-sm text-muted-foreground">
            No agentic evals in the last {data.window_hours}h. Open a trace and click{" "}
            <span className="font-medium text-foreground">Run Agentic Eval</span> to score it.
          </p>
        ) : (
          <>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                  Run pass rate
                </span>
                <span className="font-mono text-xs text-foreground">
                  {formatPct(data.pass_rate)}{" "}
                  <span className="text-muted-foreground">({data.runs} runs)</span>
                </span>
              </div>
              <Progress value={Math.round((data.pass_rate ?? 0) * 100)} />
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-sm">
              <span className="text-muted-foreground">Avg run score</span>
              <span className="font-mono text-xs text-foreground">
                {data.avg_run_score !== null ? data.avg_run_score.toFixed(3) : "—"}
              </span>
            </div>

            <div className="grid gap-2 border-t border-border/60 pt-3">
              {data.layers
                .filter((l) => l.count > 0)
                .map((l) => (
                  <div key={l.layer} className="grid gap-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {LAYER_LABELS[l.layer] ?? l.layer}
                      </span>
                      <span className="font-mono text-foreground">
                        {l.score !== null ? l.score.toFixed(2) : "—"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground/70"
                        style={{ width: `${Math.round((l.score ?? 0) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
