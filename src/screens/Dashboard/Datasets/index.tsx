import { useCallback, useEffect, useState } from "react"
import {
  Alert02Icon,
  ArrowDown01Icon,
  Database01Icon,
  Delete02Icon,
  GridTableIcon,
  Loading03Icon,
  RefreshIcon,
  RoboticIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Tip } from "@/components/ui/tooltip"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Pagination } from "@/components/Pagination"
import { DatasetRuns } from "./DatasetRuns"
import { ConnectAgentsModal } from "./ConnectAgentsModal"
import { TrajectoryView } from "./TrajectoryView"
import { NewDatasetDialog, type Dataset, type DatasetKind } from "./NewDatasetDialog"
import { ImportDatasetDialog } from "./ImportDatasetDialog"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExampleEnrichment {
  eval?:     Record<string, number>
  security?: { risk_level: string; blocked: boolean; threats: string[] }
  cost?:     number
}

interface DatasetExample {
  example_id:      string
  dataset_id:      string
  org_id:          string
  input:           string
  expected_output: string | null
  metadata:        Record<string, unknown>
  created_at:      string | null
  enrichment?:     ExampleEnrichment
}

const RISK_PILL: Record<string, string> = {
  clean:  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  low:    "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  medium: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  high:   "bg-destructive/15 text-destructive",
}

function scorePillClass(v: number): string {
  if (v >= 0.8) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
  if (v >= 0.5) return "bg-amber-500/15 text-amber-600 dark:text-amber-400"
  return "bg-destructive/15 text-destructive"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function truncate(s: string, max = 120): string {
  return s.length <= max ? s : s.slice(0, max) + "…"
}

const KIND_LABEL: Record<DatasetKind, string> = {
  single:  "Single prompt",
  agentic: "Agentic",
}

function KindBadge({ kind }: { kind: DatasetKind }) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        kind === "agentic"
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground",
      )}
    >
      {KIND_LABEL[kind]}
    </span>
  )
}

const EXAMPLES_PAGE_SIZE = 50

// ── Page ──────────────────────────────────────────────────────────────────────

