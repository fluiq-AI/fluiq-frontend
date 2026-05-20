import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import {
  AiContentGenerator01Icon,
  Alert02Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Database01Icon,
  Delete02Icon,
  FloppyDiskIcon,
  Loading03Icon,
  PlayIcon,
  RefreshIcon,
  RocketIcon,
  RotateClockwiseIcon,
  Tick02Icon,
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { TraceGroup, TraceListResponse, TraceNode, TraceRecord } from "@/pages/Dashboard/Traces/types"
import {
  formatDate,
  formatCost,
  formatLatency,
  getStr,
  isFailed,
  scoreBandClass,
  formatScore,
} from "@/pages/Dashboard/Traces/utils"
import {
  extractRequestMessages,
  extractSystemInstruction,
  extractTokens,
} from "@/pages/Dashboard/Traces/extractors"
import { buildTraceTree, findGroupForTrace } from "@/pages/Dashboard/Traces/treeBuilder"

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_METRICS = [
  "hallucination",
  "faithfulness",
  "relevance",
  "toxicity",
  "coherence",
  "completeness",
] as const

const JUDGE_MODELS = [
  { label: "Haiku 4.5 (fast)", value: "claude-haiku-4-5-20251001" },
  { label: "Sonnet 4.6 (accurate)", value: "claude-sonnet-4-6" },
]

const PROMPTS_PAGE_SIZE = 100
const VAR_RE = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g

// ── Types ─────────────────────────────────────────────────────────────────────

interface MetricResult {
  metric: string
  score: number
  reason: string
  passed: boolean
}

interface PlaygroundResponse {
  trace_id: string
  scores: Record<string, number>
  results: MetricResult[]
  passed: boolean
  failures: string[]
}

interface TraceMetadata {
  traceId: string | null
  apiKeyPrefix: string
  latency: number | null
  tokenPrompt: number | null
  tokenCompletion: number | null
  tokenTotal: number | null
  cost: number | null
  currency: string | null
  success: boolean | null
}

interface PromptRow {
  trace: TraceRecord
  name: string
  model: string
  inputPreview: string
  outputPreview: string
  fullInput: string
  fullOutput: string
  metadata: TraceMetadata
}

type PromptEnv = "development" | "staging" | "production"

interface EnvDeployment {
  env_id: string
  version: number
  deployed_at: string
}

interface SavedPrompt {
  prompt_id: string
  org_id: string
  name: string
  slug: string
  template: string
  model: string | null
  variables: { name: string }[]
  is_deployed: boolean
  deployed_at: string | null
  version: number
  environments: Record<PromptEnv, EnvDeployment | null>
  created_at: string | null
  updated_at: string | null
}

interface PromptVersion {
  version_id: string
  prompt_id: string
  version: number
  name: string
  template: string
  model: string | null
  variables: string[]
  created_at: string | null
}

interface DatasetRef {
  dataset_id:    string
  name:          string
  example_count: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(s: string, max = 120): string {
  if (s.length <= max) return s
  return s.slice(0, max) + "…"
}

function extractOutput(event: Record<string, unknown>): string {
  const out = event["output"]
  if (typeof out === "string") return out
  if (out && typeof out === "object") {
    try { return JSON.stringify(out, null, 2) } catch { return "" }
  }
  return ""
}

function buildFullInput(event: Record<string, unknown>): string {
  const lines: string[] = []
  const sys = extractSystemInstruction(event)
  if (sys) lines.push(`[System]\n${sys}`)
  const msgs = extractRequestMessages(event)
  for (const m of msgs) {
    const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content)
    lines.push(`[${m.role}]\n${content}`)
  }
  return lines.join("\n\n")
}

function buildInputPreview(event: Record<string, unknown>): string {
  const msgs = extractRequestMessages(event)
  if (msgs.length > 0) {
    const last = msgs[msgs.length - 1]
    const c = typeof last.content === "string" ? last.content : JSON.stringify(last.content)
    return truncate(c)
  }
  const sys = extractSystemInstruction(event)
  if (sys) return truncate(sys)
  return "—"
}

function extractMetadata(trace: TraceRecord): TraceMetadata {
  const e = trace.event
  const tokens = extractTokens(e)
  const rawSuccess = e["success"]
  const success =
    rawSuccess === true || rawSuccess === 1 ? true
    : rawSuccess === false || rawSuccess === 0 ? false
    : null
  return {
    traceId:         typeof e["trace_id"] === "string" ? e["trace_id"] as string : null,
    apiKeyPrefix:    trace.api_key_prefix,
    latency:         typeof e["latency"] === "number" ? e["latency"] as number : null,
    tokenPrompt:     tokens?.prompt ?? null,
    tokenCompletion: tokens?.completion ?? null,
    tokenTotal:      tokens?.total ?? null,
    cost:            trace.cost ?? null,
    currency:        trace.currency ?? null,
    success,
  }
}

function toPromptRow(trace: TraceRecord): PromptRow {
  const e = trace.event
  const name =
    (typeof e["function"] === "string" && e["function"]) ? e["function"] as string
    : (typeof e["name"] === "string" && e["name"]) ? e["name"] as string
    : trace.api_key_prefix ? `${trace.api_key_prefix}…`
    : "—"
  const model = (typeof e["model"] === "string" && e["model"]) ? e["model"] as string : "—"
  const fullOutput = extractOutput(e)
  const fullInput  = buildFullInput(e)
  return {
    trace,
    name,
    model,
    inputPreview:  buildInputPreview(e),
    outputPreview: truncate(fullOutput),
    fullInput,
    fullOutput,
    metadata: extractMetadata(trace),
  }
}

function detectVars(text: string): string[] {
  const seen = new Set<string>()
  for (const m of text.matchAll(VAR_RE)) seen.add(m[1])
  return Array.from(seen)
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(VAR_RE, (_, name) => vars[name] ?? `{{${name}}}`)
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
}

// ── Page ──────────────────────────────────────────────────────────────────────

function Prompts() {
  // Discovered traces
  const [traces,        setTraces]        = useState<TraceRecord[]>([])
  const [loading,       setLoading]       = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore,       setHasMore]       = useState(false)
  const [loadOffset,    setLoadOffset]    = useState(PROMPTS_PAGE_SIZE)
  const [error,         setError]         = useState<string | null>(null)
  const [selected,      setSelected]      = useState<number | null>(null)

  // Saved prompts
  const [savedPrompts,  setSavedPrompts]  = useState<SavedPrompt[]>([])
  const [savedLoading,  setSavedLoading]  = useState(true)
  const [showSaveForm,  setShowSaveForm]  = useState(false)
  const [saveName,      setSaveName]      = useState("")
  const [saveSlug,      setSaveSlug]      = useState("")
  const [savePending,   setSavePending]   = useState(false)
  const [saveError,     setSaveError]     = useState<string | null>(null)
  const [saveSuccess,   setSaveSuccess]   = useState(false)

  // Evaluation state
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(
    new Set(["hallucination", "relevance"]),
  )
  const [judgeModel,  setJudgeModel]  = useState(JUDGE_MODELS[0].value)
  const [context,     setContext]     = useState("")
  const [runLoading,  setRunLoading]  = useState(false)
  const [runError,    setRunError]    = useState<string | null>(null)
  const [runResults,  setRunResults]  = useState<MetricResult[] | null>(null)

  // Template state
  const [templateText, setTemplateText] = useState("")
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({})

  // Auto-generate slug from name
  useEffect(() => {
    setSaveSlug(toSlug(saveName))
  }, [saveName])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await authFetch<TraceListResponse>(
        `/api/v1/traces?limit=${PROMPTS_PAGE_SIZE}&offset=0`,
      )
      setTraces(data.traces)
      setLoadOffset(PROMPTS_PAGE_SIZE)
      setHasMore(data.traces.length >= PROMPTS_PAGE_SIZE)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load traces")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const data = await authFetch<TraceListResponse>(
        `/api/v1/traces?limit=${PROMPTS_PAGE_SIZE}&offset=${loadOffset}`,
      )
      setTraces((prev) => {
        const seen = new Set(prev.map((t) => getStr(t.event, "trace_id")).filter(Boolean))
        const fresh = data.traces.filter((t) => {
          const tid = getStr(t.event, "trace_id")
          return tid && !seen.has(tid)
        })
        return fresh.length > 0 ? [...prev, ...fresh] : prev
      })
      setLoadOffset((o) => o + PROMPTS_PAGE_SIZE)
      setHasMore(data.traces.length >= PROMPTS_PAGE_SIZE)
    } catch {
      // silently fail — button stays visible so user can retry
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, loadOffset])

  const loadSaved = useCallback(async () => {
    setSavedLoading(true)
    try {
      const data = await authFetch<{ prompts: SavedPrompt[] }>("/api/v1/prompts")
      setSavedPrompts(data.prompts)
    } catch {
      // silent — saved prompts are supplementary
    } finally {
      setSavedLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadSaved() }, [loadSaved])

  const rows = useMemo<PromptRow[]>(() => {
    return traces
      .filter((t) => t.event["type"] === "llm")
      .map(toPromptRow)
  }, [traces])

  const selectedRow = selected !== null ? rows[selected] ?? null : null

  const traceGroups = useMemo(() => buildTraceTree(traces), [traces])
  const selectedGroup = useMemo(
    () => selectedRow ? findGroupForTrace(traceGroups, selectedRow.trace) : null,
    [traceGroups, selectedRow],
  )

  // Reset template when selection changes
  useEffect(() => {
    if (selected !== null && rows[selected]) {
      setTemplateText(rows[selected].fullInput)
      setTemplateVars({})
      setRunResults(null)
      setRunError(null)
      setShowSaveForm(false)
      setSaveName("")
      setSaveSuccess(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const detectedVars  = useMemo(() => detectVars(templateText), [templateText])
  const renderedPrompt = useMemo(
    () => renderTemplate(templateText, templateVars),
    [templateText, templateVars],
  )

  function handleSelectRow(idx: number) {
    setSelected((prev) => (prev === idx ? null : idx))
  }

  function toggleMetric(metric: string) {
    setSelectedMetrics((prev) => {
      const next = new Set(prev)
      if (next.has(metric)) { next.delete(metric) } else { next.add(metric) }
      return next
    })
  }

  function handleVarChange(name: string, value: string) {
    setTemplateVars((prev) => ({ ...prev, [name]: value }))
  }

  function handleResetTemplate() {
    if (selectedRow) {
      setTemplateText(selectedRow.fullInput)
      setTemplateVars({})
    }
  }

  async function handleRunEval() {
    if (!selectedRow) return
    setRunLoading(true)
    setRunError(null)
    setRunResults(null)
    try {
      const resp = await authFetch<PlaygroundResponse>("/api/v1/evaluate/playground", {
        method: "POST",
        body: {
          prompt:      renderedPrompt,
          response:    selectedRow.fullOutput,
          context,
          metrics:     Array.from(selectedMetrics),
          judge_model: judgeModel,
          thresholds:  {},
        },
      })
      setRunResults(resp.results)
    } catch (err) {
      setRunError(err instanceof ApiError ? err.detail : "Evaluation failed")
    } finally {
      setRunLoading(false)
    }
  }

  async function handleSavePrompt() {
    if (!selectedRow || !saveName.trim() || !saveSlug.trim()) return
    setSavePending(true)
    setSaveError(null)
    try {
      const result = await authFetch<SavedPrompt>("/api/v1/prompts", {
        method: "POST",
        body: {
          name:      saveName.trim(),
          slug:      saveSlug.trim(),
          template:  templateText,
          model:     selectedRow.model !== "—" ? selectedRow.model : undefined,
          variables: detectedVars,
        },
      })
      setSavedPrompts((prev) => [result, ...prev])
      setShowSaveForm(false)
      setSaveName("")
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.detail : "Save failed")
    } finally {
      setSavePending(false)
    }
  }

  async function handleDeployEnv(promptId: string, env: PromptEnv, deploy: boolean) {
    try {
      const result = await authFetch<SavedPrompt>(
        `/api/v1/prompts/${promptId}/environments/${env}`,
        { method: "POST", body: { deploy } },
      )
      setSavedPrompts((prev) => prev.map((p) => p.prompt_id === promptId ? result : p))
    } catch {
      // silent
    }
  }

  async function handleDeleteSaved(promptId: string) {
    try {
      await authFetch(`/api/v1/prompts/${promptId}`, { method: "DELETE" })
      setSavedPrompts((prev) => prev.filter((p) => p.prompt_id !== promptId))
    } catch {
      // silent
    }
  }

  async function handleRestore(promptId: string, version: number) {
    try {
      const result = await authFetch<SavedPrompt>(
        `/api/v1/prompts/${promptId}/versions/${version}/restore`,
        { method: "POST" },
      )
      setSavedPrompts((prev) => prev.map((p) => p.prompt_id === promptId ? result : p))
    } catch {
      // silent
    }
  }

  const isEmpty = !loading && rows.length === 0

  return (
    <>
      {/* ── Header ── */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Prompts
          </h1>
          <p className="mt-2 text-muted-foreground">
            Discover, evaluate, save, and deploy prompt templates from your AI pipelines.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <HugeiconsIcon
            icon={loading ? Loading03Icon : RefreshIcon}
            size={14}
            className={loading ? "animate-spin" : undefined}
          />
          Refresh
        </Button>
      </div>

      {/* ── Error banner ── */}
      {error ? (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <HugeiconsIcon icon={Alert02Icon} size={14} />
          {error}
        </div>
      ) : null}

      <div className="space-y-6">

        {/* ── Saved Prompts ── */}
        <SavedPromptsCard
          prompts={savedPrompts}
          loading={savedLoading}
          onDeployEnv={handleDeployEnv}
          onDelete={handleDeleteSaved}
          onRestore={handleRestore}
        />

        {/* ── Discovered traces table ── */}
        {isEmpty ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={AiContentGenerator01Icon} size={16} />
                <CardTitle className="text-base">No LLM traces yet</CardTitle>
              </div>
              <CardDescription>
                Instrument your AI pipelines with the Fluiq SDK. LLM calls will appear here
                once traces start arriving.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    Discovered Prompts
                    <span className="ml-2 font-normal text-muted-foreground text-sm">
                      ({rows.length})
                    </span>
                  </CardTitle>
                  {loading ? (
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      size={14}
                      className="animate-spin text-muted-foreground"
                    />
                  ) : null}
                </div>
                <CardDescription>
                  LLM calls from your traces — click any row to open the trace &amp; evaluation drawer.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2.5 text-left">Name</th>
                        <th className="px-4 py-2.5 text-left">Model</th>
                        <th className="px-4 py-2.5 text-left">Input</th>
                        <th className="px-4 py-2.5 text-left">Output</th>
                        <th className="px-4 py-2.5 text-right">Tokens</th>
                        <th className="px-4 py-2.5 text-right">Cost</th>
                        <th className="px-4 py-2.5 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const isActive = selected === idx
                        const meta = row.metadata
                        return (
                          <tr
                            key={`${row.trace.ingested_at}-${idx}`}
                            onClick={() => handleSelectRow(idx)}
                            className={cn(
                              "cursor-pointer border-b border-border/60 align-middle transition-colors",
                              isActive ? "bg-muted" : "hover:bg-muted/40",
                            )}
                          >
                            <td className="max-w-36 truncate px-4 py-2.5 font-mono text-xs text-muted-foreground">
                              {row.name}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">
                              {row.model}
                            </td>
                            <td className="max-w-56 px-4 py-2.5 text-xs text-muted-foreground">
                              <span className="line-clamp-2">{row.inputPreview}</span>
                            </td>
                            <td className="max-w-56 px-4 py-2.5 text-xs text-muted-foreground">
                              <span className="line-clamp-2">{row.outputPreview || "—"}</span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                              {meta.tokenTotal != null ? meta.tokenTotal.toLocaleString() : "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                              {formatCost(meta.cost, meta.currency)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                              {formatDate(row.trace.ingested_at)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {hasMore ? (
                  <div className="flex justify-center border-t border-border/60 px-4 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMore}
                      disabled={isLoadingMore}
                    >
                      <HugeiconsIcon
                        icon={isLoadingMore ? Loading03Icon : RefreshIcon}
                        size={14}
                        className={isLoadingMore ? "animate-spin" : undefined}
                      />
                      {isLoadingMore ? "Loading…" : "Load more"}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

          </>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      {selectedRow ? (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-[88vw] max-w-[1400px] flex-col border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <HugeiconsIcon icon={AiContentGenerator01Icon} size={15} className="shrink-0 text-muted-foreground" />
                <span className="truncate font-mono text-sm font-medium">{selectedRow.name}</span>
                {selectedRow.model !== "—" ? (
                  <Badge variant="outline" className="ml-1 shrink-0 font-mono text-[10px]">
                    {selectedRow.model}
                  </Badge>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Close"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={15} />
              </button>
            </div>
            {/* Drawer body */}
            <div className="flex min-h-0 flex-1">
              {/* Trace tree sidebar */}
              <div className="w-64 shrink-0 overflow-y-auto border-r border-border/60 p-3">
                <SpanTimeline
                  group={selectedGroup}
                  selectedTrace={selectedRow.trace}
                  sticky={false}
                />
              </div>
              {/* Eval playground */}
              <div className="min-w-0 flex-1 overflow-y-auto p-4">
                <EvalPlayground
                  row={selectedRow}
                  templateText={templateText}
                  templateVars={templateVars}
                  detectedVars={detectedVars}
                  renderedPrompt={renderedPrompt}
                  selectedMetrics={selectedMetrics}
                  judgeModel={judgeModel}
                  judgeModelLabel={JUDGE_MODELS.find((m) => m.value === judgeModel)?.label ?? judgeModel}
                  context={context}
                  runLoading={runLoading}
                  runError={runError}
                  runResults={runResults}
                  showSaveForm={showSaveForm}
                  saveName={saveName}
                  saveSlug={saveSlug}
                  savePending={savePending}
                  saveError={saveError}
                  saveSuccess={saveSuccess}
                  onTemplateChange={setTemplateText}
                  onVarChange={handleVarChange}
                  onResetTemplate={handleResetTemplate}
                  onToggleMetric={toggleMetric}
                  onJudgeModelChange={setJudgeModel}
                  onContextChange={setContext}
                  onRun={handleRunEval}
                  onToggleSaveForm={() => { setShowSaveForm((v) => !v); setSaveError(null) }}
                  onSaveNameChange={setSaveName}
                  onSaveSlugChange={setSaveSlug}
                  onSave={handleSavePrompt}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}

// ── Span Timeline (trace tree sidebar) ───────────────────────────────────────

function spanTypeStyle(type: string): {
  dot: string
  label: string
} {
  switch (type) {
    case "llm":
      return { dot: "bg-violet-500", label: "LLM" }
    case "function":
      return { dot: "bg-emerald-500", label: "Fn" }
    case "tool":
      return { dot: "bg-orange-500", label: "Tool" }
    case "agent":
      return { dot: "bg-teal-500", label: "Agent" }
    case "chain":
      return { dot: "bg-blue-500", label: "Chain" }
    case "retriever":
    case "search_knowledge_base":
      return { dot: "bg-amber-500", label: "Retriever" }
    case "embedding":
      return { dot: "bg-cyan-500", label: "Embed" }
    default:
      return { dot: "bg-muted-foreground/50", label: type || "span" }
  }
}

function SpanNode({
  node,
  depth,
  selectedTrace,
}: {
  node: TraceNode
  depth: number
  selectedTrace: TraceRecord
}) {
  const [collapsed, setCollapsed] = useState(false)
  const e = node.trace.event
  const type = typeof e["type"] === "string" ? (e["type"] as string) : "function"
  const name =
    (typeof e["function"] === "string" && e["function"]) ? e["function"] as string
    : (typeof e["name"] === "string" && e["name"]) ? e["name"] as string
    : type
  const model = typeof e["model"] === "string" ? e["model"] as string : null
  const latency = typeof e["latency"] === "number" ? e["latency"] as number : null
  const failed = isFailed(e)
  const isSelected = node.trace === selectedTrace
  const hasChildren = node.children.length > 0
  const style = spanTypeStyle(type)

  return (
    <div>
      <div
        className={cn(
          "group flex min-w-0 cursor-default items-center gap-1.5 rounded-sm py-1 pr-2 text-xs transition-colors",
          isSelected
            ? "bg-primary/10 font-medium text-primary"
            : failed
              ? "text-destructive hover:bg-destructive/5"
              : "text-foreground hover:bg-muted/40",
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm text-muted-foreground/60 hover:text-muted-foreground"
          >
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={9}
              className={cn("transition-transform", collapsed && "-rotate-90")}
            />
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span className={cn("h-2 w-2 shrink-0 rounded-[2px]", style.dot)} />
        <span className="min-w-0 flex-1 truncate leading-none">{name}</span>
        {latency != null ? (
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/70">
            {formatLatency(latency)}
          </span>
        ) : null}
      </div>
      {model ? (
        <div
          className="flex items-center gap-1.5 py-0.5 text-[10px] text-muted-foreground/60"
          style={{ paddingLeft: `${8 + (depth + 1) * 14 + 3.5 + 6}px` }}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-[2px] bg-violet-400/60" />
          <span className="truncate font-mono">{model}</span>
        </div>
      ) : null}
      {!collapsed
        ? node.children.map((child) => (
            <SpanNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedTrace={selectedTrace}
            />
          ))
        : null}
    </div>
  )
}

function SpanTimeline({
  group,
  selectedTrace,
  sticky = true,
}: {
  group: TraceGroup | null
  selectedTrace: TraceRecord
  sticky?: boolean
}) {
  const spanCount = group?.count ?? 1

  return (
    <Card className={cn(sticky && "self-start sticky top-4")}>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Trace Tree</CardTitle>
          <span className="text-[11px] text-muted-foreground">
            {spanCount} span{spanCount !== 1 ? "s" : ""}
          </span>
        </div>
        <CardDescription className="text-[11px]">
          Execution context for this LLM call
        </CardDescription>
      </CardHeader>
      <CardContent className="px-1 pb-3">
        {group ? (
          <div className="space-y-px">
            {/* Legend */}
            <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 px-2 pb-1 border-b border-border/40">
              {(["llm", "function", "tool", "agent"] as const).map((t) => {
                const s = spanTypeStyle(t)
                return (
                  <span key={t} className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                    <span className={cn("h-1.5 w-1.5 rounded-[2px]", s.dot)} />
                    {s.label}
                  </span>
                )
              })}
            </div>
            <SpanNode
              node={group.root}
              depth={0}
              selectedTrace={selectedTrace}
            />
          </div>
        ) : (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            No trace tree — standalone LLM call
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Saved Prompts Card ────────────────────────────────────────────────────────

const HISTORY_COLS = 7 // colspan for the history expansion row

const ENV_META: Record<PromptEnv, { label: string; short: string; activeClass: string; titleDeploy: string; titleUndeploy: string }> = {
  development: {
    label: "Development", short: "dev",
    activeClass: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    titleDeploy: "Deploy to development", titleUndeploy: "Remove from development",
  },
  staging: {
    label: "Staging", short: "stg",
    activeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    titleDeploy: "Promote to staging", titleUndeploy: "Remove from staging",
  },
  production: {
    label: "Production", short: "prod",
    activeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    titleDeploy: "Promote to production", titleUndeploy: "Remove from production",
  },
}

const ENV_ORDER: PromptEnv[] = ["development", "staging", "production"]

function SavedPromptsCard({
  prompts,
  loading,
  onDeployEnv,
  onDelete,
  onRestore,
}: {
  prompts: SavedPrompt[]
  loading: boolean
  onDeployEnv: (id: string, env: PromptEnv, deploy: boolean) => Promise<void>
  onDelete: (id: string) => void
  onRestore: (promptId: string, version: number) => Promise<void>
}) {
  // Track which (promptId × env) combos are currently deploying
  const [deployingKeys, setDeployingKeys] = useState<Set<string>>(new Set())
  const [copiedId,         setCopiedId]    = useState<string | null>(null)
  const [historyId,        setHistoryId]   = useState<string | null>(null)
  const [versions,         setVersions]    = useState<PromptVersion[]>([])
  const [versionsLoading,  setVersionsLoading]  = useState(false)
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null)

  async function handleDeployEnv(id: string, env: PromptEnv, deploy: boolean) {
    const key = `${id}-${env}`
    setDeployingKeys((s) => new Set(s).add(key))
    await onDeployEnv(id, env, deploy)
    setDeployingKeys((s) => { const n = new Set(s); n.delete(key); return n })
  }

  async function toggleHistory(promptId: string) {
    if (historyId === promptId) {
      setHistoryId(null)
      setVersions([])
      return
    }
    setHistoryId(promptId)
    setVersionsLoading(true)
    try {
      const data = await authFetch<{ versions: PromptVersion[] }>(
        `/api/v1/prompts/${promptId}/versions`,
      )
      setVersions(data.versions)
    } catch {
      setVersions([])
    } finally {
      setVersionsLoading(false)
    }
  }

  async function handleRestore(promptId: string, version: number) {
    setRestoringVersion(version)
    await onRestore(promptId, version)
    try {
      const data = await authFetch<{ versions: PromptVersion[] }>(
        `/api/v1/prompts/${promptId}/versions`,
      )
      setVersions(data.versions)
    } catch {
      // silent
    }
    setRestoringVersion(null)
  }

  function copySnippet(slug: string, env: PromptEnv, id: string) {
    const snippet =
      env === "production"
        ? `prompt = fluiq.get_prompt("${slug}")`
        : `prompt = fluiq.get_prompt("${slug}", env="${env}")`
    navigator.clipboard.writeText(snippet)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Saved Prompts</CardTitle>
          {loading ? (
            <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin text-muted-foreground" />
          ) : (
            <span className="text-xs text-muted-foreground">({prompts.length})</span>
          )}
        </div>
        <CardDescription>
          Promote templates to <span className="font-medium text-blue-500/80">dev</span>,{" "}
          <span className="font-medium text-amber-500/80">staging</span>, or{" "}
          <span className="font-medium text-emerald-500/80">production</span> — then fetch them via{" "}
          <code className="font-mono text-[11px]">fluiq.get_prompt(slug)</code>.
        </CardDescription>
      </CardHeader>

      {prompts.length === 0 && !loading ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No saved prompts yet. Select a discovered prompt and click{" "}
            <span className="font-medium">Save Prompt</span> to save it.
          </p>
        </CardContent>
      ) : (
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 text-left">Name</th>
                  <th className="px-4 py-2.5 text-left">Slug / Model</th>
                  <th className="px-4 py-2.5 text-center">Ver.</th>
                  <th className="px-4 py-2.5 text-left">Environments</th>
                  <th className="px-4 py-2.5 text-left">SDK Snippet</th>
                  <th className="px-4 py-2.5 text-left">Saved</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prompts.map((p) => {
                  const highestDeployedEnv: PromptEnv | null =
                    p.environments.production ? "production"
                    : p.environments.staging ? "staging"
                    : p.environments.development ? "development"
                    : null

                  return (
                    <Fragment key={p.prompt_id}>
                      <tr className="border-b border-border/60 align-middle">
                        <td className="max-w-40 truncate px-4 py-2.5 font-medium text-xs">
                          {p.name}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-mono text-xs text-muted-foreground">{p.slug}</div>
                          {p.model ? (
                            <div className="font-mono text-[10px] text-muted-foreground/50">{p.model}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono text-xs text-muted-foreground">
                          v{p.version}
                        </td>

                        {/* ── Environment badges ── */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            {ENV_ORDER.map((env) => {
                              const dep = p.environments[env]
                              const meta = ENV_META[env]
                              const key = `${p.prompt_id}-${env}`
                              const busy = deployingKeys.has(key)
                              return (
                                <button
                                  key={env}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleDeployEnv(p.prompt_id, env, !dep)}
                                  title={
                                    dep
                                      ? `${meta.titleUndeploy} (v${dep.version} — ${dep.deployed_at ? formatDate(dep.deployed_at) : ""})`
                                      : meta.titleDeploy
                                  }
                                  className={cn(
                                    "inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50",
                                    dep
                                      ? meta.activeClass
                                      : "border-border/50 text-muted-foreground/40 hover:border-border hover:text-muted-foreground",
                                  )}
                                >
                                  {busy ? (
                                    <HugeiconsIcon icon={Loading03Icon} size={9} className="animate-spin" />
                                  ) : dep ? (
                                    <HugeiconsIcon icon={RocketIcon} size={9} />
                                  ) : null}
                                  {meta.short}
                                  {dep ? ` v${dep.version}` : ""}
                                </button>
                              )
                            })}
                          </div>
                        </td>

                        {/* ── SDK snippet ── */}
                        <td className="px-4 py-2.5">
                          {highestDeployedEnv ? (
                            <button
                              type="button"
                              onClick={() => copySnippet(p.slug, highestDeployedEnv, p.prompt_id)}
                              className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                              title="Copy SDK snippet"
                            >
                              <HugeiconsIcon
                                icon={copiedId === p.prompt_id ? Tick02Icon : Copy01Icon}
                                size={11}
                              />
                              {highestDeployedEnv === "production"
                                ? `fluiq.get_prompt("${p.slug}")`
                                : `fluiq.get_prompt("${p.slug}", env="${highestDeployedEnv}")`}
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/30">
                              promote to enable
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                          {p.created_at ? formatDate(p.created_at) : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => toggleHistory(p.prompt_id)}
                              className={cn(
                                "flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] transition-colors",
                                historyId === p.prompt_id
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border/60 text-muted-foreground/60 hover:text-muted-foreground",
                              )}
                              title="Version history"
                            >
                              <HugeiconsIcon
                                icon={ArrowDown01Icon}
                                size={10}
                                className={cn("transition-transform", historyId === p.prompt_id && "rotate-180")}
                              />
                              History
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(p.prompt_id)}
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-border/60 text-muted-foreground/60 hover:border-destructive/40 hover:text-destructive transition-colors"
                              title="Delete prompt"
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Inline version history expansion ── */}
                      {historyId === p.prompt_id ? (
                        <tr className="border-b border-border/60 bg-muted/20">
                          <td colSpan={HISTORY_COLS} className="px-4 py-3">
                            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                              Version History — {p.name}
                            </p>
                            {versionsLoading ? (
                              <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                                <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
                                Loading…
                              </div>
                            ) : versions.length === 0 ? (
                              <p className="py-2 text-xs text-muted-foreground">
                                No previous versions. Edit the template to create history.
                              </p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                                    <th className="pb-1.5 pr-4 text-left">Ver.</th>
                                    <th className="pb-1.5 pr-4 text-left">Name</th>
                                    <th className="pb-1.5 pr-4 text-left">Model</th>
                                    <th className="pb-1.5 pr-4 text-left">Saved at</th>
                                    <th className="pb-1.5 pr-4 text-left">Template preview</th>
                                    <th className="pb-1.5 text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {versions.map((v) => (
                                    <tr key={v.version_id} className="border-t border-border/30 align-top">
                                      <td className="py-1.5 pr-4 font-mono text-muted-foreground">v{v.version}</td>
                                      <td className="py-1.5 pr-4 max-w-32 truncate text-muted-foreground">{v.name}</td>
                                      <td className="py-1.5 pr-4 font-mono text-muted-foreground">{v.model || "—"}</td>
                                      <td className="py-1.5 pr-4 whitespace-nowrap text-muted-foreground">
                                        {v.created_at ? formatDate(v.created_at) : "—"}
                                      </td>
                                      <td className="py-1.5 pr-4 max-w-xs">
                                        <span className="line-clamp-1 font-mono text-muted-foreground/70">
                                          {truncate(v.template, 80)}
                                        </span>
                                      </td>
                                      <td className="py-1.5 text-right">
                                        <button
                                          type="button"
                                          disabled={restoringVersion === v.version}
                                          onClick={() => handleRestore(p.prompt_id, v.version)}
                                          className="flex items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground/60 hover:border-primary/40 hover:text-primary disabled:opacity-50 transition-colors"
                                          title={`Restore v${v.version}`}
                                        >
                                          {restoringVersion === v.version ? (
                                            <HugeiconsIcon icon={Loading03Icon} size={10} className="animate-spin" />
                                          ) : (
                                            <HugeiconsIcon icon={RotateClockwiseIcon} size={10} />
                                          )}
                                          Restore
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ── Evaluation Playground ─────────────────────────────────────────────────────

function EvalPlayground({
  row,
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
  row: PromptRow
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
  const isTemplateModified = templateText !== row.fullInput

  // ── Dataset panel state ──────────────────────────────────────────────────
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
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Evaluation Playground</CardTitle>
            <CardDescription className="mt-0.5">
              <span className="font-mono text-xs">{row.name}</span>
              {row.model !== "—" ? (
                <Badge variant="outline" className="ml-2 font-mono text-[10px]">
                  {row.model}
                </Badge>
              ) : null}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {saveSuccess ? (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
                Saved!
              </span>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={openDatasetPanel}
              className={cn(showDatasetPanel && "border-primary/40 bg-primary/5 text-primary")}
            >
              <HugeiconsIcon icon={Database01Icon} size={14} />
              Add to Dataset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleSaveForm}
            >
              <HugeiconsIcon icon={FloppyDiskIcon} size={14} />
              Save Prompt
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
              {runLoading ? "Running…" : "Run Evaluation"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">

        {/* ── Save form (inline) ── */}
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
        {showDatasetPanel ? (
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

            {/* Existing datasets */}
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

            {/* New dataset form */}
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

        {/* ── Metadata ── */}
        <MetadataSection metadata={row.metadata} date={row.trace.ingested_at} />

        {/* ── Template + Output ── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Prompt Template
                {hasVars ? (
                  <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold text-primary">
                    {detectedVars.length} var{detectedVars.length !== 1 ? "s" : ""}
                  </span>
                ) : null}
              </p>
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
            <textarea
              value={templateText}
              onChange={(e) => onTemplateChange(e.target.value)}
              rows={10}
              placeholder="Edit the prompt template. Use {{variable}} for dynamic values."
              className="w-full resize-y rounded-md border border-border/60 bg-muted/40 px-3 py-2 font-mono text-xs leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground/50">
              Use <code className="font-mono">{"{{variable}}"}</code> placeholders — fill values below.
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Output
            </p>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border/60 bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">
              {row.fullOutput || "—"}
            </pre>
          </div>
        </div>

        {/* ── Template Variables ── */}
        {hasVars ? (
          <TemplateVarsSection
            vars={detectedVars}
            values={templateVars}
            renderedPrompt={renderedPrompt}
            originalInput={row.fullInput}
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
            className="w-full resize-y rounded-md border border-border/60 bg-muted/40 px-3 py-2 font-mono text-xs leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
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
              Results
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {runResults.map((r) => (
                <ScoreCard key={r.metric} result={r} />
              ))}
            </div>
          </div>
        ) : null}

      </CardContent>
    </Card>
  )
}

// ── Metadata Section ──────────────────────────────────────────────────────────

function MetadataSection({ metadata: m, date }: { metadata: TraceMetadata; date: string }) {
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
          Metadata
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
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

function TemplateVarsSection({
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

export default Prompts
