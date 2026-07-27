import { useEffect, useState } from "react"
import {
  JusticeScale01Icon,
  Loading03Icon,
  TextFontIcon,
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
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"

interface JudgeUsageBreakdown {
  evaluator: string
  input_tokens: number
  output_tokens: number
  judge_calls: number
  eval_runs: number
}

interface JudgeUsageResponse {
  window_days: number
  input_tokens: number
  output_tokens: number
  judge_calls: number
  eval_runs: number
  by_evaluator: JudgeUsageBreakdown[]
}

const EVALUATOR_LABELS: Record<string, string> = {
  "fluiq.agent_eval": "Agentic",
  ragas: "RAGAS",
  hallucination: "Hallucination",
}

function evaluatorLabel(id: string) {
  return EVALUATOR_LABELS[id] ?? id
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`
  return n.toLocaleString()
}

export function JudgeUsageCard() {
  const [data, setData] = useState<JudgeUsageResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch<JudgeUsageResponse>(
          "/api/v1/quota/judge-usage?days=30",
        )
        if (!cancelled) setData(res)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load judge usage")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const total = data ? data.input_tokens + data.output_tokens : 0
  // Judge tokens per run is the number that actually separates a cheap eval
  // from an expensive one. A deep jury over a long trajectory can be two
  // orders of magnitude above a single-judge relevance check.
  const perRun = data && data.eval_runs > 0 ? Math.round(total / data.eval_runs) : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={JusticeScale01Icon} size={16} />
            <CardTitle className="text-base">Judge usage</CardTitle>
          </div>
          {data ? <Badge variant="outline">{data.window_days}d</Badge> : null}
        </div>
        <CardDescription>
          Tokens spent by LLM-as-judge evaluations, the part of an eval whose
          cost scales with trace size, jury size, and judge model.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !data ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
            {"Loading…"}
          </p>
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground">
            No judge activity in the last {data.window_days} days. Evaluation is
            opt-in, so call{" "}
            <code className="font-mono text-foreground">fluiq.eval()</code> to
            start reporting.
          </p>
        ) : (
          <>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <HugeiconsIcon icon={TextFontIcon} size={14} />
                  Total tokens
                </span>
                <span className="font-mono text-xs text-foreground">
                  {formatNumber(total)}
                  <span className="text-muted-foreground">
                    {" "}({formatNumber(data.input_tokens)} in /{" "}
                    {formatNumber(data.output_tokens)} out)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Evaluations</span>
                <span className="font-mono text-xs text-foreground">
                  {formatNumber(data.eval_runs)}
                  <span className="text-muted-foreground">
                    {" "}({formatNumber(data.judge_calls)} judge calls)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Avg per evaluation</span>
                <span className="font-mono text-xs text-foreground">
                  {formatNumber(perRun)} tokens
                </span>
              </div>
            </div>

            {data.by_evaluator.length > 1 ? (
              <div className="grid gap-1.5 border-t border-border/60 pt-3">
                {data.by_evaluator.slice(0, 4).map((row) => (
                  <div
                    key={row.evaluator}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="truncate text-muted-foreground">
                      {evaluatorLabel(row.evaluator)}
                    </span>
                    <span className="shrink-0 font-mono text-foreground">
                      {formatNumber(row.input_tokens + row.output_tokens)}
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
