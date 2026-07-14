import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link } from "react-router"
import { CheckmarkCircle02Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { authFetch } from "@/lib/authFetch"
import { cn } from "@/lib/utils"
import type { EvaluationScore } from "../utils/types"
import { formatScore, scoreBandClass } from "../utils"

interface AgenticEvalResponse {
  ok: boolean
  status: string
  events: number
  detail?: string
}

// Watchdog: if results never stream back, re-enable the button after this so
// it can't get stuck disabled forever.
const AGENTIC_EVAL_TIMEOUT_MS = 90_000

function RunAgenticEvalButton({
  traceId,
  rootTraceId,
  evaluations,
}: {
  traceId: string
  rootTraceId?: string
  evaluations?: EvaluationScore[]
}) {
  const [running, setRunning] = useState(false)
  const toastId = useRef<string | number | null>(null)
  const baseline = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Agentic results arrive via SSE (trace.enriched → evaluations). Track the
  // count so we can tell when this run has produced output.
  const agenticCount = (evaluations ?? []).filter(
    (e) => e.evaluator === "fluiq.agent_eval",
  ).length

  const stop = () => {
    setRunning(false)
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  // Re-enable + confirm once new agentic scores land beyond the baseline.
  useEffect(() => {
    if (running && agenticCount > baseline.current) {
      stop()
      toast.success("Agentic evaluation complete.", { id: toastId.current ?? undefined })
    }
  }, [running, agenticCount])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  async function run() {
    if (running) return
    baseline.current = agenticCount
    setRunning(true)
    toastId.current = toast.loading("Running agentic evaluation…")
    timer.current = setTimeout(() => {
      stop()
      toast.info("Agentic evaluation is taking a while — results will appear as they finish.", {
        id: toastId.current ?? undefined,
      })
    }, AGENTIC_EVAL_TIMEOUT_MS)
    try {
      const res = await authFetch<AgenticEvalResponse>("/api/v1/evaluate/agentic", {
        method: "POST",
        body: { trace_id: traceId, root_trace_id: rootTraceId },
      })
      if (res.ok) {
        toast.loading(
          `Evaluating ${res.events} span${res.events === 1 ? "" : "s"} — results streaming in…`,
          { id: toastId.current ?? undefined },
        )
      } else {
        stop()
        toast.error(res.detail || "Could not queue agentic evaluation.", {
          id: toastId.current ?? undefined,
        })
      }
    } catch (err) {
      stop()
      toast.error(err instanceof Error ? err.message : "Request failed.", {
        id: toastId.current ?? undefined,
      })
    }
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">Agentic evaluation</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Tool selection · trajectory · multi-agent panel
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
            "bg-foreground text-background hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed",
          )}
        >
          {running ? (
            <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : null}
          {running ? "Evaluating…" : "Run Agentic Eval"}
        </button>
      </div>
    </div>
  )
}

export function EvaluationsSection({
  evaluations,
  traceId,
  rootTraceId,
}: {
  evaluations: EvaluationScore[] | undefined
  traceId?: string
  rootTraceId?: string
}) {
  const button = traceId ? (
    <RunAgenticEvalButton traceId={traceId} rootTraceId={rootTraceId} evaluations={evaluations} />
  ) : null

  if (!evaluations || evaluations.length === 0) {
    return (
      <div className="space-y-3">
        {button}
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
    metrics=["hallucination"],
    thresholds={"hallucination": 0.7},
    mode="warn",
)`}</pre>
        </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {button}
      <div className="space-y-2">
        {evaluations.map((e, idx) => (
          <EvaluationItem key={`${e.metric}-${idx}`} evaluation={e} />
        ))}
      </div>
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

  // Agentic (evaluator = "fluiq.agent_eval") detail blocks
  const perCall =
    details && Array.isArray(details.per_call) ? details.per_call : null
  const findings =
    details && details.deterministic && Array.isArray(details.deterministic.findings)
      ? details.deterministic.findings
      : null
  const subgoals =
    details && Array.isArray(details.subgoals) ? details.subgoals : null
  const goalCompletion =
    details && typeof details.goal_completion === "number" ? details.goal_completion : null
  const efficiency =
    details && typeof details.efficiency === "number" ? details.efficiency : null
  const panel =
    details && details.panel && typeof details.panel === "object" ? details.panel : null
  const agents =
    details && Array.isArray(details.agents) ? details.agents : null
  const joins =
    details && Array.isArray(details.joins) ? details.joins : null
  const runPassed =
    details && typeof details.run_passed === "boolean" ? details.run_passed : null

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
            {runPassed !== null ? (
              <span
                className={cn(
                  "ml-1.5 inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium",
                  runPassed
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/15 text-destructive",
                )}
              >
                run {runPassed ? "passed" : "failed"}
              </span>
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

      {/* Agentic: per-tool-call verdicts (tool selection quality) */}
      {perCall && perCall.length > 0 ? (
        <AgenticList label="Tool calls">
          {perCall.map((c, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded border border-border/60 bg-background/60 px-2 py-1 text-[11px]"
            >
              <Verdict ok={c.appropriate !== false} />
              <div className="min-w-0">
                <span className="font-mono text-[10px] text-foreground">
                  {c.tool ?? `#${i}`}
                </span>
                {c.reason ? (
                  <div className="text-[10px] leading-snug text-muted-foreground">{c.reason}</div>
                ) : null}
              </div>
            </li>
          ))}
        </AgenticList>
      ) : null}

      {/* Agentic: deterministic checks (no-LLM schema/allowlist findings) */}
      {findings && findings.length > 0 ? (
        <AgenticList label="Checks">
          {findings.map((f, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded border border-border/60 bg-background/60 px-2 py-1 text-[11px]"
            >
              <span
                className={cn(
                  "mt-1 size-1.5 shrink-0 rounded-full",
                  f.severity === "error" ? "bg-destructive" : "bg-amber-500",
                )}
              />
              <div className="min-w-0">
                <span className="font-mono text-[10px] text-foreground">{f.code}</span>
                {f.tool ? (
                  <>
                    <span className="px-1 text-muted-foreground/60">{"·"}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{f.tool}</span>
                  </>
                ) : null}
                {f.message ? (
                  <div className="text-[10px] leading-snug text-muted-foreground">{f.message}</div>
                ) : null}
              </div>
            </li>
          ))}
        </AgenticList>
      ) : null}

      {/* Agentic: trajectory completion / efficiency + sub-goals */}
      {goalCompletion !== null || efficiency !== null ? (
        <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
          {goalCompletion !== null ? (
            <span>
              Completion{" "}
              <b className="text-foreground">{Math.round(goalCompletion * 100)}%</b>
            </span>
          ) : null}
          {efficiency !== null ? (
            <span>
              Efficiency <b className="text-foreground">{Math.round(efficiency * 100)}%</b>
            </span>
          ) : null}
        </div>
      ) : null}
      {subgoals && subgoals.length > 0 ? (
        <AgenticList label="Sub-goals">
          {subgoals.map((s, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded border border-border/60 bg-background/60 px-2 py-1 text-[11px]"
            >
              <Verdict ok={s.achieved === true} />
              <span className="text-[10px] text-muted-foreground">{s.subgoal ?? `#${i}`}</span>
            </li>
          ))}
        </AgenticList>
      ) : null}

      {/* Agentic: per-agent breakdown (L5 coordination) */}
      {agents && agents.length > 0 ? (
        <AgenticList label="Agents">
          {agents.map((a, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 rounded border border-border/60 bg-background/60 px-2 py-1 text-[11px]"
            >
              <span className="truncate font-mono text-[10px] text-foreground">{a.agent}</span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {a.steps} steps · {a.tool_calls} calls
                {a.errors > 0 ? <span className="text-destructive"> · {a.errors} err</span> : null}
              </span>
            </li>
          ))}
        </AgenticList>
      ) : null}

      {/* Agentic: join hand-off incorporation (L5 coordination) */}
      {joins && joins.length > 0 ? (
        <div className="mt-2 space-y-2">
          {joins.map((j, i) => (
            <div key={i} className="rounded border border-border/60 bg-background/60 px-2 py-1.5">
              <div className="text-[10px] font-medium text-foreground">
                Join <span className="font-mono">{j.join}</span>
              </div>
              <ul className="mt-1 space-y-0.5">
                {j.branches.map((b, bi) => (
                  <li key={bi} className="flex items-start gap-2 text-[10px]">
                    <Verdict ok={b.incorporated} />
                    <div className="min-w-0">
                      <span className="font-mono text-foreground">{b.agent}</span>
                      {b.reason ? (
                        <span className="text-muted-foreground"> — {b.reason}</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {/* Agentic: multi-agent panel eval-trace */}
      {panel ? (
        <div className="mt-2 rounded border border-border/60 bg-background/60 px-2 py-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-medium uppercase tracking-wide text-muted-foreground">
              Panel
            </span>
            <span className="text-muted-foreground">
              {panel.convened
                ? `${panel.votes_pass ?? 0}/${panel.votes_total ?? 0} pass · agree ${
                    typeof panel.agreement === "number"
                      ? Math.round(panel.agreement * 100) + "%"
                      : "—"
                  }`
                : "single judge (confident)"}
            </span>
          </div>
          {panel.members && panel.members.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {panel.members.map((m, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="truncate font-mono text-muted-foreground">
                    {m.role === "primary" ? "★ " : "  "}
                    {m.provider}:{m.model}
                  </span>
                  {typeof m.score === "number" ? (
                    <span className="shrink-0 font-mono text-foreground">{m.score.toFixed(2)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function AgenticList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-2">
      <div className="mb-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <ul className="space-y-1">{children}</ul>
    </div>
  )
}

function Verdict({ ok }: { ok: boolean }) {
  return ok ? (
    <HugeiconsIcon
      icon={CheckmarkCircle02Icon}
      size={12}
      className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
    />
  ) : (
    <HugeiconsIcon
      icon={Cancel01Icon}
      size={12}
      className="mt-0.5 shrink-0 text-destructive"
    />
  )
}
