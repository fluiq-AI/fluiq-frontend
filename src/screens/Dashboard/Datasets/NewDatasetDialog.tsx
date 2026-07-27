"use client"

import { useState } from "react"
import {
  ArrowRight01Icon,
  FlowchartIcon,
  Loading03Icon,
  Message01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type DatasetKind = "single" | "agentic"

export interface Dataset {
  dataset_id: string
  org_id: string
  name: string
  description: string | null
  kind: DatasetKind
  example_count: number
  created_at: string | null
  updated_at: string | null
}

const TYPE_OPTIONS: {
  kind: DatasetKind
  title: string
  tag: string
  icon: typeof Message01Icon
  blurb: string
  captures: string
}[] = [
  {
    kind: "single",
    title: "Single Prompt Dataset",
    tag: "Classic",
    icon: Message01Icon,
    blurb: "Input / output pairs graded by a custom scorer. The familiar prompt-eval workflow.",
    captures: "Captures: input · expected output · scorer (LLM judges + your own)",
  },
  {
    kind: "agentic",
    title: "Agentic Dataset",
    tag: "Unique to Fluiq",
    icon: FlowchartIcon,
    blurb: "The whole agent run, pinned forever, so agentic eval and security re-run offline as your regression gate.",
    captures: "Captures: full trajectory · every input & output · all tool calls · all MCP calls · media",
  },
]

/**
 * Create-dataset dialog. Collects name, description, and the dataset type:
 * a single-prompt dataset (input/output + custom scorer) or an agentic
 * dataset (full trajectory — inputs, outputs, tools, MCP calls). The type is
 * persisted on the dataset and drives which batch runs the detail view offers.
 */
export function NewDatasetDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (dataset: Dataset) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [kind, setKind] = useState<DatasetKind>("single")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName("")
    setDescription("")
    setKind("single")
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (pending) return
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleCreate() {
    if (!name.trim()) return
    setPending(true)
    setError(null)
    try {
      const row = await authFetch<Dataset>("/api/v1/datasets", {
        method: "POST",
        body: { name: name.trim(), description: description.trim() || null, kind },
      })
      toast.success(`Dataset "${row.name}" created`)
      onCreated(row)
      reset()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to create dataset")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New dataset</DialogTitle>
          <DialogDescription>
            Name it, then pick how much of each run it should capture.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 space-y-4">
          {/* Type chooser */}
          <div className="space-y-2">
            <Label className="text-xs">Type</Label>
            <div className="grid gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const selected = kind === opt.kind
                return (
                  <button
                    key={opt.kind}
                    type="button"
                    onClick={() => setKind(opt.kind)}
                    className={cn(
                      "group relative rounded-lg border p-3 text-left transition-colors",
                      selected
                        ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                        : "border-border/60 bg-background hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                          selected
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <HugeiconsIcon icon={opt.icon} size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              selected ? "text-primary" : "text-foreground",
                            )}
                          >
                            {opt.title}
                          </p>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                              opt.kind === "agentic"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {opt.tag}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          {opt.blurb}
                        </p>
                        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/60">
                          {opt.captures}
                        </p>
                      </div>
                      {selected ? (
                        <HugeiconsIcon
                          icon={Tick02Icon}
                          size={15}
                          className="mt-0.5 shrink-0 text-primary"
                        />
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Name + description */}
          <div className="space-y-1">
            <Label htmlFor="dataset-name" className="text-xs">
              Name
            </Label>
            <Input
              id="dataset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. customer-support-v1"
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim() && !pending) handleCreate()
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dataset-desc" className="text-xs">
              Description
              <span className="ml-1 font-normal text-muted-foreground/60">(optional)</span>
            </Label>
            <Textarea
              id="dataset-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this dataset for?"
              className="min-h-16 text-sm"
              rows={2}
            />
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={pending || !name.trim()}>
            {pending ? (
              <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
            ) : (
              <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
            )}
            Create dataset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
