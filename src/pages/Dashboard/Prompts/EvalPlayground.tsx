import { useState } from "react"
import {
  Alert02Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Database01Icon,
  FloppyDiskIcon,
  Loading03Icon,
  PlayIcon,
  RotateClockwiseIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  formatCost,
  formatDate,
  formatLatency,
  formatScore,
  scoreBandClass,
} from "@/pages/Dashboard/Traces/utils"
import type { MetricResult, PromptRow, DatasetRef, TraceMetadata } from "./types"
import { ALL_METRICS, JUDGE_MODELS } from "./types"

// ── Score Card ────────────────────────────────────────────────────────────────

function ScoreCard({ result }: { result: MetricResult }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-md border border-border/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-medium">{result.metric}</span>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold",
            scoreBandClass(result.score),
          )}>
            {formatScore(result.score)}
          </span>
          {result.passed ? (
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <HugeiconsIcon icon={Cancel01Icon} size={13} className="text-destructive" />
          )}
        </div>
      </div>
      {result.reason ? (
        <div>
          <p className={cn("text-[11px] leading-relaxed text-muted-foreground", !expanded && "line-clamp-2")}>
            {result.reason}
          </p>
          {result.reason.length > 100 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-0.5 text-[10px] text-muted-foreground/60 hover:text-muted-foreground"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

// ── Metadata Section ──────────────────────────────────────────────────────────

export function MetadataSection({ metadata: m, date }: { metadata: TraceMetadata; date: string }) {
  const [open, setOpen] = useState(false)

  const fields: { label: string; value: string | null }[] = [
    { label: "Trace ID", value: m.traceId ? m.traceId.slice(0, 8) + "…" : null },
    { label: "API Key", value: m.apiKeyPrefix || null },
    { label: "Latency", value: m.latency != null ? formatLatency(m.latency) : null },
    {
      label: "Tokens",
      value: m.tokenTotal != null
        ? `${(m.tokenPrompt ?? 0).toLocaleString()} in / ${(m.tokenCompletion ?? 0).toLocaleString()} out`
        : null,
    },
    { label: "Cost", value: formatCost(m.cost, m.currency) === "—" ? null : formatCost(m.cost, m.currency) },
    { label: "Date", value: formatDate(date) },
    {
      label: "Status",
      value: m.success === true ? "success" : m.success === false ? "failed" : null,
    },
  ]

  return (
    <div className="rounded-md border border-border/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Trace Metadata
        </span>
        <HugeiconsIcon
          icon={ArrowUp01Icon}
          size={12}
          className={cn("text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="border-t border-border/60 px-4 py-3">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {fields.map(({ label, value }) =>
              value ? (
                <div key={label} className="space-y-0.5">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">{label}</dt>
                  <dd className={cn(
                    "font-mono text-xs",
                    label === "Status" && value === "success" ? "text-emerald-600 dark:text-emerald-400"
                    : label === "Status" && value === "failed" ? "text-destructive"
                    : "text-foreground",
                  )}>{value}</dd>
                </div>
              ) : null,
            )}
          </dl>
        </div>
      ) : null}
    </div>
  )
}

// ── Template Variables Section ────────────────────────────────────────────────

export function TemplateVarsSection({
  vars, values, renderedPrompt, originalInput, onChange,
}: {
  vars: string[]
  values: Record<string, string>
  renderedPrompt: string
  originalInput: string
  onChange: (name: string, value: string) => void
}) {
  const [showPreview, setShowPreview] = useState(false)
  const allFilled = vars.every((v) => (values[v] ?? "").trim().length > 0)

  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-primary/70">
          Template Variables
        </p>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="text-[10px] text-primary/60 hover:text-primary"
        >
          {showPreview ? "Hide preview" : "Show rendered preview"}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {vars.map((name) => (
          <div key={name} className="space-y-1">
            <Label className="font-mono text-[11px] text-muted-foreground">
              {"{{"}
              {name}
              {"}}"}
            </Label>
            <Input
              value={values[name] ?? ""}
              onChange={(e) => onChange(name, e.target.value)}
              placeholder={`Value for ${name}`}
              className="h-7 font-mono text-xs"
            />
          </div>
        ))}
      </div>
      {!allFilled ? (
        <p className="text-[10px] text-muted-foreground/60">
          Fill all variables — the rendered prompt is sent to the evaluator.
        </p>
      ) : null}
      {showPreview ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
            Rendered Prompt
          </p>
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border/60 bg-background p-3 font-mono text-xs leading-relaxed text-foreground">
            {renderedPrompt !== originalInput ? renderedPrompt : "(no substitutions made yet)"}
          </pre>
        </div>
      ) : null}
    </div>
  )
}

