"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Bookmark02Icon,
  Cancel01Icon,
  Delete02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { TraceFilters } from "../utils/types"
import { DEFAULT_TRACE_FILTERS } from "../utils/types"

interface SavedView {
  view_id: string
  name: string
  description: string | null
  filters: Partial<TraceFilters>
  shared: boolean
}

const SURFACE = "traces"

/**
 * Named filter sets over the trace list.
 *
 * A filter you can't keep is a filter you re-derive every morning, and one you
 * can't share is a review queue only one person has. Saving the current filters
 * as a view fixes both — "all thumbs-down responses from GPT-5 last week"
 * becomes something the team opens rather than reconstructs.
 */
export function ViewPicker({
  filters,
  onApply,
}: {
  filters: TraceFilters
  onApply: (filters: Partial<TraceFilters>) => void
}) {
  const [views, setViews] = useState<SavedView[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState("")
  // Which view the current filters came from, so the trigger can say so. Cleared
  // as soon as the filters diverge — claiming a view is active when it isn't
  // would be worse than saying nothing.
  const [activeId, setActiveId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch<{ views: SavedView[] }>(
        `/api/v1/views?surface=${SURFACE}`,
      )
      setViews(res.views ?? [])
    } catch {
      setViews([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // A view stops being "the current view" the moment its filters stop matching.
  useEffect(() => {
    if (!activeId) return
    const view = views.find((v) => v.view_id === activeId)
    if (!view) return
    const merged = { ...DEFAULT_TRACE_FILTERS, ...view.filters }
    const same = (Object.keys(DEFAULT_TRACE_FILTERS) as (keyof TraceFilters)[]).every((k) =>
      k === "tags"
        ? JSON.stringify([...(merged.tags ?? [])].sort()) ===
          JSON.stringify([...filters.tags].sort())
        : merged[k] === filters[k],
    )
    if (!same) setActiveId(null)
  }, [filters, views, activeId])

  const dirty = activeFilterCount(filters) > 0

  async function save() {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      const created = await authFetch<SavedView>("/api/v1/views", {
        method: "POST",
        body: { name: trimmed, surface: SURFACE, filters, shared: true },
      })
      toast.success(`Saved view "${trimmed}"`)
      setViews((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setActiveId(created.view_id)
      setName("")
      setNaming(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to save view")
    } finally {
      setSaving(false)
    }
  }

  async function remove(view: SavedView) {
    try {
      await authFetch(`/api/v1/views/${view.view_id}`, { method: "DELETE" })
      setViews((prev) => prev.filter((v) => v.view_id !== view.view_id))
      if (activeId === view.view_id) setActiveId(null)
      toast.success(`Removed "${view.name}"`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to remove view")
    }
  }

  function apply(view: SavedView) {
    onApply(view.filters)
    setActiveId(view.view_id)
  }

  const active = views.find((v) => v.view_id === activeId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
          active && "border-primary/40 bg-primary/5 text-primary",
        )}
      >
        <HugeiconsIcon icon={loading ? Loading03Icon : Bookmark02Icon} size={12}
                       className={loading ? "animate-spin" : undefined} />
        {active ? active.name : "Views"}
        <span className="text-[10px] opacity-60">▾</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="max-h-80 min-w-60 overflow-y-auto">
        {views.length === 0 ? (
          <div className="px-2 py-3 text-center text-[11px] text-muted-foreground">
            No saved views yet.
            <br />
            Narrow the list, then save it.
          </div>
        ) : (
          views.map((view) => (
            <div
              key={view.view_id}
              className="flex items-center gap-1 rounded-sm px-1 hover:bg-muted/60"
            >
              <button
                type="button"
                onClick={() => apply(view)}
                className="min-w-0 flex-1 px-1 py-1.5 text-left text-xs"
              >
                <span className="block truncate">{view.name}</span>
                {view.description ? (
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {view.description}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                aria-label={`Remove ${view.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  remove(view)
                }}
                className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:text-destructive"
              >
                <HugeiconsIcon icon={Delete02Icon} size={12} />
              </button>
            </div>
          ))
        )}

        <DropdownMenuSeparator />

        {naming ? (
          <div
            className="flex items-center gap-1.5 px-1.5 py-1.5"
            // The dropdown closes on any click inside it by default, which would
            // dismiss the field the moment you tried to type in it.
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  save()
                }
                if (e.key === "Escape") setNaming(false)
              }}
              placeholder="View name"
              autoFocus
              className="h-7 text-xs"
            />
            <Button size="sm" className="h-7 px-2 text-[11px]" onClick={save}
                    disabled={!name.trim() || saving}>
              {saving ? (
                <HugeiconsIcon icon={Loading03Icon} size={11} className="animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
            <button
              type="button"
              aria-label="Cancel"
              onClick={() => setNaming(false)}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={11} />
            </button>
          </div>
        ) : (
          <DropdownMenuItem
            disabled={!dirty}
            onSelect={(e) => {
              e.preventDefault()
              setNaming(true)
            }}
            className="text-xs"
          >
            {dirty
              ? "Save current filters as a view…"
              : "Narrow the list first, then save it"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Filters differing from the defaults — saving an unfiltered list saves nothing. */
function activeFilterCount(filters: TraceFilters): number {
  const d = DEFAULT_TRACE_FILTERS
  return (
    (filters.sort !== d.sort ? 1 : 0) +
    (filters.security !== d.security ? 1 : 0) +
    (filters.integration !== d.integration ? 1 : 0) +
    (filters.quality !== d.quality ? 1 : 0) +
    (filters.status !== d.status ? 1 : 0) +
    filters.tags.length
  )
}
