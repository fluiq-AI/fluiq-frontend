import { useCallback, useEffect, useState } from "react"
import {
  Alert02Icon,
  ArrowDown01Icon,
  CpuIcon,
  Image01Icon,
  Loading03Icon,
  RoboticIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { authFetch } from "@/lib/authFetch"

// ── Types (mirror routes/datasets `_trajectory_summary`) ────────────────────────

interface TrajTool {
  name:      string
  kind:      "tool" | "mcp"
  server:    string | null
  arguments: string | null
  output:    string | null
}

interface TrajStep {
  trace_id:    string
  depth:       number
  type:        string
  name:        string | null
  agent:       string | null
  model:       string | null
  integration: string | null
  latency:     number | null
  input:       string | null
  output:      string | null
  tool_calls:  TrajTool[]
  media:       { kind: string | null; mime: string | null }[]
  success:     boolean | null
  error:       string | null
}

interface TrajStats {
  spans:  number
  tools:  number
  mcp:    number
  agents: string[]
  models: string[]
  types:  Record<string, number>
}

interface TrajResponse {
  trace_id:       string | null
  has_trajectory: boolean
  stats:          TrajStats
  steps:          TrajStep[]
}

// ── Per-type colour (badge) ────────────────────────────────────────────────────

const TYPE_PILL: Record<string, string> = {
  llm:       "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  chain:     "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  agent:     "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  task:      "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  crew:      "bg-purple-500/15 text-purple-600 dark:text-purple-300",
  tool:      "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  mcp:       "bg-teal-500/15 text-teal-600 dark:text-teal-300",
  retrieval: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
}

function typePill(type: string): string {
  return TYPE_PILL[type] ?? "bg-muted text-muted-foreground"
}

// ── A single step row (expandable IO) ───────────────────────────────────────────

function StepRow({ step }: { step: TrajStep }) {
  const [open, setOpen] = useState(false)
  const hasDetail =
    !!step.input || !!step.output || step.tool_calls.length > 0 || !!step.error
  const indent = Math.min(step.depth, 6) * 14

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        type="button"
        disabled={!hasDetail}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 py-1.5 pr-2 text-left transition-colors",
          hasDetail && "hover:bg-muted/40",
        )}
        style={{ paddingLeft: 8 + indent }}
      >
        <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide", typePill(step.type))}>
          {step.type}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">
          {step.name || <span className="text-muted-foreground/60">{step.type} call</span>}
        </span>
        {step.agent && step.agent !== step.name ? (
          <span className="hidden shrink-0 items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-600 dark:text-emerald-300 sm:inline-flex">
            <HugeiconsIcon icon={RoboticIcon} size={9} />
            {step.agent}
          </span>
        ) : null}
        {step.tool_calls.map((t, i) => (
          <span
            key={i}
            className={cn(
              "hidden shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] sm:inline-flex",
              t.kind === "mcp" ? typePill("mcp") : typePill("tool"),
            )}
          >
            <HugeiconsIcon icon={t.kind === "mcp" ? CpuIcon : Wrench01Icon} size={9} />
            {t.name}
          </span>
        ))}
        {step.media.length > 0 ? (
          <span className="hidden shrink-0 items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground sm:inline-flex">
            <HugeiconsIcon icon={Image01Icon} size={9} />
            {step.media.length}
          </span>
        ) : null}
        {step.model ? (
          <span className="hidden shrink-0 font-mono text-[9px] text-muted-foreground/60 md:inline">
            {step.model}
          </span>
        ) : null}
        {step.latency != null ? (
          <span className="shrink-0 font-mono text-[9px] text-muted-foreground/50">
            {step.latency.toFixed(2)}s
          </span>
        ) : null}
        {hasDetail ? (
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={10}
            className={cn("shrink-0 text-muted-foreground/40 transition-transform", open && "rotate-180")}
          />
        ) : (
          <span className="w-2.5 shrink-0" />
        )}
      </button>

      {open && hasDetail ? (
        <div className="space-y-2 px-3 pb-2.5" style={{ paddingLeft: 8 + indent + 20 }}>
          {step.input ? (
            <IOBlock label="Input" text={step.input} />
          ) : null}
          {step.tool_calls.length > 0 ? (
            <div className="space-y-1.5">
              {step.tool_calls.map((t, i) => (
                <div key={i} className="rounded border border-border/50 bg-muted/30 p-2">
                  <div className="mb-1 flex items-center gap-1.5">
                    <HugeiconsIcon icon={t.kind === "mcp" ? CpuIcon : Wrench01Icon} size={11} className="text-muted-foreground" />
                    <span className="font-mono text-[10px] font-medium text-foreground">{t.name}</span>
                    {t.kind === "mcp" ? (
                      <span className="rounded bg-teal-500/15 px-1 py-0.5 text-[8px] font-medium uppercase text-teal-600 dark:text-teal-300">
                        MCP{t.server ? ` · ${t.server}` : ""}
                      </span>
                    ) : null}
                  </div>
                  {t.arguments ? (
                    <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-muted-foreground">
                      {t.arguments}
                    </pre>
                  ) : null}
                  {t.output ? (
                    <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded bg-background/60 p-1.5 font-mono text-[10px] leading-relaxed text-foreground/80">
                      → {t.output}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {step.output ? (
            <IOBlock label="Output" text={step.output} />
          ) : null}
          {step.error ? (
            <div className="flex items-start gap-1.5 rounded border border-destructive/30 bg-destructive/10 p-2 text-[10px] text-destructive">
              <HugeiconsIcon icon={Alert02Icon} size={11} className="mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap break-words font-mono">{step.error}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function IOBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/50">{label}</p>
      <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded border border-border/50 bg-muted/30 p-2 font-mono text-[10px] leading-relaxed text-foreground/90">
        {text}
      </pre>
    </div>
  )
}

// ── Trajectory panel ────────────────────────────────────────────────────────────

export function TrajectoryView({
  datasetId,
  exampleId,
}: {
  datasetId: string
  exampleId: string
}) {
  const [data,    setData]    = useState<TrajResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch<TrajResponse>(
        `/api/v1/datasets/${datasetId}/examples/${exampleId}/trajectory`,
      )
      setData(res)
    } catch {
      setError("Couldn't load the trajectory")
    } finally {
      setLoading(false)
    }
  }, [datasetId, exampleId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-1 py-3 text-[11px] text-muted-foreground">
        <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
        Loading trajectory…
      </div>
    )
  }
  if (error) {
    return <p className="px-1 py-2 text-[11px] text-muted-foreground/70">{error}</p>
  }
  if (!data || !data.has_trajectory) {
    return (
      <p className="px-1 py-2 text-[11px] text-muted-foreground/60">
        No pinned trajectory for this example.
      </p>
    )
  }

  const { stats, steps } = data

  return (
    <div className="space-y-2">
      {/* Rollup chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <StatChip label="steps" value={String(stats.spans)} />
        {stats.agents.length > 0 ? (
          <StatChip label={stats.agents.length === 1 ? "agent" : "agents"} value={String(stats.agents.length)} tone="emerald" />
        ) : null}
        {stats.tools > 0 ? <StatChip label="tools" value={String(stats.tools)} tone="amber" /> : null}
        {stats.mcp > 0 ? <StatChip label="MCP" value={String(stats.mcp)} tone="teal" /> : null}
        {stats.models.map((m) => (
          <span key={m} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/70">
            {m}
          </span>
        ))}
      </div>

      {/* Step tree */}
      <div className="overflow-hidden rounded-md border border-border/60 bg-background/40">
        {steps.map((s) => (
          <StepRow key={s.trace_id} step={s} />
        ))}
      </div>
    </div>
  )
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "emerald" | "amber" | "teal"
}) {
  const toneCls =
    tone === "emerald" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
    : tone === "amber" ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
    : tone === "teal"  ? "bg-teal-500/15 text-teal-600 dark:text-teal-300"
    : "bg-muted text-muted-foreground"
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium", toneCls)}>
      <span className="font-mono tabular-nums">{value}</span>
      <span className="uppercase tracking-wide opacity-80">{label}</span>
    </span>
  )
}
