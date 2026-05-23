import { useEffect, useMemo, useState } from "react"
import {
  Alert02Icon,
  BotIcon,
  Loading03Icon,
  PlusSignIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import type { TraceListResponse, TraceRecord } from "@/pages/Dashboard/Traces/utils/types"
import {
  formatCost,
  formatDate,
  getStr,
} from "@/pages/Dashboard/Traces/utils"
import { buildTraceTree, findGroupForTrace } from "@/pages/Dashboard/Traces/helpers/treeBuilder"
import type { AgentRow } from "@/pages/Dashboard/Agents/utils/types"

import type { MetricResult, PlaygroundResponse, SavedPrompt, PromptEnv, PromptRow } from "./utils/types"
import { JUDGE_MODELS, PROMPTS_PAGE_SIZE } from "./utils/types"
import { detectVars, renderTemplate, toPromptRow, toSlug } from "./utils"
import { SpanTimeline, spanTypeIcon } from "./components/SpanTimeline"
import { SavedPromptsCard } from "./components/SavedPromptsCard"
import { EvalPlayground } from "./components/EvalPlayground"

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
  const [activeTrace,   setActiveTrace]   = useState<TraceRecord | null>(null)

  // Agent summary (list)
  const [agentSummary,        setAgentSummary]        = useState<AgentRow[]>([])
  const [agentSummaryLoading, setAgentSummaryLoading] = useState(true)

  // Selected agent detail
  const [selectedAgent,    setSelectedAgent]    = useState<AgentRow | null>(null)
  const [agentSpans,       setAgentSpans]       = useState<TraceRecord[]>([])
  const [agentSpansLoading, setAgentSpansLoading] = useState(false)

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
  const [templateName, setTemplateName] = useState("")
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({})

  // Left panel navigation
  const [leftTab,       setLeftTab]       = useState<"saved" | "traces" | "agents">("saved")
  const [isNewTemplate, setIsNewTemplate] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const data = await authFetch<TraceListResponse>(
          `/api/v1/traces?limit=${PROMPTS_PAGE_SIZE}&offset=0`,
        )
        setError(null)
        setTraces(data.traces)
        setLoadOffset(PROMPTS_PAGE_SIZE)
        setHasMore(data.traces.length >= PROMPTS_PAGE_SIZE)
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Failed to load traces")
      } finally {
        setLoading(false)
      }
    })()
    ;(async () => {
      try {
        const data = await authFetch<{ prompts: SavedPrompt[] }>("/api/v1/prompts")
        setSavedPrompts(data.prompts)
      } catch {
        // silent
      } finally {
        setSavedLoading(false)
      }
    })()
    ;(async () => {
      try {
        const data = await authFetch<{ agents: AgentRow[] }>("/api/v1/agents/summary?limit=200&offset=0")
        setAgentSummary(data.agents)
      } catch {
        // silent
      } finally {
        setAgentSummaryLoading(false)
      }
    })()
  }, [])

  const traceGroups      = useMemo(() => buildTraceTree(traces), [traces])
  const agentTraceGroups = useMemo(() => buildTraceTree(agentSpans), [agentSpans])

  const singleRows = useMemo<PromptRow[]>(
    () => traces.filter((t) => t.event["type"] === "llm").map(toPromptRow),
    [traces],
  )

  const activeRow = useMemo(
    () => activeTrace ? toPromptRow(activeTrace) : null,
    [activeTrace],
  )

  const selectedGroup = useMemo(() => {
    if (selectedAgent) {
      if (activeTrace) return findGroupForTrace(agentTraceGroups, activeTrace) ?? agentTraceGroups[0] ?? null
      return agentTraceGroups[0] ?? null
    }
    const root = selected !== null ? singleRows[selected]?.trace : null
    return root ? findGroupForTrace(traceGroups, root) : null
  }, [traceGroups, agentTraceGroups, singleRows, selected, selectedAgent, activeTrace])

  const spanTimelineTrace = activeTrace ?? agentTraceGroups[0]?.root.trace ?? agentSpans[0] ?? null

  const showEditor = isNewTemplate || activeRow !== null

  const detectedVars   = useMemo(() => detectVars(templateText), [templateText])
  const renderedPrompt = useMemo(
    () => renderTemplate(templateText, templateVars),
    [templateText, templateVars],
  )

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleActivateTrace(trace: TraceRecord) {
    const row = toPromptRow(trace)
    setActiveTrace(trace)
    setIsNewTemplate(true)
    setTemplateText(row.userPrompt)
    setTemplateName(row.name !== "—" ? row.name : "")
    setTemplateVars({})
    setRunResults(null)
    setRunError(null)
  }

  function handleNew() {
    setIsNewTemplate(true)
    setActiveTrace(null)
    setSelected(null)
    setSelectedAgent(null)
    setAgentSpans([])
    setTemplateText("")
    setTemplateName("")
    setTemplateVars({})
    setRunResults(null)
    setRunError(null)
    setShowSaveForm(false)
    setSaveName("")
    setSaveSlug("")
    setSaveSuccess(false)
    setSaveError(null)
  }

  function handleSelectSaved(p: SavedPrompt) {
    setIsNewTemplate(true)
    setActiveTrace(null)
    setSelected(null)
    setSelectedAgent(null)
    setAgentSpans([])
    setTemplateText(p.template)
    setTemplateName(p.name)
    setTemplateVars({})
    setRunResults(null)
    setRunError(null)
    setSaveName(p.name)
    setSaveSlug(p.slug)
    setSaveSuccess(false)
    setSaveError(null)
  }

  function handleSelectTrace(idx: number) {
    if (selected === idx) {
      setSelected(null)
      setActiveTrace(null)
      setIsNewTemplate(false)
    } else {
      setSelected(idx)
      setSelectedAgent(null)
      setAgentSpans([])
      if (singleRows[idx]) handleActivateTrace(singleRows[idx].trace)
    }
  }

  async function handleSelectAgent(agent: AgentRow) {
    setSelectedAgent(agent)
    setAgentSpans([])
    setActiveTrace(null)
    setIsNewTemplate(false)
    setRunResults(null)
    setRunError(null)
    setAgentSpansLoading(true)
    try {
      const rootParams = new URLSearchParams()
      rootParams.set("agent_key", agent.agent_key)
      rootParams.set("agent_kind", agent.agent_kind)
      rootParams.set("limit", "1")
      const rootData = await authFetch<TraceListResponse>(`/api/v1/traces?${rootParams}`)
      if (rootData.traces.length === 0) return
      const rootTrace = rootData.traces[0]
      const traceId = getStr(rootTrace.event, "trace_id")
      if (traceId) {
        const spanParams = new URLSearchParams()
        spanParams.set("root_trace_id", traceId)
        spanParams.set("limit", "500")
        const spanData = await authFetch<TraceListResponse>(`/api/v1/traces?${spanParams}`)
        setAgentSpans(spanData.traces)
      } else {
        setAgentSpans([rootTrace])
      }
    } catch {
      // silent
    } finally {
      setAgentSpansLoading(false)
    }
  }

  async function loadMore() {
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
      // silent
    } finally {
      setIsLoadingMore(false)
    }
  }

  async function reload() {
    setLoading(true)
    try {
      const data = await authFetch<TraceListResponse>(
        `/api/v1/traces?limit=${PROMPTS_PAGE_SIZE}&offset=0`,
      )
      setError(null)
      setTraces(data.traces)
      setLoadOffset(PROMPTS_PAGE_SIZE)
      setHasMore(data.traces.length >= PROMPTS_PAGE_SIZE)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load traces")
    } finally {
      setLoading(false)
    }
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
    if (activeRow) {
      setTemplateText(activeRow.userPrompt)
    } else {
      setTemplateText("")
    }
    setTemplateVars({})
  }

  async function handleRunEval() {
    setRunLoading(true)
    setRunError(null)
    setRunResults(null)
    try {
      const resp = await authFetch<PlaygroundResponse>("/api/v1/evaluate/playground", {
        method: "POST",
        body: {
          prompt:      renderedPrompt || templateText,
          response:    activeRow?.fullOutput || "",
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
    if (!saveName.trim() || !saveSlug.trim()) return
    setSavePending(true)
    setSaveError(null)
    try {
      const result = await authFetch<SavedPrompt>("/api/v1/prompts", {
        method: "POST",
        body: {
          name:      saveName.trim(),
          slug:      saveSlug.trim(),
          template:  templateText,
          model:     activeRow?.model && activeRow.model !== "—" ? activeRow.model : undefined,
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

  function onSaveNameChange(v: string) {
    setSaveName(v)
    setSaveSlug(toSlug(v))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const LEFT_TABS = [
    { key: "saved",  label: "Saved",  count: savedPrompts.length,  busy: savedLoading },
    { key: "traces", label: "Traces", count: singleRows.length,    busy: loading },
    { key: "agents", label: "Agents", count: agentSummary.length,  busy: agentSummaryLoading },
  ] as const

  return (
    <>
      <DashboardPageHeader
        title="Prompts"
        description="Write, discover, evaluate, and deploy prompt templates."
      />
      <div className="px-6 py-6">
      <div className="mb-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          <HugeiconsIcon icon={loading ? Loading03Icon : RefreshIcon} size={14} className={loading ? "animate-spin" : undefined} />
          Refresh
        </Button>
      </div>
      {/* ── Error banner ── */}
      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <HugeiconsIcon icon={Alert02Icon} size={14} />
          {error}
        </div>
      ) : null}

      {/* ── IDE split ── */}
      <div className="mb-6 flex h-[720px] items-start gap-0 overflow-hidden rounded-xl border border-border/60 bg-background">

        {/* ── Left panel ── */}
        <div className="flex h-full w-56 shrink-0 flex-col overflow-hidden border-r border-border/60 bg-muted/20">

          {/* New Template button */}
          <div className="border-b border-border/60 p-3">
            <button
              type="button"
              onClick={handleNew}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={13} />
              New Template
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border/60">
            {LEFT_TABS.map(({ key, label, count, busy }) => (
              <button
                key={key}
                type="button"
                onClick={() => setLeftTab(key)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-px py-2 text-[10px] font-medium transition-colors",
                  leftTab === key
                    ? "border-b-2 border-primary bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                <span className={cn(
                  "rounded-full px-1.5 font-mono text-[9px]",
                  leftTab === key ? "text-primary" : "text-muted-foreground/60",
                )}>
                  {busy ? "…" : count}
                </span>
              </button>
            ))}
          </div>

          {/* List */}
          <div className="min-h-0 flex-1 overflow-y-auto">

            {/* Saved tab */}
            {leftTab === "saved" ? (
              savedLoading ? (
                <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                  <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
                  Loading…
                </div>
              ) : savedPrompts.length === 0 ? (
                <p className="px-4 py-4 text-center text-[11px] text-muted-foreground/60">
                  No saved prompts yet.
                </p>
              ) : (
                savedPrompts.map((p) => (
                  <button
                    key={p.prompt_id}
                    type="button"
                    onClick={() => handleSelectSaved(p)}
                    className="flex w-full flex-col items-start gap-0.5 border-b border-border/40 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                  >
                    <span className="truncate text-xs font-medium w-full">{p.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground/50">
                      v{p.version} · {p.slug}
                    </span>
                  </button>
                ))
              )
            ) : null}

            {/* Traces tab */}
            {leftTab === "traces" ? (
              loading ? (
                <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                  <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
                  Loading…
                </div>
              ) : singleRows.length === 0 ? (
                <p className="px-4 py-4 text-center text-[11px] text-muted-foreground/60">
                  No LLM calls yet. Instrument your code with the Fluiq SDK.
                </p>
              ) : (
                <>
                  {singleRows.map((row, idx) => (
                    <button
                      key={`${row.trace.ingested_at}-${idx}`}
                      type="button"
                      onClick={() => handleSelectTrace(idx)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 border-b border-border/40 px-3 py-2.5 text-left transition-colors hover:bg-muted/40",
                        selected === idx && "bg-primary/5 text-primary",
                      )}
                    >
                      <div className="flex w-full items-center gap-1.5 min-w-0">
                        <HugeiconsIcon
                          icon={spanTypeIcon("llm", typeof row.trace.event["model"] === "string" ? row.trace.event["model"] as string : null)}
                          size={11}
                          className={cn("shrink-0", selected === idx ? "text-primary" : "text-muted-foreground/60")}
                        />
                        <span className="truncate text-xs font-medium">{row.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground/50 pl-4">
                        {row.model !== "—" ? row.model : formatDate(row.trace.ingested_at)}
                      </span>
                    </button>
                  ))}
                  {hasMore ? (
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      {isLoadingMore
                        ? <HugeiconsIcon icon={Loading03Icon} size={11} className="animate-spin" />
                        : null}
                      {isLoadingMore ? "Loading…" : "Load more"}
                    </button>
                  ) : null}
                </>
              )
            ) : null}

            {/* Agents tab */}
            {leftTab === "agents" ? (
              agentSummaryLoading ? (
                <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                  <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
                  Loading…
                </div>
              ) : agentSummary.length === 0 ? (
                <p className="px-4 py-4 text-center text-[11px] text-muted-foreground/60">
                  No agents yet. Instrument your agent pipelines with the Fluiq SDK.
                </p>
              ) : (
                agentSummary.map((a) => {
                  const key = `${a.agent_key}__${a.agent_kind}__${a.integration}`
                  const isSelected = selectedAgent?.agent_key === a.agent_key && selectedAgent?.agent_kind === a.agent_kind
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectAgent(a)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 border-b border-border/40 px-3 py-2.5 text-left transition-colors hover:bg-muted/40",
                        isSelected && "bg-primary/5",
                      )}
                    >
                      <div className="flex w-full items-center gap-1.5 min-w-0">
                        <HugeiconsIcon
                          icon={BotIcon}
                          size={11}
                          className={cn("shrink-0", isSelected ? "text-primary" : "text-muted-foreground/60")}
                        />
                        <span className={cn("truncate font-mono text-xs font-medium", isSelected && "text-primary")}>
                          {a.agent_key}
                        </span>
                      </div>
                      <span className="pl-4 text-[10px] text-muted-foreground/50">
                        {a.runs} run{a.runs !== 1 ? "s" : ""} · {formatCost(a.total_cost, "USD")}
                      </span>
                    </button>
                  )
                })
              )
            ) : null}

          </div>

          {/* Span timeline (shown when agent selected or trace selected with a group) */}
          {selectedAgent && !agentSpansLoading && spanTimelineTrace ? (
            <div className="border-t border-border/60 max-h-72 overflow-y-auto">
              <SpanTimeline
                group={selectedGroup}
                selectedTrace={spanTimelineTrace}
                onSelectTrace={handleActivateTrace}
                sticky={false}
              />
            </div>
          ) : selectedAgent && agentSpansLoading ? (
            <div className="flex items-center gap-2 border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
              <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
              Loading trace…
            </div>
          ) : selected !== null && selectedGroup ? (
            <div className="border-t border-border/60 max-h-64 overflow-y-auto">
              <SpanTimeline
                group={selectedGroup}
                selectedTrace={activeTrace!}
                onSelectTrace={handleActivateTrace}
                sticky={false}
              />
            </div>
          ) : null}

        </div>

        {/* ── Right panel ── */}
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          {showEditor ? (
            <EvalPlayground
              row={activeRow}
              templateName={templateName}
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
              onTemplateNameChange={setTemplateName}
              onTemplateChange={setTemplateText}
              onVarChange={handleVarChange}
              onResetTemplate={handleResetTemplate}
              onToggleMetric={toggleMetric}
              onJudgeModelChange={setJudgeModel}
              onContextChange={setContext}
              onRun={handleRunEval}
              onToggleSaveForm={() => { setShowSaveForm((v) => !v); setSaveError(null) }}
              onSaveNameChange={onSaveNameChange}
              onSaveSlugChange={setSaveSlug}
              onSave={handleSavePrompt}
            />
          ) : selectedAgent && !agentSpansLoading && agentSpans.length > 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              <div className="text-center space-y-1.5">
                <p className="font-medium text-foreground">{selectedAgent.agent_key}</p>
                <p>Select an LLM span from the trace tree to evaluate it</p>
                <p className="text-xs text-muted-foreground/60">
                  {agentSpans.length} span{agentSpans.length !== 1 ? "s" : ""} in most recent run
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              <div className="text-center space-y-3">
                <p className="text-base font-medium text-foreground">Prompt Playground</p>
                <p>Create a new template or select one from the list</p>
                <button
                  type="button"
                  onClick={handleNew}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={13} />
                  New Template
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Saved Prompts management (deploy / version history) ── */}
      <SavedPromptsCard
        prompts={savedPrompts}
        loading={savedLoading}
        onDeployEnv={handleDeployEnv}
        onDelete={handleDeleteSaved}
        onRestore={handleRestore}
      />
      </div>
    </>
  )
}

export default Prompts
