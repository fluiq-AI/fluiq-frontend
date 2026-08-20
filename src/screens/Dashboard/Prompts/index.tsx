import { useEffect, useMemo, useState } from "react"
import {
  Alert02Icon,
  BotIcon,
  Cancel01Icon,
  Loading03Icon,
  PlusSignIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Pagination } from "@/components/Pagination"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Tip } from "@/components/ui/tooltip"
import type { TraceListResponse, TraceRecord } from "@/pages/Dashboard/Traces/utils/types"
import {
  formatCost,
  formatDate,
  getStr,
} from "@/pages/Dashboard/Traces/utils"
import { buildTraceTree, findGroupForTrace } from "@/pages/Dashboard/Traces/helpers/treeBuilder"
import type { AgentRow } from "@/pages/Dashboard/Agents/utils/types"

import type { CompareResult, MetricResult, PlaygroundResponse, SavedPrompt, PromptRow, PromptVersion, PromptEnv, EnvDeployment, PromptKind } from "./utils/types"
import { DEFAULT_COMPARE_MODELS, DEFAULT_JUDGE_MODEL, PROMPTS_PAGE_SIZE } from "./utils/types"
import type { ModelOption } from "./utils/types"
import { detectVars, renderTemplate, toPromptRow, toSlug } from "./utils"
import { SpanTimeline, spanTypeIcon } from "./components/SpanTimeline"
import { EvalPlayground } from "./components/EvalPlayground"
import { ToolsEditor } from "./components/ToolsEditor"
import type { McpServerDef, ToolDef } from "./components/ToolsEditor"

// ── Per-tab state ─────────────────────────────────────────────────────────────

type PromptTab = {
  id: string
  templateName: string
  templateText: string
  templateVars: Record<string, string>
  activeRow: PromptRow | null
  // Eval (used in Traces / Agents tabs)
  context: string
  selectedMetrics: Set<string>
  judgeModel: string
  runLoading: boolean
  runError: string | null
  runResults: MetricResult[] | null
  // Compare (used in Saved / New Prompt tabs)
  compareModels: string[]
  compareResults: CompareResult[] | null
  compareLoading: boolean
  compareError: string | null
  // Versions
  currentVersion: number | null   // what is loaded in the editor (may be an old version)
  latestVersion: number | null    // the server head — never changes on local load
  latestTemplate: string | null   // the server head template — never overwritten by local load
  promptVersions: PromptVersion[] | null
  versionsLoading: boolean
  // Deploy
  savedPromptId: string | null
  savedPromptEnvs: Record<PromptEnv, EnvDeployment | null>
  deployLoading: PromptEnv | null
  // Save
  showSaveForm: boolean
  saveName: string
  saveSlug: string
  saveKind: PromptKind
  /** Which slice of a run a judge grades; 'output' is the final answer. */
  saveTarget: string
  // Agentic toolset carried on the prompt (see components/ToolsEditor).
  tools: ToolDef[]
  mcpServers: McpServerDef[]
  showTools: boolean
  savePending: boolean
  saveError: string | null
  saveSuccess: boolean
}

