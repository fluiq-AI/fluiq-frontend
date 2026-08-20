import { useState } from "react"
import {
  Alert02Icon,
  BotIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Database01Icon,
  Delete02Icon,
  FloppyDiskIcon,
  Loading03Icon,
  PlayIcon,
  Rocket02Icon,
  RotateClockwiseIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tip } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AddToDataset } from "@/components/AddToDataset"
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
import type { CompareResult, MetricResult, ModelOption, PromptRow,  TraceMetadata, PromptVersion, PromptEnv, EnvDeployment, PromptKind } from "../utils/types"
import { PromptEditor } from "./PromptEditor"
import { PromptEvalDrawer } from "./PromptEvalDrawer"
import { DatasetRunPanel } from "./DatasetRunPanel"

/**
 * What a custom judge is handed to grade. Mirrors VALID_SCORE_TARGETS in
 * routes/prompts — the evaluator renders the matching slice of the run
 * (jobs/agentic/evidence.py) instead of the final answer.
 */
export const SCORE_TARGETS = [
  { key: "output", label: "Final answer",
    hint: "The response itself. Works on any trace." },
  { key: "tools", label: "Tools & MCP",
    hint: "The tools offered and the calls actually made, with arguments and results." },
  { key: "retrieval", label: "Retrieval & reranking",
    hint: "Each query and its documents in rank order, so ordering can be graded." },
  { key: "trajectory", label: "Trajectory",
    hint: "Every step in sequence, ending with the final answer." },
  { key: "coordination", label: "Multi-agent",
    hint: "Hand-offs between agents, in the order they happened." },
] as const

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
  vars, values, renderedPrompt, originalInput, onChange, hideTitle = false,
}: {
  vars: string[]
  values: Record<string, string>
  renderedPrompt: string
  originalInput: string
  onChange: (name: string, value: string) => void
  hideTitle?: boolean
}) {
  const [showPreview, setShowPreview] = useState(false)
  const allFilled = vars.every((v) => (values[v] ?? "").trim().length > 0)

  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        {!hideTitle ? (
          <p className="text-[11px] font-medium uppercase tracking-wide text-primary/70">
            Template Variables
          </p>
        ) : null}
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
          Fill in variables — the rendered prompt is sent to each model.
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
  modelOptions = [],
  compareModels = ["claude-haiku-4-5", "claude-sonnet-4-6"],
  compareResults = null,
  compareLoading = false,
  compareError = null,
  onCompareModelChange,
  onAddCompareModel,
  onRemoveCompareModel,
  onSetCompareModels,
  onRunCompare,
  selectedMetrics,
  judgeModel,
  judgeModelLabel,
  context,
  runLoading,
  runError,
  runResults,
  onToggleMetric,
  onJudgeModelChange,
  onContextChange,
  onRun,
  showSaveForm,
  saveName,
  saveSlug,
  saveKind = "completion",
  onSaveKindChange,
  saveTarget = "output",
  onSaveTargetChange,
  savePending,
  saveError,
  saveSuccess,
  onTemplateNameChange,
  onTemplateChange,
  onVarChange,
  onResetTemplate,
  onToggleSaveForm,
  onSaveNameChange,
  onSaveSlugChange,
  onSave,
  currentVersion = null,
  latestVersion = null,
  latestTemplate = null,
  promptVersions = null,
  versionsLoading = false,
  onLoadVersionHistory,
  onLoadVersion,
  onRestoreVersion,
  savedPromptId = null,
  savedPromptEnvs = { development: null, staging: null, production: null },
  savedPromptSlug = null,
  deployLoading = null,
  onDeploy,
  onDelete,
  toolsPanel = null,
  toolsCount = 0,
  showTools = false,
  onToggleTools,
}: {
  row?: PromptRow | null
  templateName: string
  templateText: string
  templateVars: Record<string, string>
  detectedVars: string[]
  renderedPrompt: string
  modelOptions?: ModelOption[]
  compareModels?: string[]
  compareResults?: CompareResult[] | null
  compareLoading?: boolean
  compareError?: string | null
  onCompareModelChange?: (idx: number, model: string) => void
  onAddCompareModel?: () => void
  onRemoveCompareModel?: (idx: number) => void
  onSetCompareModels?: (models: string[]) => void
  onRunCompare?: () => void
  selectedMetrics?: Set<string>
  judgeModel?: string
  judgeModelLabel?: string
  context?: string
  runLoading?: boolean
  runError?: string | null
  runResults?: MetricResult[] | null
  onToggleMetric?: (m: string) => void
  onJudgeModelChange?: (m: string) => void
  onContextChange?: (v: string) => void
  onRun?: () => void
  showSaveForm: boolean
  saveName: string
  saveSlug: string
  saveKind?: PromptKind
  onSaveKindChange?: (k: PromptKind) => void
  saveTarget?: string
  onSaveTargetChange?: (t: string) => void
  savePending: boolean
  saveError: string | null
  saveSuccess: boolean
  onTemplateNameChange: (v: string) => void
  onTemplateChange: (v: string) => void
  onVarChange: (name: string, value: string) => void
  onResetTemplate: () => void
  onToggleSaveForm: () => void
  onSaveNameChange: (v: string) => void
  onSaveSlugChange: (v: string) => void
  onSave: () => void
  currentVersion?: number | null
  latestVersion?: number | null
  latestTemplate?: string | null
  promptVersions?: PromptVersion[] | null
  versionsLoading?: boolean
  onLoadVersionHistory?: () => void
  onLoadVersion?: (v: PromptVersion) => void
  onRestoreVersion?: (version: number) => void
  savedPromptId?: string | null
  savedPromptEnvs?: Record<PromptEnv, EnvDeployment | null>
  savedPromptSlug?: string | null
  deployLoading?: PromptEnv | null
  onDeploy?: (env: PromptEnv, deploy: boolean) => void
  onDelete?: () => void
  /** Rendered by the page so this component stays unaware of tool shapes. */
  toolsPanel?: React.ReactNode
  toolsCount?: number
  showTools?: boolean
  onToggleTools?: () => void
}) {
  const hasVars = detectedVars.length > 0
  const isTemplateModified = row ? templateText !== row.userPrompt : false

  const [evalOpen, setEvalOpen] = useState(false)
  const [deployOpen, setDeployOpen] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [copiedSnippet, setCopiedSnippet] = useState(false)
  const [templateVarsOpen, setTemplateVarsOpen] = useState(true)

  // Running this prompt across a whole dataset, rather than the single row in
  // view. Adding an example to a dataset is the AddToDataset control below; this
  // is the other direction — evaluate against every example already in one.
  const [datasetRunOpen, setDatasetRunOpen] = useState(false)

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
          {currentVersion != null ? (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowVersionHistory((v) => !v)
                  if (!promptVersions && !versionsLoading) onLoadVersionHistory?.()
                }}
                className="flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                v{currentVersion}
                <HugeiconsIcon
                  icon={versionsLoading ? Loading03Icon : ArrowDown01Icon}
                  size={10}
                  className={cn(versionsLoading ? "animate-spin" : "", showVersionHistory && "rotate-180", "transition-transform")}
                />
              </button>
              {showVersionHistory && promptVersions ? (
                <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-border/60 bg-background shadow-lg">
                  <p className="border-b border-border/60 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Version History
                  </p>
                  <div className="max-h-64 overflow-y-auto">
                    {([
                      // Inject the server-head version at the top (API only returns archived rows)
                      ...(latestVersion != null ? [{
                        version_id: "__latest__",
                        prompt_id: savedPromptId ?? "",
                        version: latestVersion,
                        name: templateName,
                        template: latestTemplate ?? templateText,
                        model: null as string | null,
                        variables: [] as string[],
                        created_at: null as string | null,
                      }] : []),
                      // All archived versions — no filtering needed
                      ...promptVersions,
                    ] as PromptVersion[]).map((v) => (
                      <div
                        key={v.version_id}
                        className={cn(
                          "flex items-center gap-1 px-3 py-2 text-xs",
                          v.version === currentVersion && "bg-primary/5",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => { onLoadVersion?.(v); setShowVersionHistory(false) }}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className={cn("font-mono font-medium", v.version === currentVersion && "text-primary")}>
                            v{v.version}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {v.version === latestVersion ? "latest" : v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"}
                          </span>
                        </button>
                        {v.version === currentVersion ? (
                          <span className="shrink-0 text-[10px] text-primary/60">viewing</span>
                        ) : v.version === latestVersion ? null : (
                          <Tip content={`Restore v${v.version} as latest`} side="left">
                            <button
                              type="button"
                              onClick={() => { onRestoreVersion?.(v.version); setShowVersionHistory(false) }}
                              className="flex shrink-0 items-center gap-0.5 rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground/60 transition-colors hover:border-primary/40 hover:text-primary"
                            >
                              <HugeiconsIcon icon={RotateClockwiseIcon} size={9} />
                              Restore
                            </button>
                          </Tip>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
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
            <AddToDataset
              example={{
                input: renderedPrompt || templateText,
                expected_output: row.fullOutput || null,
                metadata: {
                  ...(row.model && row.model !== "—" ? { model: row.model } : {}),
                  ...(row.metadata.cost != null ? { cost: row.metadata.cost } : {}),
                  ...(row.metadata.traceId ? { source_trace_id: row.metadata.traceId } : {}),
                  ...(row.trace.ingested_at ? { ingested_at: row.trace.ingested_at } : {}),
                },
              }}
            />
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEvalOpen(true)}
            className={cn(evalOpen && "border-primary/40 bg-primary/5 text-primary")}
          >
            <HugeiconsIcon icon={PlayIcon} size={14} />
            Evaluate &amp; compare
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDatasetRunOpen(true)}
            className={cn(datasetRunOpen && "border-primary/40 bg-primary/5 text-primary")}
          >
            <HugeiconsIcon icon={Database01Icon} size={14} />
            Evaluate on dataset
          </Button>
          {onToggleTools ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleTools}
              className={cn(showTools && "border-primary/40 bg-primary/5 text-primary")}
            >
              <HugeiconsIcon icon={BotIcon} size={14} />
              Tools &amp; MCP
              {toolsCount > 0 ? (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 font-mono text-[10px] text-primary">
                  {toolsCount}
                </span>
              ) : null}
            </Button>
          ) : null}
          {savedPromptId ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeployOpen((v) => !v)}
              className={cn(deployOpen && "border-primary/40 bg-primary/5 text-primary")}
            >
              <HugeiconsIcon icon={Rocket02Icon} size={14} />
              Deploy
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={12}
                className={cn("transition-transform", deployOpen && "rotate-180")}
              />
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={currentVersion != null ? onSave : onToggleSaveForm}
            disabled={savePending}
          >
            <HugeiconsIcon
              icon={savePending ? Loading03Icon : FloppyDiskIcon}
              size={14}
              className={savePending ? "animate-spin" : undefined}
            />
            {currentVersion != null ? "Save Version" : "Save"}
          </Button>
          {savedPromptId && onDelete ? (
            <Tip content="Delete prompt">
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground/50 transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <HugeiconsIcon icon={Delete02Icon} size={14} />
              </button>
            </Tip>
          ) : null}
        </div>
      </div>

      {/* ── Deploy dropdown panel ── */}
      {deployOpen && savedPromptId ? (
        <div className="shrink-0 border-b border-border/60 bg-muted/10">
          <div className="space-y-2 px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Deploy Environments
            </p>
            {(["development", "staging", "production"] as const).map((env) => {
              const dep = savedPromptEnvs[env]
              const isLoading = deployLoading === env
              return (
                <div key={env} className="flex items-center gap-3 rounded-md border border-border/60 bg-background px-3 py-2.5">
                  <span className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    dep
                      ? env === "production" ? "bg-emerald-500"
                        : env === "staging" ? "bg-amber-500"
                        : "bg-blue-500"
                      : "bg-muted-foreground/25",
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium capitalize">{env}</p>
                    {dep ? (
                      <p className="font-mono text-[10px] text-muted-foreground/60">
                        v{dep.version} · {formatDate(dep.deployed_at)}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/50">Not deployed</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={dep ? "outline" : "default"}
                    className={cn(
                      "h-7 shrink-0 text-xs",
                      dep && "border-destructive/30 text-destructive hover:bg-destructive/5",
                    )}
                    disabled={isLoading}
                    onClick={() => onDeploy?.(env, !dep)}
                  >
                    {isLoading ? <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" /> : null}
                    {dep ? "Undeploy" : "Deploy"}
                  </Button>
                </div>
              )
            })}

            {/* SDK snippet */}
            {savedPromptSlug ? (() => {
              const highestEnv = savedPromptEnvs.production ? "production"
                : savedPromptEnvs.staging ? "staging"
                : savedPromptEnvs.development ? "development"
                : null
              if (!highestEnv) return (
                <p className="pt-1 text-[10px] text-muted-foreground/50">
                  Deploy to an environment to get the SDK snippet.
                </p>
              )
              const fetchLine = highestEnv === "production"
                ? `prompt = fluiq.fetch_prompt("${savedPromptSlug}")`
                : `prompt = fluiq.fetch_prompt("${savedPromptSlug}", env="${highestEnv}")`
              const renderArgs = detectedVars.length > 0
                ? detectedVars.map((v) => `${v}=""`).join(", ")
                : ""
              const renderLine = `result = prompt.render(${renderArgs})`
              const snippet = `${fetchLine}\n${renderLine}`
              return (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(snippet)
                    setCopiedSnippet(true)
                    setTimeout(() => setCopiedSnippet(false), 2000)
                  }}
                  className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-left transition-colors hover:bg-muted/40"
                >
                  <HugeiconsIcon
                    icon={copiedSnippet ? Tick02Icon : Copy01Icon}
                    size={12}
                    className={cn("shrink-0", copiedSnippet ? "text-emerald-500" : "text-muted-foreground/50")}
                  />
                  <code className="min-w-0 flex-1 font-mono text-[11px] text-muted-foreground">
                    <span className="block truncate">{fetchLine}</span>
                    <span className="block truncate">{renderLine}</span>
                  </code>
                  <span className="shrink-0 text-[10px] text-muted-foreground/40">
                    {copiedSnippet ? "Copied!" : "Copy"}
                  </span>
                </button>
              )
            })() : null}
          </div>
        </div>
      ) : null}

      {/* ── Body ── */}
      <div className="min-h-0 flex-1 flex flex-col overflow-hidden">

        {/* ── Save form ── */}
        {showSaveForm ? (
          <div className="shrink-0 border-b border-border/60 px-5 py-4">
            <div className="rounded-md border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-primary/70">
                Save Prompt Template
              </p>
              {/* Kind selector — completion prompt vs. custom LLM-as-judge */}
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <div className="inline-flex rounded-md border border-border/60 bg-background p-0.5">
                  {([
                    { key: "completion", label: "Completion" },
                    { key: "judge", label: "Judge" },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onSaveKindChange?.(key)}
                      className={cn(
                        "rounded px-3 py-1 text-xs font-medium transition-colors",
                        saveKind === key
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={saveName}
                    onChange={(e) => onSaveNameChange(e.target.value)}
                    placeholder={saveKind === "judge" ? "Refund policy judge" : "My prompt name"}
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
                    placeholder={saveKind === "judge" ? "refund-policy" : "my-prompt-name"}
                    className="h-8 font-mono text-sm"
                  />
                </div>
              </div>
              {saveKind === "judge" ? (
                <div className="space-y-1.5 rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    Custom judge prompt
                  </p>

                  {/* What this judge is shown. An agent fails in more than one
                      place, and a prompt asking about tool choice cannot answer
                      from the final answer alone — the tool calls are not in it. */}
                  <div className="space-y-1 pb-1">
                    <p className="text-[11px] text-muted-foreground">What should it grade?</p>
                    <div className="flex flex-wrap gap-1">
                      {SCORE_TARGETS.map(({ key, label, hint }) => (
                        <button
                          key={key}
                          type="button"
                          title={hint}
                          onClick={() => onSaveTargetChange?.(key)}
                          className={cn(
                            "rounded-md border px-2 py-1 text-[11px] transition-colors",
                            saveTarget === key
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : "border-border/60 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] leading-snug text-muted-foreground/70">
                      {SCORE_TARGETS.find((t) => t.key === saveTarget)?.hint}
                    </p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Use{" "}
                    <code className="rounded bg-muted px-1 font-mono text-[10px]">{"{{question}}"}</code>,{" "}
                    <code className="rounded bg-muted px-1 font-mono text-[10px]">{"{{answer}}"}</code> and{" "}
                    <code className="rounded bg-muted px-1 font-mono text-[10px]">{"{{context}}"}</code>{" "}
                    in your template, and ask the model to return JSON with a numeric{" "}
                    <code className="rounded bg-muted px-1 font-mono text-[10px]">score</code> (0–1) and a{" "}
                    <code className="rounded bg-muted px-1 font-mono text-[10px]">reason</code>. Then reference it from the SDK:
                  </p>
                  <code className="block whitespace-pre-wrap break-words rounded bg-background px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                    {`fluiq.eval(custom_judges={"${saveSlug || "your-slug"}": 0.8})`}
                  </code>
                </div>
              ) : null}
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
          </div>
        ) : null}

        {/* DATASETS — Add to Dataset panel commented out until batch eval flow is built */}

        {/* ── Prompt editor ── */}
        <div className="min-h-0 flex-1 flex flex-col border-b border-border/60">
          {/* Editor header bar */}
          <div className="shrink-0 flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5">
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
          <PromptEditor
            value={templateText}
            onChange={onTemplateChange}
            placeholder={
              row
                ? "Edit the prompt template. Use {{variable}} for dynamic values."
                : "Write your prompt template here.\n\nExample:\nYou are a helpful assistant.\n\nAnswer the user's question about {{topic}} in {{language}}."
            }
            className="min-h-0 flex-1"
          />
        </div>

        {/* ── LLM Output ── */}
        {row?.fullOutput ? (
          <div className="shrink-0 border-b border-border/60">
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
          <div className="shrink-0 border-b border-border/60">
            <button
              type="button"
              onClick={() => setTemplateVarsOpen((v) => !v)}
              className="flex w-full items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Template Variables
                </span>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold text-primary">
                  {detectedVars.length} var{detectedVars.length !== 1 ? "s" : ""}
                </span>
              </div>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={12}
                className={cn("text-muted-foreground transition-transform", templateVarsOpen && "rotate-180")}
              />
            </button>
            {templateVarsOpen ? (
              <div className="max-h-64 overflow-y-auto px-5 py-4">
                <TemplateVarsSection
                  vars={detectedVars}
                  values={templateVars}
                  renderedPrompt={renderedPrompt}
                  originalInput={row?.userPrompt ?? ""}
                  onChange={onVarChange}
                  hideTitle
                />
              </div>
            ) : null}
          </div>
        ) : null}

      </div>

      {/* ── Trace Metadata ── */}
      {row ? (
        <div className="shrink-0 border-t border-border/60">
          <MetadataSection metadata={row.metadata} date={row.trace.ingested_at} />
        </div>
      ) : null}

      {/* ── Evaluate & compare drawer ── */}
      <PromptEvalDrawer
        open={evalOpen}
        onClose={() => setEvalOpen(false)}
        promptName={templateName}
        templateText={templateText}
        modelOptions={modelOptions}
        models={compareModels}
        onSetModels={onSetCompareModels ?? (() => {})}
        onRun={onRunCompare ?? (() => {})}
        loading={compareLoading}
        error={compareError ?? null}
        results={compareResults ?? null}
        context={context ?? ""}
        onContextChange={onContextChange ?? (() => {})}
        selectedMetrics={selectedMetrics ?? new Set<string>()}
        onToggleMetric={onToggleMetric ?? (() => {})}
        judgeModel={judgeModel ?? ""}
        onJudgeModelChange={onJudgeModelChange ?? (() => {})}
      />

      {/* ── Tools & MCP ──
          A dialog rather than a panel in the flow: editing a toolset means
          typing JSON schemas, which needs room and full attention, and the
          inline version squeezed that into a strip above the editor while the
          prompt it belongs to scrolled away underneath. */}
      <Dialog
        open={Boolean(showTools && toolsPanel)}
        onOpenChange={(open) => {
          // onToggleTools is a toggle, so only call it on a real close —
          // Radix also fires onOpenChange(true), which would close it again.
          if (!open && showTools) onToggleTools?.()
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Tools &amp; MCP</DialogTitle>
            <DialogDescription>
              What this prompt may call. Offered to the model on every evaluation
              run, and scored by the agentic evaluator&apos;s tool-selection
              layer — so the tools a prompt is judged with are the ones recorded
              here.
            </DialogDescription>
          </DialogHeader>
          <div className="-mr-2 max-h-[65vh] overflow-y-auto pr-2">{toolsPanel}</div>
          <DialogFooter className="items-center justify-between gap-3 sm:justify-between">
            {/* Said out loud because a modal that closes cleanly reads as
                "saved", and the toolset is stored with the prompt — closing
                this dialog does not write anything. */}
            <p className="text-[11px] text-muted-foreground">
              Saved with the prompt — use Save to keep these changes.
            </p>
            <Button size="sm" variant="outline" onClick={() => onToggleTools?.()}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Evaluate on dataset ── */}
      <DatasetRunPanel
        open={datasetRunOpen}
        onClose={() => setDatasetRunOpen(false)}
        templateText={templateText}
        promptName={templateName}
        savedPromptId={savedPromptId}
        savedPromptVersion={currentVersion}
        modelOptions={modelOptions}
        defaultModels={compareModels}
        judgeModel={judgeModel}
      />
    </div>
  )
}
