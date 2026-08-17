"use client"

import { useState } from "react"
import { FlagIcon, Loading03Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"

/**
 * Sends a trace to the Review queue.
 *
 * The moment you notice something is wrong is the moment the context is in your
 * head, and it is also the moment you have somewhere else to be. One click here
 * is what stops that observation from being lost.
 */
export function FlagForReview({ traceId }: { traceId: string }) {
  const [flagged, setFlagged] = useState(false)
  const [busy, setBusy] = useState(false)

  async function flag() {
    if (busy || flagged || !traceId) return
    setBusy(true)
    try {
      await authFetch(`/api/v1/traces/${traceId}/flag`, {
        method: "POST",
        body: { reason: "manual" },
      })
      setFlagged(true)
      toast.success("Sent to Review")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to flag")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={flag} disabled={busy || flagged}>
      <HugeiconsIcon
        icon={busy ? Loading03Icon : flagged ? Tick02Icon : FlagIcon}
        size={14}
        className={busy ? "animate-spin" : undefined}
      />
      {flagged ? "In Review" : "Flag for review"}
    </Button>
  )
}
