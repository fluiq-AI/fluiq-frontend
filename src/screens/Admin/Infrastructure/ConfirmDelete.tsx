"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, Loading03Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

/**
 * Destructive-action confirmation: the user must re-type `confirmWord` exactly
 * before the action is enabled. Used for irreversible infra mutations.
 */
export function ConfirmDelete({
  open,
  onOpenChange,
  title,
  description,
  confirmWord,
  busy,
  error,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description: React.ReactNode
  confirmWord: string
  busy?: boolean
  error?: string | null
  onConfirm: () => void
}) {
  const [typed, setTyped] = useState("")

  useEffect(() => { if (open) setTyped("") }, [open])

  const matches = typed === confirmWord

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <HugeiconsIcon icon={Alert02Icon} size={18} /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <p className="text-sm text-muted-foreground">
            Type <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">{confirmWord}</code> to confirm.
          </p>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && matches && !busy) onConfirm() }}
            placeholder={confirmWord}
            autoFocus
            spellCheck={false}
            className="font-mono"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={!matches || busy}
            className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
          >
            {busy && <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
