"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, Loading03Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
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
 * Shared confirmation dialog (shadcn Dialog).
 *
 * - Pass `confirmWord` to require the user to re-type it before the action is
 *   enabled — the "type to confirm" pattern for destructive deletes.
 * - Omit `confirmWord` for a simple yes/no confirm (e.g. "replace body?").
 * - `destructive` styles the title + confirm button red.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmWord,
  confirmLabel = "Confirm",
  destructive = false,
  busy,
  error,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: React.ReactNode
  confirmWord?: string
  confirmLabel?: string
  destructive?: boolean
  busy?: boolean
  error?: string | null
  onConfirm: () => void
}) {
  const [typed, setTyped] = useState("")

  useEffect(() => {
    if (open) setTyped("")
  }, [open])

  const matches = !confirmWord || typed === confirmWord

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle
            className={cn(
              "flex items-center gap-2",
              destructive && "text-red-600 dark:text-red-400",
            )}
          >
            {destructive ? <HugeiconsIcon icon={Alert02Icon} size={18} /> : null}
            {title}
          </DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {confirmWord ? (
          <div className="space-y-2 py-1">
            <p className="text-sm text-muted-foreground">
              Type{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
                {confirmWord}
              </code>{" "}
              to confirm.
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
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={!matches || busy}
            className={destructive ? "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500" : undefined}
          >
            {busy ? <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
