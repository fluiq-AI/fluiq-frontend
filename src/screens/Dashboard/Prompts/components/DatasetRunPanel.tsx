"use client"

import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import { Cancel01Icon, Loading03Icon, PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { metricLabel } from "@/lib/metricLabels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown"
import { SearchSelect } from "@/components/SearchSelect"
import {
  MissingKeysCallout,
  ProviderKeyDialog,
  missingKeyProviders,
  useProviderKeys,
} from "@/components/ProviderKeys"
import type { DatasetRef, ModelOption } from "../utils/types"

// Metrics a dataset run can grade with. Mirrors the API's RUN_METRICS; the RAG
// retrieval metrics are absent for the same reason they are absent in the
// Datasets drawer — text examples carry no retrieved context to score against.
const RUN_METRICS = [
  "hallucination", "faithfulness", "relevance",
  "toxicity", "coherence", "completeness",
] as const

const DEFAULT_RUN_METRICS = ["hallucination", "relevance", "completeness"]

// How often a launched run is re-read, and how long we keep asking. Generation
// is a provider call per example, so a large dataset legitimately takes minutes;
// the ceiling only stops the polling, never the run itself, which continues
// server-side and stays readable from the Datasets page.
const POLL_MS = 3000
const POLL_CEILING_MS = 10 * 60 * 1000

interface RunTask {
  template: string
  model: string
  prompt_name?: string | null
  prompt_version?: number | null
}

interface RunSummary {
  total?: number
  completed?: number
  avg_score?: number | null
  metrics?: Record<string, number | null>
  gen_failed?: number
}

interface ReportItem {
  example_id: string
  input?: string | null
  expected_output?: string | null
  output?: string | null
  gen_error?: string | null
  latency_ms?: number | null
  cost_usd?: number | null
  result?: { metric: string; score: number | null }[] | null
}

interface RunReport {
  run: {
    run_id: string
    status: "running" | "complete" | "failed"
    total: number
    task?: RunTask | null
    generated?: number
    gen_failed?: number
  }
  summary: RunSummary
  items: ReportItem[]
}

/** One launched run: the model it tested, and its latest report. */
interface Lane {
  model: string
  runId: string
  report: RunReport | null
  error: string | null
}

function pct(v: number | null | undefined): string {
  return typeof v === "number" ? `${Math.round(v * 100)}%` : "—"
}

function scoreColor(v: number | null | undefined): string {
  if (typeof v !== "number") return "text-muted-foreground"
  if (v >= 0.8) return "text-emerald-600 dark:text-emerald-400"
  if (v >= 0.5) return "text-amber-600 dark:text-amber-400"
  return "text-destructive"
}

function avgOf(item: ReportItem): number | null {
  const scores = (item.result ?? [])
    .map((r) => r.score)
    .filter((s): s is number => typeof s === "number")
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
}

/**
 * Runs the playground's prompt across every example in a dataset, on one or more
 * models, and lays the scores out as a grid: one row per example, one column per
 * model.
 *
 * The single-row playground answers "what does this prompt do?". This answers
 * the question that actually decides a change: "does this prompt score better
 * than the last one, across cases I care about?"
 *
 * It launches real dataset runs rather than a private preview, so every result
 * is durable, comparable, and already in the Datasets history — there is no
 * separate "save this as an experiment" step to forget.
 */
export function DatasetRunPanel({
  open,
  onClose,
  templateText,
  promptName,
  savedPromptId,
  savedPromptVersion,
  modelOptions,
  defaultModels,
  judgeModel,
}: {
  open: boolean
  onClose: () => void
  templateText: string
  promptName: string
  /** When the playground is on a saved prompt, the run pins it by id + version. */
  savedPromptId?: string | null
  savedPromptVersion?: number | null
  modelOptions: ModelOption[]
  defaultModels: string[]
  judgeModel?: string
}) {
  const keys = useProviderKeys(open)
  const [addingKeyFor, setAddingKeyFor] = useState<string | null>(null)

  const [datasets, setDatasets] = useState<DatasetRef[]>([])
  const [datasetsLoading, setDatasetsLoading] = useState(false)
  const [datasetId, setDatasetId] = useState("")
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)

  const [models, setModels] = useState<string[]>(defaultModels.slice(0, 1))
  const [metrics, setMetrics] = useState<string[]>(DEFAULT_RUN_METRICS)
  const [runName, setRunName] = useState("")

  const [lanes, setLanes] = useState<Lane[]>([])
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollStarted = useRef<number>(0)
  // Read inside poll() after its awaits: clearing the timer on close isn't
  // enough on its own, because a poll already in flight would arm the next one
  // after the close had run.
  const liveRef = useRef(open)
  liveRef.current = open

  const chosen = datasets.find((d) => d.dataset_id === datasetId)

  const loadDatasets = useCallback(async () => {
    setDatasetsLoading(true)
    try {
      const data = await authFetch<{ datasets: DatasetRef[] }>("/api/v1/datasets")
      setDatasets(data.datasets)
      // Pre-select when there is only one; picking from a list of one is busywork.
      if (data.datasets.length === 1) setDatasetId(data.datasets[0].dataset_id)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load datasets")
      setDatasets([])
    } finally {
      setDatasetsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadDatasets()
  }, [open, loadDatasets])

  // Polling must stop when the panel closes or unmounts, or it keeps hitting the
  // API for a screen nobody is looking at.
  const stopPolling = useCallback(() => {
    if (pollTimer.current) clearTimeout(pollTimer.current)
    pollTimer.current = null
  }, [])

  useEffect(() => stopPolling, [stopPolling])
  useEffect(() => {
    if (!open) stopPolling()
  }, [open, stopPolling])

  const poll = useCallback(
    async (current: Lane[]) => {
      if (!liveRef.current) return
      const pending = current.filter(
        (l) => !l.error && l.report?.run.status !== "complete" && l.report?.run.status !== "failed",
      )
      if (pending.length === 0) return
      if (Date.now() - pollStarted.current > POLL_CEILING_MS) {
        setError(
          "Still running after 10 minutes — the run continues in the background; " +
            "open it from the dataset to see the result.",
        )
        return
      }

      const updated = await Promise.all(
        current.map(async (lane) => {
          if (lane.error) return lane
          if (lane.report?.run.status === "complete" || lane.report?.run.status === "failed") {
            return lane
          }
          try {
            const report = await authFetch<RunReport>(`/api/v1/datasets/runs/${lane.runId}`)
            return { ...lane, report }
          } catch {
            // A single failed poll is a blip, not a verdict — keep the lane and
            // try again on the next tick.
            return lane
          }
        }),
      )
      if (!liveRef.current) return
      setLanes(updated)
      pollTimer.current = setTimeout(() => poll(updated), POLL_MS)
    },
    [],
  )

  async function createDataset() {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    setError(null)
    try {
      const ds = await authFetch<DatasetRef>("/api/v1/datasets", {
        method: "POST",
        body: { name },
      })
      setDatasets((prev) => [{ ...ds, example_count: 0 }, ...prev])
      setDatasetId(ds.dataset_id)
      setNewName("")
      toast.success(`Created “${name}” — add examples to it, then run.`)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to create dataset")
    } finally {
      setCreating(false)
    }
  }

  async function run() {
    if (!canRun || launching) return
    setLaunching(true)
    setError(null)
    setLanes([])
    stopPolling()
    try {
      // One batch id across the group, matching how the Datasets page launches a
      // multi-model comparison — so these runs are recognisably one experiment.
      const batchId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`

      // The evaluator parses `judge` as "provider:model" and falls back to the
      // server default on anything else — so a bare model id would be silently
      // ignored while this panel implied it was used. Resolve the provider, and
      // send nothing rather than something that will be dropped.
      const judgeProvider = judgeModel
        ? modelOptions.find((m) => m.id === judgeModel)?.provider
        : undefined
      const judgeSpec = judgeProvider ? `${judgeProvider}:${judgeModel}` : undefined

      const created: Lane[] = []
      for (const model of models) {
        // A saved prompt is pinned by id + version so the run stays reproducible
        // after the prompt is edited; an unsaved draft sends its text.
        const task = savedPromptId
          ? { prompt_id: savedPromptId, prompt_version: savedPromptVersion ?? undefined, model }
          : { template: templateText, model }
        const created_run = await authFetch<{ run_id: string }>(
          `/api/v1/datasets/${datasetId}/runs`,
          {
            method: "POST",
            body: {
              kind: "metrics",
              metrics,
              task,
              batch_id: batchId,
              name: runName.trim() || `${promptName || "Prompt"} · ${model}`,
              ...(judgeSpec ? { judge: judgeSpec } : {}),
            },
          },
        )
        created.push({ model, runId: created_run.run_id, report: null, error: null })
      }
      setLanes(created)
      pollStarted.current = Date.now()
      poll(created)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to start the run")
    } finally {
      setLaunching(false)
    }
  }

  if (!open) return null

  // Generation is BYOK: resolve each selected model to its provider and check we
  // hold a key that can pay for it.
  const providersInUse = models
    .map((id) => modelOptions.find((m) => m.id === id)?.provider)
    .filter((p): p is string => Boolean(p))
  const missing = missingKeyProviders(providersInUse, keys)
  const canRun =
    Boolean(datasetId) &&
    models.length > 0 &&
    metrics.length > 0 &&
    templateText.trim().length > 0 &&
    missing.length === 0 &&
    (chosen?.example_count ?? 0) > 0

  // Every example seen across the lanes, in the order the first lane reports
  // them, so the rows stay stable as later models finish.
  const exampleOrder: string[] = []
  const seen = new Set<string>()
  for (const lane of lanes) {
    for (const item of lane.report?.items ?? []) {
      if (!seen.has(item.example_id)) {
        seen.add(item.example_id)
        exampleOrder.push(item.example_id)
      }
    }
  }

  const itemFor = (lane: Lane, exampleId: string) =>
    (lane.report?.items ?? []).find((i) => i.example_id === exampleId)

  const anyRunning = lanes.some(
    (l) => l.report === null || l.report.run.status === "running",
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Run over dataset"
      className="fixed inset-0 z-50 flex"
    >
      <div className="flex-1 bg-black/40" onClick={onClose} />

      <ProviderKeyDialog
        provider={addingKeyFor}
        configured={keys.configured}
        onClose={() => setAddingKeyFor(null)}
        onSaved={() => {
          setAddingKeyFor(null)
          keys.reload()
        }}
      />

      <div className="flex h-full w-full max-w-4xl flex-col border-l border-border/60 bg-background shadow-xl duration-200 animate-in slide-in-from-right-6">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-heading text-base font-semibold">Run over dataset</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Score this prompt against every example, on one or more models.
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

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* ── Dataset ── */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Dataset</p>
            <SearchSelect
              value={datasetId}
              onChange={setDatasetId}
              options={datasets.map((d) => ({
                value: d.dataset_id,
                label: `${d.name} · ${d.example_count} example${d.example_count === 1 ? "" : "s"}`,
              }))}
              placeholder={datasetsLoading ? "Loading…" : "Choose a dataset"}
              emptyText="No datasets yet."
              disabled={datasetsLoading || launching}
            />
            {chosen && chosen.example_count === 0 ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                This dataset has no examples yet. Add some from a trace, an import,
                or the Datasets page.
              </p>
            ) : null}
            <div className="flex items-center gap-2 pt-1">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    createDataset()
                  }
                }}
                placeholder="or create a new dataset"
                className="h-8 text-xs"
                disabled={launching}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!newName.trim() || creating || launching}
                onClick={createDataset}
              >
                {creating ? (
                  <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>

          {/* ── Models ── */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Models to test</p>
            <MultiSelectDropdown
              label="model"
              placeholder="Choose at least one"
              options={modelOptions.map((m) => ({ value: m.id, label: m.label }))}
              selected={models}
              onToggle={(v, on) =>
                setModels((prev) => (on ? [...prev, v] : prev.filter((x) => x !== v)))
              }
              disabled={launching}
            />
            <p className="text-[11px] text-muted-foreground">
              This is the model running your prompt — each becomes a column below.
              It runs on your own provider key.
            </p>
            <MissingKeysCallout
              providers={missing}
              configured={keys.configured}
              onAdd={setAddingKeyFor}
            />
          </div>

          {/* ── Scorers ── */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Score with</p>
            <MultiSelectDropdown
              label="metric"
              placeholder="Choose at least one"
              options={RUN_METRICS.map((m) => ({ value: m, label: metricLabel(m) }))}
              selected={metrics}
              onToggle={(v, on) =>
                setMetrics((prev) => (on ? [...prev, v] : prev.filter((x) => x !== v)))
              }
              disabled={launching}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ds-run-name" className="text-xs font-medium text-foreground">
              Run name <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="ds-run-name"
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              placeholder={`${promptName || "Prompt"} · <model>`}
              className="h-8 text-xs"
              disabled={launching}
            />
          </div>

          {savedPromptId ? (
            <p className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground">
              Pinned to <b className="text-foreground">{promptName}</b>
              {savedPromptVersion ? ` v${savedPromptVersion}` : ""}, so this run stays
              reproducible after the prompt is edited.
            </p>
          ) : (
            <p className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground">
              This draft is unsaved, so the run records the prompt text as it is
              right now. Save the prompt first to pin it to a version.
            </p>
          )}

          {error ? <p className="text-[11px] text-destructive">{error}</p> : null}

          {lanes.length > 0 ? (
            <ResultGrid
              lanes={lanes}
              exampleOrder={exampleOrder}
              itemFor={itemFor}
              expanded={expanded}
              onExpand={(id) => setExpanded((prev) => (prev === id ? null : id))}
            />
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-4">
          <p className="text-[11px] text-muted-foreground">
            {chosen
              ? `${chosen.example_count * Math.max(models.length, 1)} generation${
                  chosen.example_count * Math.max(models.length, 1) === 1 ? "" : "s"
                }, then grading.`
              : "Pick a dataset to begin."}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button size="sm" onClick={run} disabled={!canRun || launching || anyRunning}>
              <HugeiconsIcon
                icon={launching || anyRunning ? Loading03Icon : PlayIcon}
                size={14}
                className={launching || anyRunning ? "animate-spin" : undefined}
              />
              {anyRunning ? "Running…" : "Run"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Examples down, models across. The header carries each model's headline score
 * plus what it cost to get there, because the best-scoring model is often the
 * slowest and dearest — seeing both is what turns a score into a decision.
 */
function ResultGrid({
  lanes,
  exampleOrder,
  itemFor,
  expanded,
  onExpand,
}: {
  lanes: Lane[]
  exampleOrder: string[]
  itemFor: (lane: Lane, exampleId: string) => ReportItem | undefined
  expanded: string | null
  onExpand: (exampleId: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
        Results
      </p>

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[36rem] border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="px-2.5 py-2 text-left font-medium text-muted-foreground">
                Example
              </th>
              {lanes.map((lane) => (
                <LaneHeader key={lane.runId} lane={lane} />
              ))}
            </tr>
          </thead>
          <tbody>
            {exampleOrder.length === 0 ? (
              <tr>
                <td
                  colSpan={lanes.length + 1}
                  className="px-2.5 py-6 text-center text-muted-foreground"
                >
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    size={14}
                    className="mr-1.5 inline animate-spin"
                  />
                  Generating…
                </td>
              </tr>
            ) : (
              exampleOrder.map((exampleId) => {
                const first = itemFor(lanes[0], exampleId)
                const isOpen = expanded === exampleId
                return (
                  <Fragment key={exampleId}>
                    <tr
                      onClick={() => onExpand(exampleId)}
                      className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="max-w-[16rem] truncate px-2.5 py-1.5 text-muted-foreground">
                        {(first?.input || "").slice(0, 90) || exampleId.slice(0, 8)}
                      </td>
                      {lanes.map((lane) => {
                        const item = itemFor(lane, exampleId)
                        const avg = item ? avgOf(item) : null
                        return (
                          <td
                            key={lane.runId}
                            className={cn(
                              "px-2.5 py-1.5 text-center font-mono font-semibold",
                              scoreColor(avg),
                            )}
                          >
                            {item?.gen_error ? (
                              <span
                                className="text-amber-600 dark:text-amber-400"
                                title={item.gen_error}
                              >
                                failed
                              </span>
                            ) : (
                              pct(avg)
                            )}
                          </td>
                        )
                      })}
                    </tr>
                    {isOpen ? (
                      <tr className="border-b border-border/40">
                        <td colSpan={lanes.length + 1} className="bg-muted/20 px-2.5 py-2.5">
                          <div className="space-y-2">
                            <Detail label="Input" value={first?.input} />
                            {first?.expected_output ? (
                              <Detail label="Expected" value={first.expected_output} />
                            ) : null}
                            <div
                              className={cn(
                                "grid gap-2",
                                lanes.length > 1 ? "md:grid-cols-2" : "grid-cols-1",
                              )}
                            >
                              {lanes.map((lane) => {
                                const item = itemFor(lane, exampleId)
                                return (
                                  <Detail
                                    key={lane.runId}
                                    label={lane.model}
                                    value={item?.gen_error ?? item?.output}
                                    tone={item?.gen_error ? "warn" : "normal"}
                                  />
                                )
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LaneHeader({ lane }: { lane: Lane }) {
  const summary = lane.report?.summary
  const run = lane.report?.run
  const items = lane.report?.items ?? []

  const generated = items.filter((i) => i.output != null)
  const costs = generated
    .map((i) => i.cost_usd ?? 0)
    .reduce((a, b) => a + b, 0)
  const latencies = generated
    .map((i) => i.latency_ms)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b)
  const p50 = latencies.length ? latencies[Math.floor(latencies.length / 2)] : null

  return (
    <th className="min-w-[7rem] px-2.5 py-2 text-center align-top font-medium">
      <span className="block font-mono text-[10px] text-foreground">{lane.model}</span>
      <span className={cn("mt-0.5 block font-mono text-sm", scoreColor(summary?.avg_score))}>
        {pct(summary?.avg_score)}
      </span>
      <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
        {run && run.status === "running"
          ? `${run.generated ?? 0}/${run.total} generated`
          : [
              p50 !== null ? `${(p50 / 1000).toFixed(1)}s` : null,
              costs > 0 ? `$${costs.toFixed(4)}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
      </span>
      {(run?.gen_failed ?? 0) > 0 ? (
        <span className="mt-0.5 block text-[10px] font-normal text-amber-600 dark:text-amber-400">
          {run?.gen_failed} failed
        </span>
      ) : null}
    </th>
  )
}

function Detail({
  label,
  value,
  tone = "normal",
}: {
  label: string
  value?: string | null
  tone?: "normal" | "warn"
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
        {label}
      </p>
      <pre
        className={cn(
          "mt-0.5 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed",
          tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-foreground",
        )}
      >
        {value || "—"}
      </pre>
    </div>
  )
}