function Datasets() {
  const [datasets,      setDatasets]      = useState<Dataset[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [selectedId,    setSelectedId]    = useState<string | null>(null)

  // New-dataset dialog
  const [showCreate,    setShowCreate]    = useState(false)
  const [showImport,    setShowImport]    = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await authFetch<{ datasets: Dataset[] }>("/api/v1/datasets")
      setDatasets(data.datasets)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load datasets")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleCreated(row: Dataset) {
    setDatasets((prev) => [row, ...prev])
    setSelectedId(row.dataset_id)
  }

  async function handleDeleteDataset(datasetId: string) {
    const name = datasets.find((d) => d.dataset_id === datasetId)?.name ?? "Dataset"
    try {
      await authFetch(`/api/v1/datasets/${datasetId}`, { method: "DELETE" })
      setDatasets((prev) => prev.filter((d) => d.dataset_id !== datasetId))
      if (selectedId === datasetId) setSelectedId(null)
      toast.success(`Dataset "${name}" deleted`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to delete dataset")
      throw err
    }
  }

  function handleUpdateCount(datasetId: string, delta: number) {
    setDatasets((prev) =>
      prev.map((d) =>
        d.dataset_id === datasetId
          ? { ...d, example_count: Math.max(0, d.example_count + delta) }
          : d,
      ),
    )
  }

  const selectedDataset = datasets.find((d) => d.dataset_id === selectedId) ?? null

  return (
    <>
      <DashboardPageHeader
        title="Datasets"
        description="Curated input/output pairs collected from traces, used as golden sets for evaluation."
      />
      <div className="px-6 py-6">
      <div className="mb-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <HugeiconsIcon icon={loading ? Loading03Icon : RefreshIcon} size={14} className={loading ? "animate-spin" : undefined} />
          Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
          <HugeiconsIcon icon={Upload01Icon} size={14} />
          Import
        </Button>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <HugeiconsIcon icon={Database01Icon} size={14} />
          New Dataset
        </Button>
      </div>

      <NewDatasetDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={handleCreated}
      />

      <ImportDatasetDialog
        open={showImport}
        onOpenChange={setShowImport}
        datasets={datasets}
        onImported={load}
      />

      {/* ── Error banner ── */}
      {error ? (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <HugeiconsIcon icon={Alert02Icon} size={14} />
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* ── Dataset list ── */}
        <div className="space-y-2">
          <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
            Datasets ({datasets.length})
          </p>
          {loading && datasets.length === 0 ? (
            <div className="flex items-center gap-2 px-1 py-4 text-xs text-muted-foreground">
              <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
              Loading…
            </div>
          ) : datasets.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 px-4 py-8 text-center">
              <HugeiconsIcon icon={Database01Icon} size={24} className="mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No datasets yet.</p>
              <p className="text-[11px] text-muted-foreground/60">
                Create one or add examples from the Prompts playground.
              </p>
            </div>
          ) : (
            datasets.map((d) => (
              <button
                key={d.dataset_id}
                type="button"
                onClick={() => setSelectedId(d.dataset_id === selectedId ? null : d.dataset_id)}
                className={cn(
                  "w-full rounded-md border px-3 py-2.5 text-left transition-colors",
                  selectedId === d.dataset_id
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/60 bg-background hover:bg-muted/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      "truncate text-sm font-medium",
                      selectedId === d.dataset_id ? "text-primary" : "text-foreground",
                    )}>
                      {d.name}
                    </p>
                    {d.description ? (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {d.description}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {d.example_count}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <KindBadge kind={d.kind} />
                  <span className="text-[10px] text-muted-foreground/50">
                    {formatDate(d.created_at)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* ── Examples panel ── */}
        {selectedDataset ? (
          <ExamplesPanel
            dataset={selectedDataset}
            onDelete={() => handleDeleteDataset(selectedDataset.dataset_id)}
            onExampleRemoved={() => handleUpdateCount(selectedDataset.dataset_id, -1)}
            onExamplesAdded={(n) => handleUpdateCount(selectedDataset.dataset_id, n)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border/60 py-20 text-center">
            <HugeiconsIcon icon={GridTableIcon} size={28} className="mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Select a dataset to view its examples</p>
          </div>
        )}
      </div>
      </div>
    </>
  )
}

// ── Examples Panel ────────────────────────────────────────────────────────────

function ExamplesPanel({
  dataset,
  onDelete,
  onExampleRemoved,
  onExamplesAdded,
}: {
  dataset: Dataset
  onDelete: () => void
  onExampleRemoved: () => void
  onExamplesAdded: (count: number) => void
}) {
  const [examples,     setExamples]     = useState<DatasetExample[]>([])
  const [loading,      setLoading]      = useState(true)
  const [hasMore,      setHasMore]      = useState(false)
  const [page,         setPage]         = useState(0)
  const [reloadKey,    setReloadKey]    = useState(0)
  const [expandedId,   setExpandedId]   = useState<string | null>(null)
  const [deletingId,      setDeletingId]      = useState<string | null>(null)
  const [showDeleteDataset, setShowDeleteDataset] = useState(false)
  const [deletingDataset, setDeletingDataset] = useState(false)
  const [showConnect,     setShowConnect]     = useState(false)
  const [tab,             setTab]             = useState<"runs" | "dataset">("runs")

  async function confirmDeleteDataset() {
    setDeletingDataset(true)
    try {
      await Promise.resolve(onDelete())
      // Success unmounts this panel (selection cleared); nothing more to do.
    } catch {
      // Parent surfaced the error via toast; keep the dialog open.
    } finally {
      setDeletingDataset(false)
    }
  }

  // Switching dataset always starts at the first page.
  useEffect(() => { setPage(0) }, [dataset.dataset_id])

  // Windowed pagination: fetch one page (replacing the list) on dataset / page /
  // reload change. `hasMore` = the page came back full.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setExpandedId(null)
    authFetch<{ examples: DatasetExample[] }>(
      `/api/v1/datasets/${dataset.dataset_id}/examples?limit=${EXAMPLES_PAGE_SIZE}&offset=${page * EXAMPLES_PAGE_SIZE}`,
    )
      .then((data) => {
        if (cancelled) return
        setExamples(data.examples)
        setHasMore(data.examples.length >= EXAMPLES_PAGE_SIZE)
      })
      .catch(() => { if (!cancelled) setExamples([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [dataset.dataset_id, page, reloadKey])

  // Reload from the first page (after an import, or the manual refresh button).
  const reload = useCallback(() => {
    setPage(0)
    setReloadKey((k) => k + 1)
  }, [])

  async function handleDeleteExample(exampleId: string) {
    setDeletingId(exampleId)
    try {
      await authFetch(
        `/api/v1/datasets/${dataset.dataset_id}/examples/${exampleId}`,
        { method: "DELETE" },
      )
      setExamples((prev) => prev.filter((e) => e.example_id !== exampleId))
      onExampleRemoved()
      toast.success("Example removed")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to remove example")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card className="self-start">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{dataset.name}</CardTitle>
              <KindBadge kind={dataset.kind} />
            </div>
            {dataset.description ? (
              <CardDescription className="mt-0.5">{dataset.description}</CardDescription>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Connecting an agent imports whole run trajectories — only
                meaningful for agentic datasets. */}
            {dataset.kind === "agentic" ? (
              <Button variant="outline" size="sm" onClick={() => setShowConnect(true)}>
                <HugeiconsIcon icon={RoboticIcon} size={13} />
                Connect Agents
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={reload}
              disabled={loading}
            >
              <HugeiconsIcon
                icon={loading ? Loading03Icon : RefreshIcon}
                size={13}
                className={loading ? "animate-spin" : undefined}
              />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDataset(true)}
              className="text-destructive hover:text-destructive"
            >
              <HugeiconsIcon icon={Delete02Icon} size={13} />
              Delete
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/60">
          {dataset.example_count} example{dataset.example_count !== 1 ? "s" : ""}
          {" · "}Created {formatDate(dataset.created_at)}
        </p>
      </CardHeader>

      {/* Batch actions, then the Runs / Dataset tabs. DatasetRuns owns the
          buttons, the tab strip and the Runs tab; the Dataset tab content is
          rendered below so the examples list stays with its own state. */}
      <div className="border-t border-border/60 px-6 py-4">
        <DatasetRuns
          dataset={dataset}
          tab={tab}
          onTabChange={setTab}
          exampleCount={dataset.example_count}
        />
      </div>

      <CardContent className={cn("p-0", tab !== "dataset" && "hidden")}>
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
            Loading examples…
          </div>
        ) : examples.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <HugeiconsIcon icon={GridTableIcon} size={24} className="mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No examples yet.</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Add examples from the{" "}
              <span className="font-medium text-foreground/70">Prompts</span>{" "}
              playground using the "Add to Dataset" button.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {examples.map((ex, idx) => {
              const expanded = expandedId === ex.example_id
              const meta = ex.metadata ?? {}
              const model = typeof meta["model"] === "string" ? meta["model"] : null
              const enr = ex.enrichment
              const cost = enr?.cost ?? (typeof meta["cost"] === "number" ? (meta["cost"] as number) : null)
              const traceId = typeof meta["source_trace_id"] === "string" ? meta["source_trace_id"] as string : null
              // Worst (lowest) eval score across metrics/layers — the quality headline.
              const evalScores = enr?.eval ? Object.values(enr.eval) : []
              const evalMin = evalScores.length ? Math.min(...evalScores) : null
              const sec = enr?.security

              return (
                <div key={ex.example_id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : ex.example_id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground/50 w-5 text-right">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-foreground">
                          {truncate(ex.input, 100)}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          {model ? (
                            <span className="font-mono text-[10px] text-muted-foreground/60">{model}</span>
                          ) : null}
                          {cost != null ? (
                            <span className="font-mono text-[10px] text-muted-foreground/60">
                              ${cost.toFixed(4)}
                            </span>
                          ) : null}
                          {traceId ? (
                            <span className="font-mono text-[10px] text-muted-foreground/50">
                              trace:{traceId.slice(0, 8)}…
                            </span>
                          ) : null}
                          {evalMin != null ? (
                            <span className={cn("rounded px-1.5 py-0.5 font-mono text-[9px] font-medium", scorePillClass(evalMin))}>
                              eval {evalMin.toFixed(2)}
                            </span>
                          ) : null}
                          {sec ? (
                            <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium capitalize", RISK_PILL[sec.risk_level] ?? RISK_PILL.clean)}>
                              {sec.blocked ? "blocked" : sec.risk_level}
                            </span>
                          ) : null}
                          <span className="text-[10px] text-muted-foreground/40">
                            {formatDate(ex.created_at)}
                          </span>
                        </div>
                      </div>
                      <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        size={11}
                        className={cn(
                          "shrink-0 text-muted-foreground/40 transition-transform",
                          expanded && "rotate-180",
                        )}
                      />
                    </button>
                    <Tip content="Remove example">
                      <button
                        type="button"
                        disabled={deletingId === ex.example_id}
                        onClick={() => handleDeleteExample(ex.example_id)}
                        className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border/60 text-muted-foreground/50 transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-40"
                      >
                        <HugeiconsIcon
                          icon={deletingId === ex.example_id ? Loading03Icon : Delete02Icon}
                          size={11}
                          className={deletingId === ex.example_id ? "animate-spin" : undefined}
                        />
                      </button>
                    </Tip>
                  </div>

                  {expanded ? (
                    <div className="mt-3 space-y-3 pl-7">
                      {traceId ? (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                            Trajectory
                            <span className="ml-1 font-normal normal-case text-muted-foreground/40">
                              (the full agent run: steps · agents · tools · MCP)
                            </span>
                          </p>
                          <TrajectoryView datasetId={dataset.dataset_id} exampleId={ex.example_id} />
                        </div>
                      ) : null}
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                          Input
                        </p>
                        <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded border border-border/60 bg-muted/40 p-2.5 font-mono text-[11px] leading-relaxed text-foreground">
                          {ex.input}
                        </pre>
                      </div>
                      {ex.expected_output ? (
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                            Expected Output
                          </p>
                          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded border border-border/60 bg-muted/40 p-2.5 font-mono text-[11px] leading-relaxed text-foreground">
                            {ex.expected_output}
                          </pre>
                        </div>
                      ) : null}
                      {enr && (enr.eval || enr.security) ? (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                            Run signals
                            <span className="ml-1 font-normal normal-case text-muted-foreground/40">
                              (from the source trace · backfills as workers finish)
                            </span>
                          </p>
                          {enr.eval ? (
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(enr.eval).map(([k, v]) => (
                                <span key={k} className={cn("rounded px-1.5 py-0.5 font-mono text-[10px]", scorePillClass(v))}>
                                  {k.replace(/_/g, " ")} {v.toFixed(2)}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {sec ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium capitalize", RISK_PILL[sec.risk_level] ?? RISK_PILL.clean)}>
                                {sec.risk_level} risk
                              </span>
                              {sec.blocked ? (
                                <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                                  would block
                                </span>
                              ) : null}
                              {sec.threats.map((t) => (
                                <span key={t} className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">
                                  {t.replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
        <Pagination
          page={page}
          hasMore={hasMore}
          loading={loading}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </CardContent>

      {showConnect ? (
        <ConnectAgentsModal
          datasetId={dataset.dataset_id}
          onClose={() => setShowConnect(false)}
          onDone={(n) => {
            setShowConnect(false)
            if (n > 0) {
              onExamplesAdded(n)
              reload()
              toast.success(`Imported ${n} example${n !== 1 ? "s" : ""} from the agent`)
            } else {
              toast.success("Agent linked. Its future runs will auto-append")
            }
          }}
        />
      ) : null}

      <ConfirmDialog
        open={showDeleteDataset}
        onOpenChange={(v) => { if (!v) setShowDeleteDataset(false) }}
        title="Delete dataset"
        description={
          <>Delete <span className="font-medium text-foreground">{dataset.name}</span> and all {dataset.example_count} of its examples, runs, and agent links. This cannot be undone.</>
        }
        confirmWord={dataset.name}
        confirmLabel="Delete dataset"
        destructive
        busy={deletingDataset}
        onConfirm={confirmDeleteDataset}
      />
    </Card>
  )
}

export default Datasets
