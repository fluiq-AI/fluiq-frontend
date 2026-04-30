import { CheckmarkCircle02Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import type { EvaluationScore } from "./types"
import { formatScore, scoreBandClass } from "./utils"

export function EvaluationsSection({
  evaluations,
}: {
  evaluations: EvaluationScore[] | undefined
}) {
  if (!evaluations || evaluations.length === 0) return null

  return (
    <section className="border-b border-border/60 px-4 py-3">
      <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Evaluations
      </h3>
      <div className="space-y-2">
        {evaluations.map((e, idx) => (
          <EvaluationItem key={`${e.metric}-${idx}`} evaluation={e} />
        ))}
      </div>
    </section>
  )
}

function EvaluationItem({ evaluation }: { evaluation: EvaluationScore }) {
  const { metric, score, judge_model, evaluator, details } = evaluation
  const reason =
    details && typeof details.reason === "string" ? details.reason : null
  const perChunk =
    details && Array.isArray(details.per_chunk) ? details.per_chunk : null
  const question =
    details && typeof details.question === "string" ? details.question : null

  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-mono text-[11px] text-foreground">
            {metric}
          </div>
          <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {evaluator}
            {judge_model ? (
              <>
                <span className="px-1 text-muted-foreground/60">
                  {"\u00b7"}
                </span>
                <span className="font-mono">{judge_model}</span>
              </>
            ) : null}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
            scoreBandClass(score),
          )}
        >
          {formatScore(score)}
        </span>
      </div>
      {reason ? (
        <div className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          {reason}
        </div>
      ) : null}
      {question ? (
        <div className="mt-1.5 rounded border border-border/60 bg-background/60 px-2 py-1 text-[11px]">
          <div className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            Query
          </div>
          <div className="mt-0.5 wrap-break-word">{question}</div>
        </div>
      ) : null}
      {perChunk && perChunk.length > 0 ? (
        <div className="mt-2">
          <div className="mb-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            Per-chunk
          </div>
          <ul className="space-y-1">
            {perChunk.map((c, i) => (
              <li
                key={`${c.id ?? i}-${i}`}
                className="flex items-center justify-between gap-2 rounded border border-border/60 bg-background/60 px-2 py-1 text-[11px]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {c.useful === true ? (
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      size={12}
                      className="shrink-0 text-emerald-600 dark:text-emerald-400"
                    />
                  ) : c.useful === false ? (
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      size={12}
                      className="shrink-0 text-destructive"
                    />
                  ) : (
                    <span className="size-3 shrink-0 rounded-full border border-border/60" />
                  )}
                  <span className="truncate font-mono text-[10px] text-muted-foreground">
                    {c.id ?? `#${i + 1}`}
                  </span>
                </div>
                {typeof c.score === "number" ? (
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {c.score.toFixed(3)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