// ── Eval Playground ───────────────────────────────────────────────────────────

export function EvalPlayground({
  row = null,
  templateName,
  templateText,
  templateVars,
  detectedVars,
  renderedPrompt,
  selectedMetrics,
  judgeModel,
  judgeModelLabel,
  context,
  runLoading,
  runError,
  runResults,
  showSaveForm,
  saveName,
  saveSlug,
  savePending,
  saveError,
  saveSuccess,
  onTemplateNameChange,
  onTemplateChange,
  onVarChange,
  onResetTemplate,
  onToggleMetric,
  onJudgeModelChange,
  onContextChange,
  onRun,
  onToggleSaveForm,
  onSaveNameChange,
  onSaveSlugChange,
  onSave,
}: {
  row?: PromptRow | null
  templateName: string
  templateText: string
  templateVars: Record<string, string>
  detectedVars: string[]
  renderedPrompt: string
  selectedMetrics: Set<string>
  judgeModel: string
  judgeModelLabel: string
  context: string
  runLoading: boolean
  runError: string | null
  runResults: MetricResult[] | null
  showSaveForm: boolean
  saveName: string
  saveSlug: string
  savePending: boolean
  saveError: string | null
  saveSuccess: boolean
  onTemplateNameChange: (v: string) => void
  onTemplateChange: (v: string) => void
  onVarChange: (name: string, value: string) => void
  onResetTemplate: () => void
  onToggleMetric: (m: string) => void
  onJudgeModelChange: (m: string) => void
  onContextChange: (v: string) => void
  onRun: () => void
  onToggleSaveForm: () => void
  onSaveNameChange: (v: string) => void
  onSaveSlugChange: (v: string) => void
  onSave: () => void
}) {
  const hasVars = detectedVars.length > 0
  const isTemplateModified = row ? templateText !== row.userPrompt : false

  const [showDatasetPanel, setShowDatasetPanel] = useState(false)
  const [datasets,         setDatasets]         = useState<DatasetRef[]>([])
  const [datasetsLoading,  setDatasetsLoading]  = useState(false)
  const [newDatasetName,   setNewDatasetName]   = useState("")
  const [creatingDataset,  setCreatingDataset]  = useState(false)
  const [addingToId,       setAddingToId]       = useState<string | null>(null)
  const [addedToId,        setAddedToId]        = useState<string | null>(null)
  const [datasetError,     setDatasetError]     = useState<string | null>(null)

  async function openDatasetPanel() {
    setShowDatasetPanel((v) => !v)
    if (!showDatasetPanel) {
      setDatasetsLoading(true)
      setDatasetError(null)
      try {
        const data = await authFetch<{ datasets: DatasetRef[] }>("/api/v1/datasets")
        setDatasets(data.datasets)
      } catch {
        setDatasets([])
      } finally {
        setDatasetsLoading(false)
      }
    }
  }

  async function handleCreateAndAdd() {
    if (!newDatasetName.trim()) return
    setCreatingDataset(true)
    setDatasetError(null)
    try {
      const ds = await authFetch<DatasetRef>("/api/v1/datasets", {
        method: "POST",
        body: { name: newDatasetName.trim() },
      })
      setDatasets((prev) => [ds, ...prev])
      setNewDatasetName("")
      await addExample(ds.dataset_id)
    } catch (err) {
      setDatasetError(err instanceof ApiError ? err.detail : "Failed to create dataset")
    } finally {
      setCreatingDataset(false)
    }
  }

  async function addExample(datasetId: string) {
    if (!row) return
    setAddingToId(datasetId)
    setDatasetError(null)
    const metadata: Record<string, unknown> = {}
    if (row.model !== "—") metadata["model"] = row.model
    if (row.metadata.cost != null) metadata["cost"] = row.metadata.cost
    if (row.metadata.traceId) metadata["source_trace_id"] = row.metadata.traceId
    if (row.trace.ingested_at) metadata["ingested_at"] = row.trace.ingested_at
    try {
      await authFetch(`/api/v1/datasets/${datasetId}/examples`, {
        method: "POST",
        body: {
          input:           renderedPrompt || templateText,
          expected_output: row.fullOutput || null,
          metadata,
        },
      })
      setDatasets((prev) =>
        prev.map((d) =>
          d.dataset_id === datasetId ? { ...d, example_count: d.example_count + 1 } : d,
        ),
      )
      setAddedToId(datasetId)
      setTimeout(() => setAddedToId(null), 2500)
    } catch (err) {
      setDatasetError(err instanceof ApiError ? err.detail : "Failed to add example")
    } finally {
      setAddingToId(null)
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-background px-5 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            value={templateName}
            onChange={(e) => onTemplateNameChange(e.target.value)}
            placeholder="Untitled prompt"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold placeholder:text-muted-foreground/40 focus:outline-none"
          />
          {row?.model && row.model !== "—" ? (
            <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
              {row.model}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
              Saved!
            </span>
          ) : null}
          {row ? (
            <Button
              variant="outline"
              size="sm"
              onClick={openDatasetPanel}
              className={cn(showDatasetPanel && "border-primary/40 bg-primary/5 text-primary")}
            >
              <HugeiconsIcon icon={Database01Icon} size={14} />
              Add to Dataset
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={onToggleSaveForm}>
            <HugeiconsIcon icon={FloppyDiskIcon} size={14} />
            Save
          </Button>
          <Button
            size="sm"
            onClick={onRun}
            disabled={runLoading || selectedMetrics.size === 0}
          >
            <HugeiconsIcon
              icon={runLoading ? Loading03Icon : PlayIcon}
              size={14}
              className={runLoading ? "animate-spin" : undefined}
            />
            {runLoading ? "Running…" : "Run Eval"}
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 space-y-5">

        {/* ── Save form ── */}
        {showSaveForm ? (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-primary/70">
              Save Prompt Template
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input
                  value={saveName}
                  onChange={(e) => onSaveNameChange(e.target.value)}
                  placeholder="My prompt name"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Slug
                  <span className="ml-1 font-normal text-muted-foreground/60">(unique identifier)</span>
                </Label>
                <Input
                  value={saveSlug}
                  onChange={(e) => onSaveSlugChange(e.target.value)}
                  placeholder="my-prompt-name"
                  className="h-8 font-mono text-sm"
                />
              </div>
            </div>
            {saveError ? (
              <p className="text-xs text-destructive">{saveError}</p>
            ) : null}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={onSave}
                disabled={savePending || !saveName.trim() || !saveSlug.trim()}
              >
                {savePending ? (
                  <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
                ) : (
                  <HugeiconsIcon icon={FloppyDiskIcon} size={13} />
                )}
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={onToggleSaveForm}>
                Cancel
              </Button>
              <p className="text-[10px] text-muted-foreground/60">
                Saves current template ({detectedVars.length} variable{detectedVars.length !== 1 ? "s" : ""})
              </p>
            </div>
          </div>
        ) : null}

        {/* ── Add to Dataset panel ── */}
        {showDatasetPanel && row ? (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-primary/70">
                Add to Dataset
              </p>
              <button
                type="button"
                onClick={() => setShowDatasetPanel(false)}
                className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground"
              >
                Close
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Saves the current prompt + output as a labeled example.
            </p>
            {datasetError ? (
              <p className="text-xs text-destructive">{datasetError}</p>
            ) : null}

            {datasetsLoading ? (
              <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
                Loading datasets…
              </div>
            ) : datasets.length > 0 ? (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {datasets.map((d) => (
                  <button
                    key={d.dataset_id}
                    type="button"
                    disabled={addingToId === d.dataset_id}
                    onClick={() => addExample(d.dataset_id)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors disabled:opacity-50",
                      addedToId === d.dataset_id
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{d.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {d.example_count} example{d.example_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {addingToId === d.dataset_id ? (
                      <HugeiconsIcon icon={Loading03Icon} size={12} className="shrink-0 animate-spin" />
                    ) : addedToId === d.dataset_id ? (
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} className="shrink-0 text-emerald-500" />
                    ) : (
                      <HugeiconsIcon icon={Database01Icon} size={12} className="shrink-0 text-muted-foreground/40" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/60">No datasets yet — create one below.</p>
            )}

            <div className="flex items-center gap-2 pt-1 border-t border-primary/10">
              <Input
                value={newDatasetName}
                onChange={(e) => setNewDatasetName(e.target.value)}
                placeholder="New dataset name…"
                className="h-7 flex-1 text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleCreateAndAdd}
                disabled={creatingDataset || !newDatasetName.trim()}
              >
                {creatingDataset ? (
                  <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
                ) : null}
                Create & Add
              </Button>
            </div>
          </div>
        ) : null}

        {/* ── Prompt editor ── */}
        <div className="overflow-hidden rounded-md border border-border/60">
          {/* Editor header bar */}
          <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Prompt
              </span>
              {hasVars ? (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold text-primary">
                  {detectedVars.length} var{detectedVars.length !== 1 ? "s" : ""}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground/50 font-mono">
                {"{{variable}}"}
              </span>
              {isTemplateModified ? (
                <button
                  type="button"
                  onClick={onResetTemplate}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground"
                >
                  <HugeiconsIcon icon={RotateClockwiseIcon} size={10} />
                  Reset
                </button>
              ) : null}
            </div>
          </div>
          <textarea
            value={templateText}
            onChange={(e) => onTemplateChange(e.target.value)}
            rows={14}
            placeholder={row
              ? "Edit the prompt template. Use {{variable}} for dynamic values."
              : "Write your prompt template here.\n\nExample:\nYou are a helpful assistant.\n\nAnswer the user's question about {{topic}} in {{language}}."}
            className="w-full resize-y bg-background px-4 py-3 font-mono text-xs leading-relaxed placeholder:text-muted-foreground/30 focus:outline-none"
          />
        </div>

        {/* ── LLM Output ── */}
        {row?.fullOutput ? (
          <div className="overflow-hidden rounded-md border border-border/60">
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Output
              </span>
              {row.model && row.model !== "—" ? (
                <span className="font-mono text-[10px] text-muted-foreground/50">{row.model}</span>
              ) : null}
            </div>
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words bg-background px-4 py-3 font-mono text-xs leading-relaxed text-foreground">
              {row.fullOutput}
            </pre>
          </div>
        ) : null}

        {/* ── Template Variables ── */}
        {hasVars ? (
          <TemplateVarsSection
            vars={detectedVars}
            values={templateVars}
            renderedPrompt={renderedPrompt}
            originalInput={row?.userPrompt ?? ""}
            onChange={onVarChange}
          />
        ) : null}

        {/* ── Context ── */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Context{" "}
            <span className="normal-case font-normal text-muted-foreground/60">
              (optional — paste retrieved passages for faithfulness eval)
            </span>
          </p>
          <textarea
            value={context}
            onChange={(e) => onContextChange(e.target.value)}
            rows={3}
            placeholder="Paste any retrieved context here…"
            className="w-full resize-y rounded-md border border-border/60 bg-muted/20 px-3 py-2.5 font-mono text-xs leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* ── Metrics + Judge model ── */}
        <div className="flex flex-wrap items-start gap-6">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Metrics
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_METRICS.map((metric) => {
                const active = selectedMetrics.has(metric)
                return (
                  <button
                    key={metric}
                    type="button"
                    onClick={() => onToggleMetric(metric)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-muted/40 text-muted-foreground hover:border-border hover:text-foreground",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-primary" : "bg-muted-foreground/30")} />
                    {metric}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Judge Model
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 font-mono text-xs">
                  {judgeModelLabel}
                  <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {JUDGE_MODELS.map((m) => (
                  <DropdownMenuItem
                    key={m.value}
                    onClick={() => onJudgeModelChange(m.value)}
                    className={cn("font-mono text-xs", judgeModel === m.value && "font-semibold")}
                  >
                    {m.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Run error ── */}
        {runError ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <HugeiconsIcon icon={Alert02Icon} size={14} />
            {runError}
          </div>
        ) : null}

        {/* ── Results ── */}
        {runResults && runResults.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Evaluation Results
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {runResults.map((r) => (
                <ScoreCard key={r.metric} result={r} />
              ))}
            </div>
          </div>
        ) : null}

      </div>
       {/* ── Metadata (trace-backed only) ── */}
        {row ? <MetadataSection metadata={row.metadata} date={row.trace.ingested_at} /> : null}

    </div>
  )
}
