import { useState, type FormEvent } from "react"
import {
  Alert02Icon,
  Loading03Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import type { ApiKeyCreated } from "@/lib/auth-types"

export function CreateKeyModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (key: ApiKeyCreated) => void
}) {
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleClose = () => {
    if (submitting) return
    setName("")
    setError(null)
    onClose()
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Name is required")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const created = await authFetch<ApiKeyCreated>("/api-keys", {
        method: "POST",
        body: { name: trimmed },
      })
      onCreated(created)
      setName("")
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to create API key")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="text-base">Create API key</CardTitle>
          <CardDescription>
            Give the key a descriptive name (e.g. "production", "staging").
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="api-key-name">Name</Label>
              <Input
                id="api-key-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="production"
                maxLength={64}
                disabled={submitting}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <HugeiconsIcon icon={Alert02Icon} size={14} />
                {error}
              </div>
            )}
            <div className="mt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
                ) : (
                  <HugeiconsIcon icon={PlusSignIcon} />
                )}
                Create key
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
