"use client"

import { useEffect, useRef, useState } from "react"
import {
  Cancel01Icon,
  Database01Icon,
  Loading03Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { toast } from "sonner"

import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// The shape a caller hands us: what to store as one dataset example. Built from
// a trace/span (message history + response) or from the prompt playground.
export interface DatasetExampleDraft {
  input: string
  expected_output: string | null
  metadata: Record<string, unknown>
}

interface DatasetRef {
  dataset_id: string
  name: string
  example_count: number
}

/**
 * Reusable "Add to Dataset" control: a button that opens a small popover to pick
 * an existing dataset (or create a new one) and append `example` to it as one
 * example via `POST /api/v1/datasets/{id}/examples`.
 *
 * Surfaces: the Traces drawer, the Agents drawer, and the Prompts playground —
 * each computes the `example` from whatever it has in view and drops this in.
 */
export function AddToDataset({
  example,
  disabled = false,
  className,
  size = "sm",
  label = "Add to Dataset",
}: {
  example: DatasetExampleDraft
  disabled?: boolean
  className?: string
  size?: "xs" | "sm" | "default"
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [datasets, setDatasets] = useState<DatasetRef[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [addedId, setAddedId] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Enable whenever there's anything to capture: an input, an expected output,
  // or a source trace to snapshot. Agentic wrapper roots (e.g. CrewAI's crew
  // span) carry no direct input but do carry the run's output + source_trace_id
  // — the whole trajectory is pinned server-side by source_trace_id — so the
  // button must work on the root, not just leaf spans. Only truly empty drafts
  // stay disabled (visible for discoverability, but a no-op).
  const sourceTraceId =
    typeof example.metadata?.["source_trace_id"] === "string"
      ? (example.metadata["source_trace_id"] as string)
      : ""
  const hasContent =
    !!example.input.trim() ||
    !!example.expected_output?.trim() ||
    !!sourceTraceId.trim()
  const nothingToAdd = disabled || !hasContent

  useEffect(
    () => () => {
      if (addedTimer.current) clearTimeout(addedTimer.current)
    },
    [],
  )

  async function loadDatasets() {
    setLoading(true)
    setError(null)
    try {
      const data = await authFetch<{ datasets: DatasetRef[] }>("/api/v1/datasets")
      setDatasets(data.datasets)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load datasets")
      setDatasets([])
    } finally {
      setLoading(false)
    }
  }

  function toggleOpen() {
    const next = !open
    setOpen(next)
    if (next) {
      setAddedId(null)
      loadDatasets()
    }
  }

  function flashAdded(datasetId: string) {
    setAddedId(datasetId)
    if (addedTimer.current) clearTimeout(addedTimer.current)
    addedTimer.current = setTimeout(() => setAddedId(null), 2000)
  }

  async function addExample(datasetId: string) {
    setBusyId(datasetId)
    setError(null)
    try {
      await authFetch(`/api/v1/datasets/${datasetId}/examples`, {
        method: "POST",
        body: {
          input: example.input,
          expected_output: example.expected_output,
          metadata: example.metadata,
        },
      })
      setDatasets((prev) =>
        prev.map((d) =>
          d.dataset_id === datasetId
            ? { ...d, example_count: d.example_count + 1 }
            : d,
        ),
      )
      flashAdded(datasetId)
      const name = datasets.find((d) => d.dataset_id === datasetId)?.name
      toast.success(name ? `Added to “${name}”` : "Added to dataset")
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : "Failed to add example"
      setError(msg)
      toast.error(msg)
    } finally {
      setBusyId(null)
    }
  }

  async function createAndAdd() {
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
      setNewName("")
      await addExample(ds.dataset_id)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to create dataset")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={nothingToAdd}
        aria-expanded={open}
        onClick={toggleOpen}
        className={className}
        title={nothingToAdd ? "Nothing to capture from this view" : undefined}
      >
        <HugeiconsIcon icon={Database01Icon} size={14} />
        {label}
      </Button>

      {open ? (
        <>
          {/* Click-outside backdrop (below the panel, above page content). */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border border-border/60 bg-background shadow-lg">
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
              <span className="text-xs font-medium">Add to dataset</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={12} />
              </button>
            </div>

            <div className="max-h-56 overflow-auto py-1">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
                  Loading…
                </div>
              ) : datasets.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  No datasets yet. Create one below.
                </div>
              ) : (
                datasets.map((d) => {
                  const isBusy = busyId === d.dataset_id
                  const isAdded = addedId === d.dataset_id
                  return (
                    <button
                      key={d.dataset_id}
                      type="button"
                      disabled={isBusy}
                      onClick={() => addExample(d.dataset_id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/60 disabled:opacity-60"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{d.name}</span>
                      {isBusy ? (
                        <HugeiconsIcon
                          icon={Loading03Icon}
                          size={13}
                          className="animate-spin text-muted-foreground"
                        />
                      ) : isAdded ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <HugeiconsIcon icon={Tick02Icon} size={13} /> Added
                        </span>
                      ) : (
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {d.example_count}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>

            <div className="border-t border-border/60 p-2">
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      createAndAdd()
                    }
                  }}
                  placeholder="New dataset name"
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!newName.trim() || creating}
                  onClick={createAndAdd}
                >
                  {creating ? (
                    <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
              {error ? <p className="mt-2 text-[11px] text-destructive">{error}</p> : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
