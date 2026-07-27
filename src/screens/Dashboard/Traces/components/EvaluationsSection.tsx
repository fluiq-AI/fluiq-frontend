import { useState, type ReactNode } from "react"
import { Link } from "react-router"
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { authFetch } from "@/lib/authFetch"
import { cn } from "@/lib/utils"
import type { EvaluationScore, JudgePromptUsage } from "../utils/types"
import { formatScore, scoreBandClass } from "../utils"
import { TraceEvalConfig } from "./TraceEvalConfig"

interface LocalAnnotation {
  value: boolean
  comment: string
}

function AnnotateBar({ traceId, rootTraceId }: { traceId: string; rootTraceId?: string }) {
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<LocalAnnotation[]>([])

  async function annotate(value: boolean) {
    if (busy) return
    setBusy(true)
    try {
      await authFetch(`/api/v1/traces/${traceId}/annotations`, {
        method: "POST",
        body: {
          value,
          root_trace_id: rootTraceId,
          comment: comment.trim() || undefined,
        },
      })
      setSaved((prev) => [...prev, { value, comment: comment.trim() }])
      setComment("")
      toast.success("Annotation recorded.")
    } catch {
      toast.error("Could not save the annotation.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-xs font-medium text-foreground">Your verdict</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional note…"
          className="h-7 min-w-0 flex-1 rounded-md border border-border/60 bg-background px-2 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => annotate(true)}
          title="Looks good"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition hover:bg-emerald-500/10 hover:text-emerald-600 disabled:opacity-50 dark:hover:text-emerald-400"
        >
          <HugeiconsIcon icon={ThumbsUpIcon} size={14} />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => annotate(false)}
          title="Something's wrong"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          <HugeiconsIcon icon={ThumbsDownIcon} size={14} />
        </button>
      </div>
      {saved.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {saved.map((a, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <HugeiconsIcon
                icon={a.value ? ThumbsUpIcon : ThumbsDownIcon}
                size={12}
                className={cn(
                  "mt-0.5 shrink-0",
                  a.value ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                )}
              />
              <span>{a.comment || (a.value ? "Looks good" : "Flagged")}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function EvaluationsSection({
  evaluations,
  traceId,
  rootTraceId,
  isMulti = false,
  prompt = "",
  response = "",
  toolContext = "",
}: {
  evaluations: EvaluationScore[] | undefined
  traceId?: string
  rootTraceId?: string
  /** Multi-node / multi-agent run → agentic config; else single-trace metrics. */
  isMulti?: boolean
  /** The trace's input, for single-trace metric scoring. */
  prompt?: string
  /** The trace's answer, for single-trace metric scoring. */
  response?: string
  /** Tool/MCP outputs from this run, fed to the judge as grounding. */
  toolContext?: string
}) {
  const button = traceId ? (
    <TraceEvalConfig
      traceId={traceId}
      rootTraceId={rootTraceId}
      isMulti={isMulti}
      prompt={prompt}
      response={response}
      toolContext={toolContext}
      evaluations={evaluations}
    />
  ) : null
  const annotate = traceId ? <AnnotateBar traceId={traceId} rootTraceId={rootTraceId} /> : null

  if (!evaluations || evaluations.length === 0) {
    return (
      <div className="space-y-3">
        {button}
        {annotate}
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
      {annotate}
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
  const isHuman = evaluator.startsWith("human.")
  const humanComment =
    isHuman && details && typeof details.comment === "string" ? details.comment : null

  if (isHuman) {
    const up = typeof score === "number" && score >= 0.5
    return (
      <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon
                icon={up ? ThumbsUpIcon : ThumbsDownIcon}
                size={13}
                className={cn(
                  "shrink-0",
                  up ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                )}
              />
              <span className="truncate font-mono text-[11px] text-foreground">{metric}</span>
              <span className="rounded bg-blue-500/10 px-1 py-0.5 text-[9px] font-medium text-blue-600 dark:text-blue-400">
                {evaluator === "human.feedback" ? "end user" : "team"}
              </span>
            </div>
            {humanComment ? (
              <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {humanComment}
              </div>
            ) : null}
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
      </div>
    )
  }

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
  const judgePrompts =
    details && Array.isArray(details.judge_prompts) ? details.judge_prompts : null

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

      {/* The exact judge prompt(s) that produced this score */}
      {judgePrompts && judgePrompts.length > 0 ? (
        <JudgePromptsBlock prompts={judgePrompts} />
      ) : null}
    </div>
  )
}

const PROMPT_SOURCE_LABEL: Record<JudgePromptUsage["source"], string> = {
  org: "customized",
  platform: "platform",
  default: "default",
  custom: "custom judge",
}

function JudgePromptsBlock({ prompts }: { prompts: JudgePromptUsage[] }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="mt-2 rounded border border-border/60 bg-background/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-left"
      >
        <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          Judge prompt{prompts.length > 1 ? "s" : ""}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {open ? "Hide" : `Show (${prompts.length})`}
        </span>
      </button>
      {open ? (
        <div className="space-y-1.5 border-t border-border/60 px-2 py-1.5">
          {prompts.map((p) => (
            <div key={p.name} className="rounded border border-border/40">
              <button
                type="button"
                onClick={() => setExpanded(expanded === p.name ? null : p.name)}
                className="flex w-full items-center justify-between gap-2 px-2 py-1 text-left"
              >
                <span className="min-w-0 truncate font-mono text-[10px] text-foreground">
                  {p.name}
                  {typeof p.version === "number" && p.version > 0 ? (
                    <span className="text-muted-foreground"> v{p.version}</span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {p.calls && p.calls > 1 ? (
                    <span className="text-[9px] text-muted-foreground">×{p.calls}</span>
                  ) : null}
                  <span
                    className={cn(
                      "rounded px-1 py-0.5 text-[9px] font-medium",
                      p.source === "org" || p.source === "custom"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {PROMPT_SOURCE_LABEL[p.source] ?? p.source}
                  </span>
                </span>
              </button>
              {expanded === p.name && p.rendered ? (
                <div className="border-t border-border/40 px-2 py-1.5">
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-muted-foreground">
                    {p.rendered}
                    {p.truncated ? "\n… (truncated)" : ""}
                  </pre>
                </div>
              ) : null}
            </div>
          ))}
          <p className="px-1 pb-0.5 text-[9px] text-muted-foreground">
            Not what you want the judge to ask?{" "}
            <Link
              to="/dashboard/judge-prompts"
              className="text-foreground underline-offset-2 hover:underline"
            >
              Customize judge prompts →
            </Link>
          </p>
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
