"use client"

import { useEffect, useMemo, useState } from "react"
import { Cancel01Icon, Loading03Icon, PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { authFetch } from "@/lib/authFetch"
import { metricLabel } from "@/lib/metricLabels"
import { Button } from "@/components/ui/button"
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown"
import { SearchSelect } from "@/components/SearchSelect"
import {
  MissingKeysCallout,
  ProviderKeyDialog,
  missingKeyProviders,
  useProviderKeys,
} from "@/components/ProviderKeys"
import { formatCost } from "@/pages/Dashboard/Traces/utils"
import type { CompareResult, MetricResult, ModelOption } from "../utils/types"
import { ALL_METRICS } from "../utils/types"

/**
 * Right-side drawer for running a prompt across every available model and
 * comparing their output side by side — the Datasets Run-evaluation pattern
 * brought to the Prompts playground. Each model runs on the org's own key for
 * its provider (BYOK); a model whose provider key is missing reports it on its
 * own card. When metrics are selected, the judge scores each model's output so
 * the cards can be compared on quality, not just text.
 */
export function PromptEvalDrawer({
  open,
  onClose,
  promptName,
  templateText,
  modelOptions,
  models,
  onSetModels,
  onRun,
  loading,
  error,
  results,
  context,
  onContextChange,
  selectedMetrics,
  onToggleMetric,
  judgeModel,
  onJudgeModelChange,
}: {
  open: boolean
  onClose: () => void
  promptName: string
  templateText: string
  modelOptions: ModelOption[]
  models: string[]
  onSetModels: (models: string[]) => void
  onRun: () => void
  loading: boolean
  error: string | null
  results: CompareResult[] | null
  context: string
  onContextChange: (v: string) => void
  selectedMetrics: Set<string>
  onToggleMetric: (m: string) => void
  judgeModel: string
  onJudgeModelChange: (m: string) => void
}) {
  const keys = useProviderKeys(open)
  const [addingKeyFor, setAddingKeyFor] = useState<string | null>(null)

  // ── Pairwise / preference: a judge picks the best of the compared outputs ──
  type Pairwise = { winner: string | null; ranking: string[]; reason: string; tie: boolean }
  const [pairwise, setPairwise] = useState<Pairwise | null>(null)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  // A fresh compare run invalidates any previous verdict.
  useEffect(() => {
    setPairwise(null)
    setPwError(null)
  }, [results])

  const rankable = (results ?? []).filter((r) => !r.error && r.output && r.output.trim())

  async function runPairwise() {
    if (rankable.length < 2) return
    setPwLoading(true)
    setPwError(null)
    try {
      const resp = await authFetch<{ result: Pairwise }>("/api/v1/evaluate/pairwise", {
        method: "POST",
        body: {
          prompt: templateText,
          context,
          judge_model: judgeModel,
          candidates: rankable.map((r) => ({ id: r.model, output: r.output })),
        },
      })
      setPairwise(resp.result)
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Pairwise judging failed")
    } finally {
      setPwLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && addingKeyFor === null) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose, addingKeyFor])

  // Resolve a model id to its BYOK provider — from the fetched catalog, with a
  // prefix fallback so a not-yet-loaded list still gates correctly.
  const providerOf = (id: string): string | null => {
    const m = modelOptions.find((o) => o.id === id)
    if (m) return m.provider
    const s = id.toLowerCase()
    if (s.startsWith("claude")) return "anthropic"
    if (s.startsWith("gpt") || s.startsWith("o1") || s.startsWith("o3") || s.startsWith("o4") || s.startsWith("chatgpt")) return "openai"
    if (s.startsWith("gemini")) return "gemini"
    if (s.startsWith("kimi") || s.startsWith("moonshot")) return "moonshot"
    return null
  }

  const providersInUse = useMemo(() => {
    const set = new Set<string>()
    for (const id of models) {
      const p = providerOf(id)
      if (p) set.add(p)
    }
    // The judge runs too when metrics are selected, so its provider needs a key.
    if (selectedMetrics.size > 0 && judgeModel) {
      const p = providerOf(judgeModel)
      if (p) set.add(p)
    }
    return [...set]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models, judgeModel, selectedMetrics, modelOptions])

  const missingProviders = missingKeyProviders(providersInUse, keys)

  if (!open) return null

  const canRun =
    models.length > 0 && templateText.trim().length > 0 && !loading && missingProviders.length === 0
  const scoring = selectedMetrics.size > 0
  const labelFor = (id: string) => modelOptions.find((m) => m.id === id)?.label ?? id

  return (
    <div role="dialog" aria-modal="true" aria-label="Evaluate & compare" className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="flex h-full w-full max-w-5xl flex-col border-l border-border/60 bg-background shadow-xl duration-200 animate-in slide-in-from-right-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-heading text-base font-semibold">Evaluate &amp; compare</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {promptName || "Prompt"} · run across models and compare their output
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Config */}
        <div className="shrink-0 space-y-4 border-b border-border/60 px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Models to compare</p>
              <MultiSelectDropdown
                label="model"
                placeholder="Select models"
                options={modelOptions.map((m) => ({ value: m.id, label: m.label }))}
                selected={models}
                onToggle={(v, on) =>
                  onSetModels(on ? [...models, v] : models.filter((x) => x !== v))
                }
                disabled={loading}
              />
              <p className="text-[11px] text-muted-foreground">
                Each model runs on your own provider key; outputs are shown side by side.
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Judge model</p>
              <SearchSelect
                value={judgeModel}
                onChange={onJudgeModelChange}
                options={modelOptions.map((m) => ({ value: m.id, label: m.label }))}
                placeholder="Select a judge"
                disabled={loading}
                triggerClassName="h-8 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Scores each output on the metrics below, on your key.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">
              Metrics{" "}
              <span className="font-normal text-muted-foreground/60">
                (optional — leave empty to compare output only)
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_METRICS.map((metric) => {
                const active = selectedMetrics.has(metric)
                return (
                  <button
                    key={metric}
                    type="button"
                    onClick={() => onToggleMetric(metric)}
                    disabled={loading}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-primary" : "bg-muted-foreground/30")} />
                    {metricLabel(metric)}
                  </button>
                )
              })}
            </div>
          </div>

          {(selectedMetrics.has("faithfulness") || selectedMetrics.has("context_precision")) ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">
                Context{" "}
                <span className="font-normal text-muted-foreground/60">
                  (retrieved passages faithfulness / context precision are judged against)
                </span>
              </p>
              <textarea
                value={context}
                onChange={(e) => onContextChange(e.target.value)}
                rows={2}
                placeholder="Paste any retrieved context here…"
                className="w-full resize-y rounded-md border border-border/60 bg-background px-3 py-2 font-mono text-xs leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          ) : null}

          <MissingKeysCallout
            providers={missingProviders}
            configured={keys.configured}
            onAdd={setAddingKeyFor}
          />

          {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
        </div>

        {/* Run action */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-5 py-3">
          <span className="text-[11px] text-muted-foreground">
            {models.length === 0
              ? "Pick at least one model."
              : missingProviders.length > 0
                ? "Add the missing provider key above to run."
                : `${models.length} model${models.length === 1 ? "" : "s"} selected` +
                  (scoring ? ` · scoring ${selectedMetrics.size} metric${selectedMetrics.size === 1 ? "" : "s"}` : "") +
                  "."}
          </span>
          <div className="flex items-center gap-2">
            {rankable.length >= 2 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={runPairwise}
                disabled={pwLoading || loading}
                title="A judge picks the best answer"
              >
                {pwLoading ? (
                  <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
                ) : (
                  <span aria-hidden>🏆</span>
                )}
                Pick the winner
              </Button>
            ) : null}
            <Button size="sm" onClick={onRun} disabled={!canRun}>
              {loading ? (
                <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
              ) : (
                <HugeiconsIcon icon={PlayIcon} size={13} />
              )}
              Run all
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!results || results.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {loading ? "Running across models…" : "Run to compare each model's output."}
            </p>
          ) : (
            <>
              {pwError ? (
                <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                  {pwError}
                </p>
              ) : pairwise ? (
                <div className="mb-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-[11px]">
                  <span className="font-medium text-foreground">
                    {pairwise.tie || !pairwise.winner
                      ? "Judge verdict: too close to call"
                      : `Judge verdict: 🏆 ${labelFor(pairwise.winner)} wins`}
                  </span>
                  {pairwise.reason ? (
                    <span className="text-muted-foreground"> — {pairwise.reason}</span>
                  ) : null}
                </div>
              ) : null}
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${results.length}, minmax(240px, 1fr))` }}
              >
              {results.map((r) => (
                <div
                  key={r.model}
                  className={cn(
                    "flex flex-col overflow-hidden rounded-md border",
                    pairwise?.winner === r.model ? "border-primary ring-1 ring-primary/40" : "border-border/60",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 bg-muted/40 px-3 py-2">
                    <span className="truncate font-mono text-xs font-semibold">
                      {labelFor(r.model)}
                    </span>
                    {pairwise?.winner === r.model ? (
                      <span className="rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-medium text-primary">
                        🏆 Best
                      </span>
                    ) : null}
                    {r.latency_ms != null ? (
                      <span className="rounded-full bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground">
                        {r.latency_ms < 1000 ? `${r.latency_ms}ms` : `${(r.latency_ms / 1000).toFixed(1)}s`}
                      </span>
                    ) : null}
                    {r.input_tokens != null && r.output_tokens != null ? (
                      <span className="rounded-full bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground">
                        {r.input_tokens.toLocaleString()} in / {r.output_tokens.toLocaleString()} out
                      </span>
                    ) : null}
                    {r.cost_usd != null ? (
                      <span className="ml-auto rounded-full bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground">
                        {formatCost(r.cost_usd, "USD")}
                      </span>
                    ) : null}
                  </div>
                  {r.metrics && r.metrics.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 border-b border-border/60 bg-background px-3 py-2">
                      {r.metrics.map((m) => (
                        <MetricChip key={m.metric} result={m} />
                      ))}
                    </div>
                  ) : null}
                  {r.error ? (
                    <p className="px-3 py-3 text-xs text-destructive">{r.error}</p>
                  ) : (
                    <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words px-3 py-3 font-mono text-xs leading-relaxed text-foreground">
                      {r.output ?? ""}
                    </pre>
                  )}
                </div>
              ))}
              </div>
            </>
          )}
        </div>
      </div>

      <ProviderKeyDialog
        provider={addingKeyFor}
        configured={keys.configured}
        onClose={() => setAddingKeyFor(null)}
        onSaved={() => {
          setAddingKeyFor(null)
          keys.reload()
        }}
      />
    </div>
  )
}

/** Compact per-metric score pill, green when passed and amber when not. */
function MetricChip({ result }: { result: MetricResult }) {
  return (
    <span
      title={result.reason}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        result.passed
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      )}
    >
      <span className="font-mono">{result.metric}</span>
      <span className="font-mono tabular-nums">{result.score.toFixed(2)}</span>
    </span>
  )
}
