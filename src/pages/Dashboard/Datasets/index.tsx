import { useCallback, useEffect, useState } from "react"
import {
  Alert02Icon,
  ArrowDown01Icon,
  Database01Icon,
  Delete02Icon,
  FloppyDiskIcon,
  GridTableIcon,
  Loading03Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Dataset {
  dataset_id:    string
  org_id:        string
  name:          string
  description:   string | null
  example_count: number
  created_at:    string | null
  updated_at:    string | null
}

interface DatasetExample {
  example_id:      string
  dataset_id:      string
  org_id:          string
  input:           string
  expected_output: string | null
  metadata:        Record<string, unknown>
  created_at:      string | null
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

// ── Page ──────────────────────────────────────────────────────────────────────

function Datasets() {
  const [datasets,      setDatasets]      = useState<Dataset[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [selectedId,    setSelectedId]    = useState<string | null>(null)

  // Create form
  const [showCreate,    setShowCreate]    = useState(false)
  const [createName,    setCreateName]    = useState("")
  const [createDesc,    setCreateDesc]    = useState("")
  const [createPending, setCreatePending] = useState(false)
  const [createError,   setCreateError]   = useState<string | null>(null)

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

  async function handleCreate() {
    if (!createName.trim()) return
    setCreatePending(true)
    setCreateError(null)
    try {
      const row = await authFetch<Dataset>("/api/v1/datasets", {
        method: "POST",
        body: { name: createName.trim(), description: createDesc.trim() || null },
      })
      setDatasets((prev) => [row, ...prev])
      setShowCreate(false)
      setCreateName("")
      setCreateDesc("")
      setSelectedId(row.dataset_id)
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.detail : "Failed to create dataset")
    } finally {
      setCreatePending(false)
    }
  }

  async function handleDeleteDataset(datasetId: string) {
    try {
      await authFetch(`/api/v1/datasets/${datasetId}`, { method: "DELETE" })
      setDatasets((prev) => prev.filter((d) => d.dataset_id !== datasetId))
      if (selectedId === datasetId) setSelectedId(null)
    } catch {
      // silent
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
      {/* ── Header ── */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Datasets
          </h1>
          <p className="mt-2 text-muted-foreground">
            Curated input/output pairs collected from traces — use them as golden sets for evaluation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <HugeiconsIcon
              icon={loading ? Loading03Icon : RefreshIcon}
              size={14}
              className={loading ? "animate-spin" : undefined}
            />
            Refresh
          </Button>
          <Button size="sm" onClick={() => { setShowCreate((v) => !v); setCreateError(null) }}>
            <HugeiconsIcon icon={Database01Icon} size={14} />
            New Dataset
          </Button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error ? (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <HugeiconsIcon icon={Alert02Icon} size={14} />
          {error}
        </div>
      ) : null}

      {/* ── Create form ── */}
      {showCreate ? (
        <Card className="mb-6">
          <CardContent className="pt-5 space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
              New Dataset
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. customer-support-v1"
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Description
                  <span className="ml-1 font-normal text-muted-foreground/60">(optional)</span>
                </Label>
                <Input
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="What is this dataset for?"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            {createError ? <p className="text-xs text-destructive">{createError}</p> : null}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={createPending || !createName.trim()}
              >
                {createPending ? (
                  <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
                ) : (
                  <HugeiconsIcon icon={FloppyDiskIcon} size={13} />
                )}
                Create
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
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
                <p className="mt-1 text-[10px] text-muted-foreground/50">
                  {formatDate(d.created_at)}
                </p>
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
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border/60 py-20 text-center">
            <HugeiconsIcon icon={GridTableIcon} size={28} className="mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Select a dataset to view its examples</p>
          </div>
        )}
      </div>
    </>
  )
}

// ── Examples Panel ────────────────────────────────────────────────────────────

function ExamplesPanel({
  dataset,
  onDelete,
  onExampleRemoved,
}: {
  dataset: Dataset
  onDelete: () => void
  onExampleRemoved: () => void
}) {
  const [examples,     setExamples]     = useState<DatasetExample[]>([])
  const [loading,      setLoading]      = useState(true)
  const [expandedId,   setExpandedId]   = useState<string | null>(null)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)
  const [confirmDel,   setConfirmDel]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authFetch<{ examples: DatasetExample[] }>(
        `/api/v1/datasets/${dataset.dataset_id}/examples`,
      )
      setExamples(data.examples)
    } catch {
      setExamples([])
    } finally {
      setLoading(false)
    }
  }, [dataset.dataset_id])

  useEffect(() => {
    setLoading(true)
    setExamples([])
    setExpandedId(null)
    load()
  }, [dataset.dataset_id, load])

  async function handleDeleteExample(exampleId: string) {
    setDeletingId(exampleId)
    try {
      await authFetch(
        `/api/v1/datasets/${dataset.dataset_id}/examples/${exampleId}`,
        { method: "DELETE" },
      )
      setExamples((prev) => prev.filter((e) => e.example_id !== exampleId))
      onExampleRemoved()
    } catch {
      // silent
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card className="self-start">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{dataset.name}</CardTitle>
            {dataset.description ? (
              <CardDescription className="mt-0.5">{dataset.description}</CardDescription>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
            >
              <HugeiconsIcon
                icon={loading ? Loading03Icon : RefreshIcon}
                size={13}
                className={loading ? "animate-spin" : undefined}
              />
            </Button>
            {confirmDel ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { setConfirmDel(false); onDelete() }}
                >
                  Delete dataset
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDel(false)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDel(true)}
                className="text-destructive hover:text-destructive"
              >
                <HugeiconsIcon icon={Delete02Icon} size={13} />
                Delete
              </Button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/60">
          {dataset.example_count} example{dataset.example_count !== 1 ? "s" : ""}
          {" · "}Created {formatDate(dataset.created_at)}
        </p>
      </CardHeader>

      <CardContent className="p-0">
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
              const cost  = typeof meta["cost"]  === "number" ? (meta["cost"] as number) : null
              const traceId = typeof meta["source_trace_id"] === "string" ? meta["source_trace_id"] as string : null

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
                    <button
                      type="button"
                      disabled={deletingId === ex.example_id}
                      onClick={() => handleDeleteExample(ex.example_id)}
                      className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border/60 text-muted-foreground/50 transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-40"
                      title="Remove example"
                    >
                      <HugeiconsIcon
                        icon={deletingId === ex.example_id ? Loading03Icon : Delete02Icon}
                        size={11}
                        className={deletingId === ex.example_id ? "animate-spin" : undefined}
                      />
                    </button>
                  </div>

                  {expanded ? (
                    <div className="mt-3 space-y-2 pl-7">
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
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default Datasets