function makeTab(overrides: Partial<PromptTab> = {}): PromptTab {
  return {
    id: crypto.randomUUID(),
    templateName: "",
    templateText: "",
    templateVars: {},
    activeRow: null,
    context: "",
    selectedMetrics: new Set(["hallucination", "relevance"]),
    judgeModel: DEFAULT_JUDGE_MODEL,
    runLoading: false,
    runError: null,
    runResults: null,
    compareModels: [...DEFAULT_COMPARE_MODELS],
    compareResults: null,
    compareLoading: false,
    compareError: null,
    showSaveForm: false,
    saveName: "",
    saveSlug: "",
    saveKind: "completion",
    saveTarget: "output",
    tools: [],
    mcpServers: [],
    showTools: false,
    savePending: false,
    saveError: null,
    saveSuccess: false,
    currentVersion: null,
    latestVersion: null,
    latestTemplate: null,
    promptVersions: null,
    versionsLoading: false,
    savedPromptId: null,
    savedPromptEnvs: { development: null, staging: null, production: null },
    deployLoading: null,
    ...overrides,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

const JUDGE_STARTER = `You are grading an AI answer.

Question: {{question}}
Answer: {{answer}}
Context: {{context}}

Decide whether the answer is acceptable. Reply with JSON only:
{"score": <0-1>, "reason": "<one sentence>"}`

/**
 * ``embedded`` drops the page header; PromptsShell renders it above the tabs.
 *
 * ``newJudgeAt`` is a timestamp the shell bumps when the Judge Prompts tab asks
 * for a new judge. A timestamp rather than a boolean so pressing the button
 * twice opens a second draft instead of silently doing nothing.
 */
function Prompts(
  { embedded = false, newJudgeAt = 0 }: { embedded?: boolean; newJudgeAt?: number } = {},
) {
  // ── Tab state ──
  const [tabs, setTabs] = useState<PromptTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  )

  // ── Data ──
  const [traces, setTraces] = useState<TraceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showDeletePrompt, setShowDeletePrompt] = useState(false)
  const [deletePromptBusy, setDeletePromptBusy] = useState(false)

  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([])
  const [savedLoading, setSavedLoading] = useState(true)

  // Chat-capable models to compare/judge with, fetched from the price table so
  // the playground never ships its own hardcoded model catalog.
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([])

  const [agentSummary, setAgentSummary] = useState<AgentRow[]>([])
  const [agentSummaryLoading, setAgentSummaryLoading] = useState(true)

  // ── Sidebar selection (page-level) ──
  const [leftTab, setLeftTab] = useState<"saved" | "traces" | "agents">("saved")
  const [selectedTraceIdx, setSelectedTraceIdx] = useState<number | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<AgentRow | null>(null)
  const [traceTreeOpen, setTraceTreeOpen] = useState(false)
  const [agentSpans, setAgentSpans] = useState<TraceRecord[]>([])
  const [agentSpansLoading, setAgentSpansLoading] = useState(false)
  const [activeTrace, setActiveTrace] = useState<TraceRecord | null>(null)

  // ── Computed ──
  const traceGroups = useMemo(() => buildTraceTree(traces), [traces])
  const agentTraceGroups = useMemo(() => buildTraceTree(agentSpans), [agentSpans])

  const singleRows = useMemo<PromptRow[]>(
    () => traces.filter((t) => t.event["type"] === "llm").map(toPromptRow),
    [traces],
  )

  const selectedGroup = useMemo(() => {
    if (selectedAgent) {
      if (activeTrace) return findGroupForTrace(agentTraceGroups, activeTrace) ?? agentTraceGroups[0] ?? null
      return agentTraceGroups[0] ?? null
    }
    const root = selectedTraceIdx !== null ? singleRows[selectedTraceIdx]?.trace : null
    return root ? findGroupForTrace(traceGroups, root) : null
  }, [traceGroups, agentTraceGroups, singleRows, selectedTraceIdx, selectedAgent, activeTrace])

  const spanTimelineTrace = activeTrace ?? agentTraceGroups[0]?.root.trace ?? agentSpans[0] ?? null

  const activeDetectedVars = useMemo(
    () => detectVars(activeTab?.templateText ?? ""),
    [activeTab?.templateText],
  )
  const activeRenderedPrompt = useMemo(
    () => renderTemplate(activeTab?.templateText ?? "", activeTab?.templateVars ?? {}),
    [activeTab?.templateText, activeTab?.templateVars],
  )

  // ── Traces list (windowed pagination) ──
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSelectedTraceIdx(null)  // selection is page-local
    authFetch<TraceListResponse>(
      `/api/v1/traces?limit=${PROMPTS_PAGE_SIZE}&offset=${page * PROMPTS_PAGE_SIZE}`,
    )
      .then((data) => {
        if (cancelled) return
        setError(null)
        setTraces(data.traces)
        setHasMore(data.traces.length >= PROMPTS_PAGE_SIZE)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.detail : "Failed to load traces")
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [page, reloadKey])

  // ── Saved prompts + agent summary (once) ──
  useEffect(() => {
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
    ;(async () => {
      try {
        const data = await authFetch<{ models: ModelOption[] }>("/api/v1/evaluate/models")
        setModelOptions(data.models)
      } catch {
        // silent — the drawer falls back to whatever ids are already selected
      }
    })()
  }, [])

  // ── Tab helpers ──
  function updateTab(id: string, updates: Partial<PromptTab>) {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }

  function updateActiveTab(updates: Partial<PromptTab>) {
    if (activeTabId) updateTab(activeTabId, updates)
  }

  function openNewTab(overrides: Partial<PromptTab> = {}) {
    const tab = makeTab(overrides)
    setTabs((prev) => [...prev, tab])
    setActiveTabId(tab.id)
    return tab.id
  }

  // "New judge prompt" from the Judge Prompts tab. Opens a draft that already
  // has the {{answer}} placeholder and the JSON contract the API enforces —
  // starting blank means the first save is rejected for a rule the author has
  // not been told about yet.
  useEffect(() => {
    if (!newJudgeAt) return
    openNewTab({
      templateName: "New judge",
      templateText: JUDGE_STARTER,
      saveKind: "judge",
      showSaveForm: true,
    })
    // openNewTab is stable for this purpose; the timestamp is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newJudgeAt])

  function closeTab(id: string) {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      const next = prev.filter((t) => t.id !== id)
      if (id === activeTabId) {
        setActiveTabId(next.length > 0 ? next[Math.max(0, idx - 1)].id : null)
      }
      return next
    })
  }

  // Load content into the active tab (or open a new one if none exists)
  function loadIntoActiveOrNew(overrides: Partial<PromptTab>) {
    if (activeTabId) {
      updateTab(activeTabId, {
        ...makeTab(),
        id: activeTabId,
        ...overrides,
      })
    } else {
      openNewTab(overrides)
    }
  }

  // ── Sidebar handlers ──
  function handleSelectSaved(p: SavedPrompt) {
    loadIntoActiveOrNew({
      templateText: p.template,
      templateName: p.name,
      saveName: p.name,
      saveSlug: p.slug,
      saveKind: p.kind ?? "completion",
      saveTarget: p.target ?? "output",
      tools: (p.tools ?? []).map((t) => ({
        name: t.name,
        description: t.description ?? "",
        parameters: t.parameters ?? { type: "object", properties: {} },
      })),
      mcpServers: (p.mcp_servers ?? []).map((srv) => ({
        label: srv.label,
        url: srv.url ?? "",
        description: srv.description ?? "",
        tools: (srv.tools ?? []).map((t) => ({
          name: t.name,
          description: t.description ?? "",
          parameters: t.parameters ?? { type: "object", properties: {} },
        })),
      })),
      // Never auto-open: the toolset is a dialog now, and popping one over the
      // editor every time someone clicks a prompt in the sidebar interrupts the
      // thing they came to do. The count on the "Tools & MCP" button is what
      // says the prompt has one.
      showTools: false,
      activeRow: null,
      savedPromptId: p.prompt_id,
      savedPromptEnvs: p.environments,
      currentVersion: p.version,
      latestVersion: p.version,
      latestTemplate: p.template,
      promptVersions: null,
    })
  }

  function handleSelectTrace(idx: number) {
    if (selectedTraceIdx === idx) {
      setSelectedTraceIdx(null)
      setActiveTrace(null)
      return
    }
    setSelectedTraceIdx(idx)
    setSelectedAgent(null)
    setAgentSpans([])
    setTraceTreeOpen(true)
    const row = singleRows[idx]
    if (row) {
      setActiveTrace(row.trace)
      loadIntoActiveOrNew({
        templateText: row.userPrompt,
        templateName: row.name !== "—" ? row.name : "",
        activeRow: row,
      })
    }
  }

  function handleActivateTrace(trace: TraceRecord) {
    const row = toPromptRow(trace)
    setActiveTrace(trace)
    loadIntoActiveOrNew({
      templateText: row.userPrompt,
      templateName: row.name !== "—" ? row.name : "",
      activeRow: row,
    })
  }

  async function handleSelectAgent(agent: AgentRow) {
    setSelectedAgent(agent)
    setAgentSpans([])
    setActiveTrace(null)
    setSelectedTraceIdx(null)
    setTraceTreeOpen(true)
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

  function reload() {
    setPage(0)
    setReloadKey((k) => k + 1)
  }

  // ── Eval handlers ──
  async function handleRunEval() {
    if (!activeTab || !activeTabId) return
    const tabId = activeTabId
    updateTab(tabId, { runLoading: true, runError: null, runResults: null })
    try {
      const resp = await authFetch<PlaygroundResponse>("/api/v1/evaluate/playground", {
        method: "POST",
        body: {
          prompt: activeRenderedPrompt || activeTab.templateText,
          response: activeTab.activeRow?.fullOutput || "",
          context: activeTab.context,
          metrics: Array.from(activeTab.selectedMetrics),
          judge_model: activeTab.judgeModel,
          thresholds: {},
        },
      })
      updateTab(tabId, { runResults: resp.results, runLoading: false })
    } catch (err) {
      updateTab(tabId, {
        runError: err instanceof ApiError ? err.detail : "Evaluation failed",
        runLoading: false,
      })
    }
  }

  // ── Compare handlers ──
  async function handleRunCompare() {
    if (!activeTab || !activeTabId) return
    const tabId = activeTabId
    updateTab(tabId, { compareLoading: true, compareError: null, compareResults: null })
    try {
      const resp = await authFetch<{ results: CompareResult[] }>("/api/v1/evaluate/compare", {
        method: "POST",
        body: {
          prompt: activeRenderedPrompt || activeTab.templateText,
          models: activeTab.compareModels,
          metrics: Array.from(activeTab.selectedMetrics),
          judge_model: activeTab.judgeModel,
          context: activeTab.context,
        },
      })
      updateTab(tabId, { compareResults: resp.results, compareLoading: false })
    } catch (err) {
      updateTab(tabId, {
        compareError: err instanceof ApiError ? err.detail : "Comparison failed",
        compareLoading: false,
      })
    }
  }

  async function handleSavePrompt() {
    if (!activeTab || !activeTabId) return
    const tabId = activeTabId
    updateTab(tabId, { savePending: true, saveError: null })
    try {
      let result: SavedPrompt
      if (activeTab.savedPromptId) {
        // Save a new version of an existing prompt
        result = await authFetch<SavedPrompt>(`/api/v1/prompts/${activeTab.savedPromptId}`, {
          method: "PATCH",
          body: {
            name: activeTab.saveName.trim() || activeTab.templateName.trim(),
            template: activeTab.templateText,
            tools: activeTab.tools,
            mcp_servers: activeTab.mcpServers,
            target: activeTab.saveTarget,
          },
        })
        setSavedPrompts((prev) => prev.map((p) => (p.prompt_id === result.prompt_id ? result : p)))
      } else {
        if (!activeTab.saveName.trim() || !activeTab.saveSlug.trim()) {
          updateTab(tabId, { savePending: false })
          return
        }
        result = await authFetch<SavedPrompt>("/api/v1/prompts", {
          method: "POST",
          body: {
            name: activeTab.saveName.trim(),
            slug: activeTab.saveSlug.trim(),
            template: activeTab.templateText,
            kind: activeTab.saveKind,
            model:
              activeTab.activeRow?.model && activeTab.activeRow.model !== "—"
                ? activeTab.activeRow.model
                : undefined,
            variables: activeDetectedVars,
            tools: activeTab.tools,
            mcp_servers: activeTab.mcpServers,
            target: activeTab.saveTarget,
          },
        })
        setSavedPrompts((prev) => [result, ...prev])
      }
      updateTab(tabId, {
        showSaveForm: false,
        saveSuccess: true,
        savePending: false,
        savedPromptId: result.prompt_id,
        savedPromptEnvs: result.environments,
        currentVersion: result.version,
        latestVersion: result.version,
        latestTemplate: result.template,
        promptVersions: null,
      })
      setTimeout(() => updateTab(tabId, { saveSuccess: false }), 3000)
    } catch (err) {
      updateTab(tabId, {
        saveError: err instanceof ApiError ? err.detail : "Save failed",
        savePending: false,
      })
    }
  }

  async function handleLoadVersionHistory() {
    if (!activeTab || !activeTabId || !activeTab.savedPromptId) return
    const tabId = activeTabId
    updateTab(tabId, { versionsLoading: true })
    try {
      const data = await authFetch<{ versions: PromptVersion[] }>(
        `/api/v1/prompts/${activeTab.savedPromptId}/versions`,
      )
      updateTab(tabId, { promptVersions: data.versions, versionsLoading: false })
    } catch {
      updateTab(tabId, { versionsLoading: false })
    }
  }

  function handleLoadVersion(v: PromptVersion) {
    if (!activeTabId) return
    updateTab(activeTabId, {
      templateText: v.template,
      templateName: v.name,
      saveName: v.name,
      currentVersion: v.version,
    })
  }

  async function handleRestoreVersion(version: number) {
    if (!activeTab || !activeTabId || !activeTab.savedPromptId) return
    const tabId = activeTabId
    const promptId = activeTab.savedPromptId
    try {
      const result = await authFetch<SavedPrompt>(
        `/api/v1/prompts/${promptId}/versions/${version}/restore`,
        { method: "POST" },
      )
      setSavedPrompts((prev) => prev.map((p) => (p.prompt_id === result.prompt_id ? result : p)))
      updateTab(tabId, {
        templateText: result.template,
        templateName: result.name,
        saveName: result.name,
        savedPromptEnvs: result.environments,
        currentVersion: result.version,
        latestVersion: result.version,
        latestTemplate: result.template,
        promptVersions: null,
      })
    } catch {
      // silent — user will see the tab state unchanged
    }
  }

  async function handleDeployEnv(env: PromptEnv, deploy: boolean) {
    if (!activeTab || !activeTabId || !activeTab.savedPromptId) return
    const tabId = activeTabId
    const promptId = activeTab.savedPromptId
    updateTab(tabId, { deployLoading: env })
    try {
      const result = await authFetch<SavedPrompt>(
        `/api/v1/prompts/${promptId}/environments/${env}`,
        { method: "POST", body: { deploy } },
      )
      setSavedPrompts((prev) => prev.map((p) => (p.prompt_id === result.prompt_id ? result : p)))
      updateTab(tabId, { savedPromptEnvs: result.environments, deployLoading: null })
    } catch {
      updateTab(tabId, { deployLoading: null })
    }
  }

  function handleDeleteSaved() {
    if (!activeTab || !activeTabId || !activeTab.savedPromptId) return
    setShowDeletePrompt(true)
  }

  async function confirmDeleteSaved() {
    if (!activeTab || !activeTabId || !activeTab.savedPromptId) return
    const tabId = activeTabId
    const promptId = activeTab.savedPromptId
    const name = activeTab.templateName
    setDeletePromptBusy(true)
    try {
      await authFetch(`/api/v1/prompts/${promptId}`, { method: "DELETE" })
      setSavedPrompts((prev) => prev.filter((p) => p.prompt_id !== promptId))
      updateTab(tabId, {
        savedPromptId: null,
        savedPromptEnvs: { development: null, staging: null, production: null },
        currentVersion: null,
        latestVersion: null,
        promptVersions: null,
      })
      setShowDeletePrompt(false)
      toast.success(`Prompt "${name}" deleted`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to delete prompt")
    } finally {
      setDeletePromptBusy(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const LEFT_TABS = [
    { key: "saved",  label: "Saved",  count: savedPrompts.length,  busy: savedLoading },
    { key: "traces", label: "Traces", count: singleRows.length,    busy: loading },
    { key: "agents", label: "Agents", count: agentSummary.length,  busy: agentSummaryLoading },
  ] as const

  return (
    <>
      {embedded ? null : (
        <DashboardPageHeader
          title="Prompts"
          description="Write, discover, evaluate, and deploy prompt templates."
        />
      )}

      {/* ── Full-height IDE layout ──
          Shorter when embedded: the shell's header + tab bar sit above it. */}
      <div
        className={cn(
          "flex overflow-hidden",
          embedded ? "h-[calc(100vh-136px)]" : "h-[calc(100vh-48px)]",
        )}
      >

        {/* ── Left sidebar ── */}
        <div className="flex w-52 shrink-0 flex-col border-r border-border/60 bg-background">

          {/* New Prompt button */}
          <div className="border-b border-border/60 p-2.5">
            <button
              type="button"
              onClick={() => openNewTab()}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={13} />
              New Prompt
            </button>
          </div>

          {/* Sidebar tabs */}
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
                <span
                  className={cn(
                    "rounded-full px-1.5 font-mono text-[9px]",
                    leftTab === key ? "text-primary" : "text-muted-foreground/60",
                  )}
                >
                  {busy ? "…" : count}
                </span>
              </button>
            ))}
          </div>

          {/* List area */}
          <div className="min-h-0 flex-1 overflow-y-auto">

            {/* Saved */}
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
                    <div className="flex w-full min-w-0 items-center gap-1.5">
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">{p.name}</span>
                      {p.kind === "judge" ? (
                        <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          Judge
                        </span>
                      ) : null}
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground/50">
                      v{p.version} · {p.slug}
                    </span>
                  </button>
                ))
              )
            ) : null}

            {/* Traces */}
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
                        selectedTraceIdx === idx && "bg-primary/5 text-primary",
                      )}
                    >
                      <div className="flex w-full min-w-0 items-center gap-1.5">
                        <HugeiconsIcon
                          icon={spanTypeIcon("llm", typeof row.trace.event["model"] === "string" ? row.trace.event["model"] as string : null)}
                          size={11}
                          className={cn(
                            "shrink-0",
                            selectedTraceIdx === idx ? "text-primary" : "text-muted-foreground/60",
                          )}
                        />
                        <span className="truncate text-xs font-medium">{row.name}</span>
                      </div>
                      <span className="pl-4 font-mono text-[10px] text-muted-foreground/50">
                        {row.model !== "—" ? row.model : formatDate(row.trace.ingested_at)}
                      </span>
                    </button>
                  ))}
                  <Pagination
                    page={page}
                    hasMore={hasMore}
                    loading={loading}
                    compact
                    onPrev={() => setPage((p) => Math.max(0, p - 1))}
                    onNext={() => setPage((p) => p + 1)}
                  />
                </>
              )
            ) : null}

            {/* Agents */}
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
                  const isSelected =
                    selectedAgent?.agent_key === a.agent_key &&
                    selectedAgent?.agent_kind === a.agent_kind
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
                      <div className="flex w-full min-w-0 items-center gap-1.5">
                        <HugeiconsIcon
                          icon={BotIcon}
                          size={11}
                          className={cn("shrink-0", isSelected ? "text-primary" : "text-muted-foreground/60")}
                        />
                        <span
                          className={cn(
                            "truncate font-mono text-xs font-medium",
                            isSelected && "text-primary",
                          )}
                        >
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

        </div>

        {/* ── Trace tree sidebar ── */}
        {traceTreeOpen && selectedAgent && agentSpansLoading ? (
          <div className="flex w-56 shrink-0 items-center gap-2 border-l border-border/60 px-4 py-3 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
            Loading trace…
          </div>
        ) : traceTreeOpen && selectedGroup && spanTimelineTrace ? (
          <div className="flex w-56 shrink-0 flex-col border-l border-border/60 overflow-hidden">
            <SpanTimeline
              group={selectedGroup}
              selectedTrace={spanTimelineTrace}
              onSelectTrace={handleActivateTrace}
              sticky={false}
              bare
              onClose={() => setTraceTreeOpen(false)}
            />
          </div>
        ) : null}

        {/* ── Right: tab strip + editor ── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* Tab strip */}
          <div className="flex h-9 shrink-0 items-center border-b border-border/60 bg-muted/10 overflow-hidden">

            {/* Scrollable tabs */}
            <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={cn(
                    "group relative flex h-9 min-w-0 max-w-44 shrink-0 items-center gap-1.5 border-r border-border/60 px-3 text-xs transition-colors",
                    tab.id === activeTabId
                      ? "bg-background text-foreground shadow-[inset_0_-2px_0_0] shadow-primary"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {tab.templateName || "Untitled"}
                  </span>
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); closeTab(tab.id) } }}
                    className="flex shrink-0 cursor-pointer items-center rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-60 hover:!opacity-100"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={9} />
                  </span>
                </button>
              ))}

              {/* New tab button */}
              <Tip content="New prompt tab">
                <button
                  type="button"
                  onClick={() => openNewTab()}
                  className="flex h-9 shrink-0 items-center px-3 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={13} />
                </button>
              </Tip>
            </div>

            {/* Refresh (right side of tab strip) */}
            <div className="flex shrink-0 items-center border-l border-border/60 px-2">
              <Tip content="Refresh traces">
                <button
                  type="button"
                  onClick={reload}
                  disabled={loading}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                >
                  <HugeiconsIcon
                    icon={loading ? Loading03Icon : RefreshIcon}
                    size={13}
                    className={loading ? "animate-spin" : undefined}
                  />
                </button>
              </Tip>
            </div>
          </div>

          {/* Error banner */}
          {error ? (
            <div className="flex shrink-0 items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              <HugeiconsIcon icon={Alert02Icon} size={13} />
              {error}
            </div>
          ) : null}

          {/* Editor area */}
          {activeTab ? (
            <EvalPlayground
              row={activeTab.activeRow}
              templateName={activeTab.templateName}
              templateText={activeTab.templateText}
              templateVars={activeTab.templateVars}
              detectedVars={activeDetectedVars}
              renderedPrompt={activeRenderedPrompt}
              modelOptions={modelOptions}
              compareModels={activeTab.compareModels}
              compareResults={activeTab.compareResults}
              compareLoading={activeTab.compareLoading}
              compareError={activeTab.compareError}
              onCompareModelChange={(idx, model) =>
                updateActiveTab({
                  compareModels: activeTab.compareModels.map((m, i) => (i === idx ? model : m)),
                })
              }
              onAddCompareModel={() =>
                updateActiveTab({ compareModels: [...activeTab.compareModels, "claude-opus-4-7"] })
              }
              onRemoveCompareModel={(idx) =>
                updateActiveTab({ compareModels: activeTab.compareModels.filter((_, i) => i !== idx) })
              }
              onSetCompareModels={(models) => updateActiveTab({ compareModels: models })}
              onRunCompare={handleRunCompare}
              showSaveForm={activeTab.showSaveForm}
              saveName={activeTab.saveName}
              saveSlug={activeTab.saveSlug}
              saveKind={activeTab.saveKind}
              onSaveKindChange={(k) => updateActiveTab({ saveKind: k })}
              saveTarget={activeTab.saveTarget}
              onSaveTargetChange={(t) => updateActiveTab({ saveTarget: t })}
              savePending={activeTab.savePending}
              saveError={activeTab.saveError}
              saveSuccess={activeTab.saveSuccess}
              onTemplateNameChange={(v) => updateActiveTab({ templateName: v, saveName: v, saveSlug: toSlug(v) })}
              onTemplateChange={(v) => updateActiveTab({ templateText: v })}
              onVarChange={(name, value) =>
                updateActiveTab({
                  templateVars: { ...(activeTab.templateVars), [name]: value },
                })
              }
              onResetTemplate={() =>
                updateActiveTab({
                  templateText: activeTab.activeRow?.userPrompt ?? "",
                  templateVars: {},
                })
              }
              selectedMetrics={activeTab.selectedMetrics}
              judgeModel={activeTab.judgeModel}
              judgeModelLabel={
                modelOptions.find((m) => m.id === activeTab.judgeModel)?.label ??
                activeTab.judgeModel
              }
              context={activeTab.context}
              runLoading={activeTab.runLoading}
              runError={activeTab.runError}
              runResults={activeTab.runResults}
              onToggleMetric={(m) => {
                const next = new Set(activeTab.selectedMetrics)
                if (next.has(m)) next.delete(m)
                else next.add(m)
                updateActiveTab({ selectedMetrics: next })
              }}
              onJudgeModelChange={(m) => updateActiveTab({ judgeModel: m })}
              onContextChange={(v) => updateActiveTab({ context: v })}
              onRun={handleRunEval}
              onToggleSaveForm={() =>
                updateActiveTab({
                  showSaveForm: !activeTab.showSaveForm,
                  saveError: null,
                })
              }
              onSaveNameChange={(v) =>
                updateActiveTab({ saveName: v, saveSlug: toSlug(v), templateName: v })
              }
              onSaveSlugChange={(v) => updateActiveTab({ saveSlug: v })}
              onSave={handleSavePrompt}
              currentVersion={activeTab.currentVersion}
              latestVersion={activeTab.latestVersion}
              latestTemplate={activeTab.latestTemplate}
              promptVersions={activeTab.promptVersions}
              versionsLoading={activeTab.versionsLoading}
              onLoadVersionHistory={handleLoadVersionHistory}
              onLoadVersion={handleLoadVersion}
              onRestoreVersion={handleRestoreVersion}
              savedPromptId={activeTab.savedPromptId}
              savedPromptEnvs={activeTab.savedPromptEnvs}
              savedPromptSlug={savedPrompts.find((p) => p.prompt_id === activeTab.savedPromptId)?.slug ?? null}
              deployLoading={activeTab.deployLoading}
              onDeploy={handleDeployEnv}
              onDelete={handleDeleteSaved}
              showTools={activeTab.showTools}
              onToggleTools={() => updateActiveTab({ showTools: !activeTab.showTools })}
              toolsCount={
                activeTab.tools.length +
                activeTab.mcpServers.reduce((n, s) => n + s.tools.length, 0)
              }
              toolsPanel={
                <ToolsEditor
                  tools={activeTab.tools}
                  mcpServers={activeTab.mcpServers}
                  onToolsChange={(tools) => updateActiveTab({ tools })}
                  onMcpChange={(mcpServers) => updateActiveTab({ mcpServers })}
                />
              }
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              <div className="space-y-3 text-center">
                <p className="text-base font-medium text-foreground">Prompt Playground</p>
                <p>Create a new tab or select a prompt from the list</p>
                <button
                  type="button"
                  onClick={() => openNewTab()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={13} />
                  New Prompt
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <ConfirmDialog
        open={showDeletePrompt}
        onOpenChange={(v) => { if (!v) setShowDeletePrompt(false) }}
        title="Delete prompt"
        description={
          <>Delete <span className="font-mono text-foreground">{activeTab?.templateName}</span> and all its versions and environment deployments. This cannot be undone.</>
        }
        confirmWord={activeTab?.templateName ?? ""}
        confirmLabel="Delete prompt"
        destructive
        busy={deletePromptBusy}
        onConfirm={confirmDeleteSaved}
      />
    </>
  )
}

export default Prompts
