"use client"

/**
 * Score the judge against the humans.
 *
 * The matrix above answers "do people and judges disagree?" across everything.
 * This answers the sharper question for one metric: is this particular judge
 * measuring what my reviewers measure — and if not, in which direction is it
 * wrong.
 *
 * The verdict sentence comes from the API rather than being assembled here. The
 * failure mode this whole panel exists to catch is a high agreement number on
 * an imbalanced dataset, and that reading has to be identical everywhere it is
 * shown or someone will quote the number without it.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon, BalanceScaleIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { authFetch } from "@/lib/authFetch"
import { Card, CardContent } from "@/components/ui/card"
import { SearchSelect } from "@/components/SearchSelect"

interface MetricRef {
  metric: string
  scored: number
  traces: number
}

interface Disagreement {
  trace_id: string
  judge: number
  human: number
  gap: number
  direction: "lenient" | "harsh"
  preview: string
  comment: string
}

interface Agreement {
  judge_metric: string
  human_field: string | null
  compared: number
  agreement: number | null
  correlation: number | null
  mean_error: number | null
  bias: number | null
  verdict: string
  detail: string
  disagreements: Disagreement[]
}

/** Colour per verdict. `matches_base_rate` is styled as loudly as an outright
 *  failure because it *is* one — it just wears a passing number. */
const TONE: Record<string, string> = {
  good:              "border-emerald-500/30 bg-emerald-500/5",
  mixed:             "border-border/60 bg-muted/30",
  lenient:           "border-amber-500/40 bg-amber-500/10",
  harsh:             "border-amber-500/40 bg-amber-500/10",
  weak:              "border-destructive/30 bg-destructive/5",
  matches_base_rate: "border-destructive/30 bg-destructive/5",
  undetermined:      "border-border/60 bg-muted/30",
  insufficient:      "border-border/60 bg-muted/30",
  no_data:           "border-border/60 bg-muted/30",
}

const VERDICT_LABEL: Record<string, string> = {
  good:              "Trustworthy",
  mixed:             "Directionally right",
  lenient:           "Too lenient",
  harsh:             "Too harsh",
  weak:              "Not measuring this",
  matches_base_rate: "Guessing the common answer",
  undetermined:      "Can't tell yet",
  insufficient:      "Not enough labels",
  no_data:           "Nothing to compare",
}

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`)
const num = (v: number | null) => (v === null ? "—" : v.toFixed(2))

export function JudgeAgreement({ hours }: { hours: string }) {
  const [judgeMetrics, setJudgeMetrics] = useState<MetricRef[]>([])
  const [humanFields, setHumanFields] = useState<MetricRef[]>([])
  const [judge, setJudge] = useState("")
  const [field, setField] = useState("")
  const [result, setResult] = useState<Agreement | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let live = true
    authFetch<{ judge_metrics: MetricRef[]; human_fields: MetricRef[] }>(
      `/api/v1/review/labelled-metrics?hours=${hours}`,
    )
      .then((data) => {
        if (!live) return
        setJudgeMetrics(data.judge_metrics ?? [])
        setHumanFields(data.human_fields ?? [])
        // Default to the metric with the most coverage — the one most likely to
        // produce an answer, so the panel opens showing something rather than
        // an empty state that has to be configured before it says anything.
        setJudge((prev) => prev || data.judge_metrics?.[0]?.metric || "")
      })
      // A failure here leaves the pickers empty, which reads correctly as
      // "nothing to compare". The queue below is the page's actual job and must
      // not be taken down by this panel.
      .catch(() => undefined)
    return () => { live = false }
  }, [hours])

  const load = useCallback(async () => {
    if (!judge) { setResult(null); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({ judge_metric: judge, hours })
      if (field) params.set("human_field", field)
      setResult(await authFetch<Agreement>(`/api/v1/review/judge-agreement?${params}`))
    } catch {
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [judge, field, hours])

  useEffect(() => { void load() }, [load])

  const fieldOptions = useMemo(
    () => [
      { value: "", label: "All human labels" },
      ...humanFields.map((f) => ({
        value: f.metric,
        label: `${f.metric} · ${f.traces} rated`,
      })),
    ],
    [humanFields],
  )

  if (judgeMetrics.length === 0) return null

  return (
    <Card>
      <CardContent className="px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <HugeiconsIcon icon={BalanceScaleIcon} className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Is the judge any good?</p>
          <p className="text-[11px] text-muted-foreground">
            Run against the examples people already graded.
          </p>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-52">
              <SearchSelect
                value={judge}
                onChange={setJudge}
                options={judgeMetrics.map((m) => ({
                  value: m.metric,
                  label: `${m.metric} · ${m.traces} scored`,
                }))}
                placeholder="Judge metric"
              />
            </div>
            <div className="w-52">
              <SearchSelect
                value={field}
                onChange={setField}
                options={fieldOptions}
                placeholder="Human label"
                searchable={false}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : !result ? null : (
          <>
            <div className={cn("rounded-lg border px-3 py-2.5", TONE[result.verdict] ?? TONE.mixed)}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-medium text-foreground">
                  {VERDICT_LABEL[result.verdict] ?? result.verdict}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {result.compared} labelled example{result.compared === 1 ? "" : "s"}
                </p>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {result.detail}
              </p>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Agreement" value={pct(result.agreement)}
                    hint="Same side of the pass mark" />
              <Stat label="Correlation" value={num(result.correlation)}
                    hint="Moves with the humans" />
              <Stat label="Mean error" value={num(result.mean_error)}
                    hint="Average distance per example" />
              <Stat
                label="Bias"
                value={result.bias === null ? "—" : `${result.bias > 0 ? "+" : ""}${result.bias.toFixed(2)}`}
                hint={
                  result.bias === null ? "—"
                    : result.bias > 0.02 ? "Scores higher than people"
                    : result.bias < -0.02 ? "Scores lower than people"
                    : "Centred on the humans"
                }
              />
            </div>

            {result.disagreements.length > 0 ? (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-medium text-foreground">
                  Where it disagrees
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    the rows to read before rewriting the prompt
                  </span>
                </p>
                <div className="divide-y divide-border/60 rounded-lg border border-border/60">
                  {result.disagreements.slice(0, 8).map((row) => (
                    <div key={row.trace_id} className="px-3 py-2">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={cn(
                            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                            row.direction === "lenient"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {row.direction}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                          judge {pct(row.judge)} · human {pct(row.human)}
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {row.comment || row.preview}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-base font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  )
}

export default JudgeAgreement
