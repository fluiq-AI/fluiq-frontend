import { useEffect, useMemo, useRef, useState } from "react"
import { PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { authFetch } from "@/lib/authFetch"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown"
import { SearchSelect } from "@/components/SearchSelect"
import {
  JudgePicker,
  DEFAULT_JUDGE_SELECTION,
  type JudgeSelection,
} from "@/components/JudgePicker"
import {
  MissingKeysCallout,
  ProviderKeyDialog,
  missingKeyProviders,
  useProviderKeys,
} from "@/components/ProviderKeys"
import { useModels } from "@/lib/useModels"
import { metricLabel } from "@/lib/metricLabels"
import type { EvaluationScore } from "../utils/types"

const METRICS = [
  "hallucination",
  "faithfulness",
  "relevance",
  "toxicity",
  "coherence",
  "completeness",
  // RAG retrieval quality — needs the retrieved context pasted below.
  "context_precision",
] as const

// Metrics that judge the retrieved context, so the context box is required.
const CONTEXT_METRICS = ["faithfulness", "context_precision"]

// Watchdog for the async agentic run: re-enable the button if results never
// stream back so it can't get stuck disabled.
const AGENTIC_EVAL_TIMEOUT_MS = 90_000

interface JudgePrompt {
  slug: string
  name: string
  kind: string
}

/**
 * The Evaluation-tab run configurator, matching the dataset Run-evaluation
 * drawer but scoped to a single trace. A single (non-agentic) trace gets metric
 * + custom-scorer selection scored synchronously on the org's BYOK judge; a
 * multi-node / multi-agent trace gets the agentic depth + jury picker that the
 * worker runs. Both gate the run on the selected judge's provider having a key.
 */
export function TraceEvalConfig({
  traceId,
  rootTraceId,
  isMulti,
  prompt,
  response,
  toolContext = "",
  evaluations,
}: {
  traceId: string
  rootTraceId?: string
  isMulti: boolean
  prompt: string
  response: string
  // Tool/MCP results this run retrieved, fed to the judge as grounding so
  // tool-backed factual claims aren't flagged as hallucinations.
  toolContext?: string
  evaluations?: EvaluationScore[]
}) {
  const models = useModels()
  const keys = useProviderKeys(true)
  const [addingKeyFor, setAddingKeyFor] = useState<string | null>(null)

  // ── Single-trace metric state ──
  const [metrics, setMetrics] = useState<Set<string>>(new Set(["hallucination", "relevance"]))
  const [judgeModel, setJudgeModel] = useState("claude-haiku-4-5")
  const [context, setContext] = useState("")
  const [scorers, setScorers] = useState<JudgePrompt[]>([])
  const [selectedScorers, setSelectedScorers] = useState<Set<string>>(new Set())

  // ── Multi-agent state ──
  const [judgeSel, setJudgeSel] = useState<JudgeSelection>(DEFAULT_JUDGE_SELECTION)

  const [running, setRunning] = useState(false)
  const toastId = useRef<string | number | null>(null)
  const baseline = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load the org's custom judge prompts as selectable scorers (single mode).
  useEffect(() => {
    if (isMulti) return
    ;(async () => {
      try {
        const data = await authFetch<{ prompts: JudgePrompt[] }>("/api/v1/prompts")
        setScorers((data.prompts ?? []).filter((p) => p.kind === "judge"))
      } catch {
        // scorers are optional
      }
    })()
  }, [isMulti])

  // Agentic results arrive async via SSE; count them to detect completion.
  const agenticCount = (evaluations ?? []).filter((e) => e.evaluator === "fluiq.agent_eval").length
  useEffect(() => {
    if (running && isMulti && agenticCount > baseline.current) {
      stop()
      toast.success("Agentic evaluation complete.", { id: toastId.current ?? undefined })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, isMulti, agenticCount])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function stop() {
    setRunning(false)
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  const providerOf = (id: string): string | null => {
    const m = models.find((o) => o.id === id)
    if (m) return m.provider
    const s = id.toLowerCase()
    if (s.startsWith("claude")) return "anthropic"
    if (s.startsWith("gpt") || s.startsWith("o1") || s.startsWith("o3") || s.startsWith("o4") || s.startsWith("chatgpt")) return "openai"
    if (s.startsWith("gemini")) return "gemini"
    if (s.startsWith("kimi") || s.startsWith("moonshot")) return "moonshot"
    return null
  }

  // Providers whose key the run needs: the single judge, or the agentic
  // judge + jury (each a `provider:model` spec). "Server default" (empty) is not
  // gated — the worker resolves it.
  const providersInUse = useMemo(() => {
    const set = new Set<string>()
    if (isMulti) {
      if (judgeSel.judge) set.add(judgeSel.judge.split(":")[0])
      for (const j of judgeSel.jury) set.add(j.split(":")[0])
    } else {
      const p = providerOf(judgeModel)
      if (p) set.add(p)
    }
    return [...set]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMulti, judgeSel, judgeModel, models])

  const missing = missingKeyProviders(providersInUse, keys)

  const canRunSingle =
    !running &&
    missing.length === 0 &&
    response.trim().length > 0 &&
    (metrics.size > 0 || selectedScorers.size > 0)
  const canRunMulti = !running && missing.length === 0

  async function runSingle() {
    if (!canRunSingle) return
    setRunning(true)
    toastId.current = toast.loading("Scoring this trace…")
    try {
      const custom_judges: Record<string, number> = {}
      for (const slug of selectedScorers) custom_judges[slug] = 0.5
      // Ground the judge on what the agent actually retrieved: the tool/MCP
      // outputs from this run, plus anything the user pasted.
      const mergedContext = [context.trim(), toolContext.trim()].filter(Boolean).join("\n\n")
      await authFetch("/api/v1/evaluate/trace-metrics", {
        method: "POST",
        body: {
          trace_id: traceId,
          root_trace_id: rootTraceId,
          prompt,
          response,
          context: mergedContext,
          metrics: Array.from(metrics),
          judge_model: judgeModel,
          custom_judges,
        },
      })
      toast.success("Evaluation complete.", { id: toastId.current ?? undefined })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Evaluation failed.", {
        id: toastId.current ?? undefined,
      })
    } finally {
      setRunning(false)
    }
  }

  async function runMulti() {
    if (!canRunMulti) return
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
      const res = await authFetch<{ ok: boolean; events: number; detail?: string }>(
        "/api/v1/evaluate/agentic",
        {
          method: "POST",
          body: {
            trace_id: traceId,
            root_trace_id: rootTraceId,
            depth: judgeSel.depth,
            judge: judgeSel.judge || undefined,
            jury: judgeSel.jury.length ? judgeSel.jury : undefined,
          },
        },
      )
      if (res.ok) {
        toast.loading(`Evaluating ${res.events} span${res.events === 1 ? "" : "s"} — results streaming in…`, {
          id: toastId.current ?? undefined,
        })
      } else {
        stop()
        toast.error(res.detail || "Could not queue agentic evaluation.", { id: toastId.current ?? undefined })
      }
    } catch (err) {
      stop()
      toast.error(err instanceof Error ? err.message : "Request failed.", { id: toastId.current ?? undefined })
    }
  }

  const gate = (
    <MissingKeysCallout providers={missing} configured={keys.configured} onAdd={setAddingKeyFor} />
  )
  const keyDialog = (
    <ProviderKeyDialog
      provider={addingKeyFor}
      configured={keys.configured}
      onClose={() => setAddingKeyFor(null)}
      onSaved={() => {
        setAddingKeyFor(null)
        keys.reload()
      }}
    />
  )

  if (isMulti) {
    return (
      <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
        <div>
          <p className="text-xs font-medium text-foreground">Agentic evaluation</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Tool &amp; MCP selection · trajectory · multi-agent coordination. Pick the depth and, at
            Deep, the jury that votes within the run.
          </p>
        </div>
        <JudgePicker value={judgeSel} onChange={setJudgeSel} />
        {gate}
        <Button size="sm" className="w-full" onClick={runMulti} disabled={!canRunMulti}>
          {running ? (
            <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <HugeiconsIcon icon={PlayIcon} size={14} />
          )}
          {running ? "Evaluating…" : "Run Agentic Evaluation"}
        </Button>
        {keyDialog}
      </div>
    )
  }

  // ── Single-trace: metric + custom-scorer evaluation ──
  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div>
        <p className="text-xs font-medium text-foreground">Evaluate this answer</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Score the response on metrics and your custom scorers, judged on your own key.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-foreground">Metrics</p>
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map((m) => {
            const active = metrics.has(m)
            return (
              <button
                key={m}
                type="button"
                onClick={() =>
                  setMetrics((prev) => {
                    const next = new Set(prev)
                    if (next.has(m)) next.delete(m)
                    else next.add(m)
                    return next
                  })
                }
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-primary" : "bg-muted-foreground/30")} />
                {metricLabel(m)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-foreground">Judge model</p>
          <SearchSelect
            value={judgeModel}
            onChange={setJudgeModel}
            options={models.map((m) => ({ value: m.id, label: m.label }))}
            placeholder="Select a judge"
            triggerClassName="h-8 text-xs"
          />
        </div>
        {scorers.length > 0 ? (
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-foreground">Custom scorers</p>
            <MultiSelectDropdown
              label="scorer"
              placeholder="None"
              options={scorers.map((s) => ({ value: s.slug, label: s.name }))}
              selected={[...selectedScorers]}
              onToggle={(v, on) =>
                setSelectedScorers((prev) => {
                  const next = new Set(prev)
                  if (on) next.add(v)
                  else next.delete(v)
                  return next
                })
              }
            />
          </div>
        ) : null}
      </div>

      {toolContext ? (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Grounding included</span> — this run&apos;s tool &amp; MCP
          outputs are passed to the judge, so tool-backed facts aren&apos;t flagged as hallucinations.
        </div>
      ) : null}

      {CONTEXT_METRICS.some((m) => metrics.has(m)) ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-foreground">
            Context{" "}
            <span className="font-normal text-muted-foreground/60">
              (for {CONTEXT_METRICS.filter((m) => metrics.has(m)).map(metricLabel).join(" & ")})
            </span>
          </p>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={2}
            placeholder="Paste retrieved context…"
            className="w-full resize-y rounded-md border border-border/60 bg-background px-2 py-1.5 font-mono text-[11px] leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      ) : null}

      {gate}

      <Button size="sm" className="w-full" onClick={runSingle} disabled={!canRunSingle}>
        {running ? (
          <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          <HugeiconsIcon icon={PlayIcon} size={14} />
        )}
        {running ? "Scoring…" : "Run Evaluation"}
      </Button>
      {keyDialog}
    </div>
  )
}
