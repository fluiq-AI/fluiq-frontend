import { useEffect, useState, type FormEvent } from "react"
import {
  Alert02Icon,
  ApiIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Delete02Icon,
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
import type { ApiKey, ApiKeyCreated, OrganizationModel } from "@/lib/auth-types"
import { setOrganization } from "@/store/auth/slice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"

function ApiManagement() {
  const dispatch = useAppDispatch()
  const { organization } = useAppSelector((s) => s.auth)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [revealedKey, setRevealedKey] = useState<ApiKeyCreated | null>(null)

  useEffect(() => {
    if (!copiedId) return
    const t = window.setTimeout(() => setCopiedId(null), 1500)
    return () => window.clearTimeout(t)
  }, [copiedId])

  if (!organization) return null

  const limitReached = organization.api_key_usage >= organization.api_key_limit

  function openModal() {
    setName("")
    setError(null)
    setIsModalOpen(true)
  }

  function closeModal() {
    if (submitting) return
    setIsModalOpen(false)
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
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
      const stored: ApiKey = {
        key_id: created.key_id,
        name: created.name,
        prefix: created.prefix,
        created_at: created.created_at,
      }
      const next: OrganizationModel = {
        ...organization!,
        api_keys: [...organization!.api_keys, stored],
        api_key_usage: organization!.api_key_usage + 1,
      }
      dispatch(setOrganization(next))
      setRevealedKey(created)
      setIsModalOpen(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to create API key")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(key: ApiKey) {
    if (!window.confirm(`Delete API key "${key.name}"? This cannot be undone.`)) return
    setDeletingId(key.key_id)
    try {
      await authFetch<void>(`/api-keys/${key.key_id}`, { method: "DELETE" })
      const next: OrganizationModel = {
        ...organization!,
        api_keys: organization!.api_keys.filter((k) => k.key_id !== key.key_id),
        api_key_usage: Math.max(organization!.api_key_usage - 1, 0),
      }
      dispatch(setOrganization(next))
      if (revealedKey?.key_id === key.key_id) setRevealedKey(null)
    } catch (err) {
      window.alert(err instanceof ApiError ? err.detail : "Failed to delete API key")
    } finally {
      setDeletingId(null)
    }
  }

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
    } catch {
      window.prompt("Copy this value:", text)
    }
  }

  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            API Management
          </h1>
          <p className="mt-2 text-muted-foreground">
            Issue, rotate, and revoke API keys for your organization.
          </p>
        </div>
        <Button onClick={openModal} disabled={limitReached}>
          <HugeiconsIcon icon={PlusSignIcon} />
          Create API key
        </Button>
      </div>

      {revealedKey && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-primary" />
              <CardTitle className="text-base">New key created</CardTitle>
            </div>
            <CardDescription>
              Copy this key now &mdash; it won't be shown in full again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-border/60 bg-background px-3 py-2 font-mono text-sm">
              {revealedKey.key}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyText(revealedKey.key_id, revealedKey.key)}
            >
              <HugeiconsIcon icon={Copy01Icon} />
              {copiedId === revealedKey.key_id ? "Copied" : "Copy"}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setRevealedKey(null)}>
              <HugeiconsIcon icon={Cancel01Icon} />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={ApiIcon} size={16} />
            <CardTitle className="text-base">API keys</CardTitle>
          </div>
          <CardDescription>
            {organization.api_key_usage} of {organization.api_key_limit} keys in use on this plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {organization.api_keys.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No API keys yet. Create your first key to start instrumenting traces.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2 font-medium">Name</th>
                    <th className="px-6 py-2 font-medium">Key</th>
                    <th className="px-6 py-2 font-medium">Created</th>
                    <th className="px-6 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organization.api_keys.map((k) => (
                    <tr key={k.key_id} className="border-b border-border/60 last:border-b-0">
                      <td className="px-6 py-3 font-medium">{k.name}</td>
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                        {k.prefix}
                        <span className="text-muted-foreground/60">{"\u2026"}</span>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {formatDate(k.created_at)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => copyText(k.key_id, k.prefix)}
                            title="Copy prefix"
                          >
                            <HugeiconsIcon
                              icon={copiedId === k.key_id ? CheckmarkCircle02Icon : Copy01Icon}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(k)}
                            disabled={deletingId === k.key_id}
                            title="Delete key"
                            className="text-destructive hover:text-destructive"
                          >
                            <HugeiconsIcon
                              icon={deletingId === k.key_id ? Loading03Icon : Delete02Icon}
                              className={deletingId === k.key_id ? "animate-spin" : undefined}
                            />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <Card
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-base">Create API key</CardTitle>
              <CardDescription>
                Give the key a descriptive name (e.g. "production", "staging").
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreate}>
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
                  <Button type="button" variant="ghost" onClick={closeModal} disabled={submitting}>
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
      )}
    </>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default ApiManagement
