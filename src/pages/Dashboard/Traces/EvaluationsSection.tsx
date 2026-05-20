import { Link } from "react-router"
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
  if (!evaluations || evaluations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="size-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">No evaluations yet</p>
          <p className="text-xs text-muted-foreground">
            Add{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
              fluiq.eval()
            </code>{" "}
            to your setup to score each LLM response on hallucination, relevance, and more.
          </p>
        </div>
        <Link
          to="/documentation#evaluation"
          className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
        >
          Learn about fluiq.eval() →
        </Link>
        <div className="w-full rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-left text-xs text-muted-foreground">
          <p className="mb-1.5 font-medium text-foreground">Quick setup</p>
          <pre className="font-mono leading-relaxed">{`import fluiq

fluiq.instrument(api_key="fl_...")
fluiq.eval(
    metrics=["hallucination", "relevance"],
    thresholds={"hallucination": 0.7, "relevance": 0.6},
    mode="warn",
)`}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {evaluations.map((e, idx) => (
        <EvaluationItem key={`${e.metric}-${idx}`} evaluation={e} />
      ))}
    </div>
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
                  {"·"}
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
