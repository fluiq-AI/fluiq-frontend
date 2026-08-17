"use client"

import { useState } from "react"
import { Add01Icon, Cancel01Icon, Loading03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"

/** Mirrors the API's rule so an invalid tag is caught before the round trip. */
const TAG_RE = /^[a-z0-9][a-z0-9._\-/]{0,62}$/

/**
 * Tags on a trace, editable in place.
 *
 * The SDK can tag at call time, but the useful case is retrospective: you find
 * a bad response, label it, and the label is what lets you find every other one
 * like it later. That only works if tagging is a click away from the thing you
 * are looking at.
 */
export function TraceTags({
  traceId,
  tags,
  onChange,
}: {
  traceId: string
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)

  async function add() {
    const tag = draft.trim().toLowerCase()
    if (!tag || busy) return
    if (!TAG_RE.test(tag)) {
      toast.error("Use lowercase letters, digits, and . _ - / (max 63 characters).")
      return
    }
    if (tags.includes(tag)) {
      setDraft("")
      setAdding(false)
      return
    }
    setBusy(true)
    // Optimistic: the write is a single insert and the label appearing a beat
    // after you typed it reads as broken. Rolled back below if it fails.
    onChange([...tags, tag])
    try {
      await authFetch(`/api/v1/traces/${traceId}/tags`, {
        method: "POST",
        body: { tags: [tag] },
      })
      setDraft("")
      setAdding(false)
    } catch (err) {
      onChange(tags)
      toast.error(err instanceof ApiError ? err.detail : "Failed to add tag")
    } finally {
      setBusy(false)
    }
  }

  async function remove(tag: string) {
    const before = tags
    onChange(tags.filter((t) => t !== tag))
    try {
      await authFetch(`/api/v1/traces/${traceId}/tags/${encodeURIComponent(tag)}`, {
        method: "DELETE",
      })
    } catch (err) {
      onChange(before)
      toast.error(err instanceof ApiError ? err.detail : "Failed to remove tag")
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="group inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 py-0.5 pl-2 pr-1 text-[11px] text-muted-foreground"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            onClick={() => remove(tag)}
            className="rounded-full p-0.5 opacity-40 transition-opacity hover:text-destructive group-hover:opacity-100"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={9} />
          </button>
        </span>
      ))}

      {adding ? (
        <span className="inline-flex items-center gap-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                add()
              }
              if (e.key === "Escape") {
                setDraft("")
                setAdding(false)
              }
            }}
            onBlur={() => !draft.trim() && setAdding(false)}
            placeholder="tag-name"
            autoFocus
            disabled={busy}
            className="h-6 w-28 rounded-full border border-primary/40 bg-background px-2 text-[11px] outline-none"
          />
          {busy ? (
            <HugeiconsIcon icon={Loading03Icon} size={11} className="animate-spin text-muted-foreground" />
          ) : null}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-dashed border-border/60 px-2 py-0.5",
            "text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary",
          )}
        >
          <HugeiconsIcon icon={Add01Icon} size={10} />
          {tags.length === 0 ? "Tag" : ""}
        </button>
      )}
    </div>
  )
}
