"use client"

import { useCallback, useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Delete02Icon, Key01Icon, Loading03Icon, RefreshIcon, ShieldKeyIcon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { ConfirmDelete } from "./ConfirmDelete"

interface Param { name: string; type: string | null; last_modified: string | null }

const SSM_PREFIX = "/fluiq/prod/"

export function SecretsTab() {
  const [params, setParams] = useState<Param[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [toDelete, setToDelete] = useState<Param | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch<{ parameters: Param[] }>("/admin/infra/secrets")
      setParams(res.parameters)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load parameters")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const confirmDelete = useCallback(async () => {
    if (!toDelete) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await authFetch(`/admin/infra/secrets?name=${encodeURIComponent(toDelete.name)}`, { method: "DELETE" })
      setToDelete(null)
      await load()
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : "Failed to delete parameter")
    } finally {
      setDeleteBusy(false)
    }
  }, [toDelete, load])

  if (loading && !params) {
    return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={16} /> Loading parameters…</div>
  }
  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        <Button size="sm" variant="outline" onClick={load}><HugeiconsIcon icon={RefreshIcon} size={14} /> Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">SSM Parameter Store · <span className="font-mono">{SSM_PREFIX}</span> · values are never exposed.</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <HugeiconsIcon icon={loading ? Loading03Icon : RefreshIcon} className={loading ? "animate-spin" : ""} size={14} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setAdding(true)}>
            <HugeiconsIcon icon={Add01Icon} size={14} /> New secret
          </Button>
        </div>
      </div>
      <Card className="divide-y divide-border/50">
        {params?.map((p) => (
          <div key={p.name} className="flex items-center gap-3 px-4 py-2.5">
            <HugeiconsIcon icon={p.type === "SecureString" ? ShieldKeyIcon : Key01Icon} size={16} className={p.type === "SecureString" ? "text-rose-500" : "text-muted-foreground"} />
            <span className="flex-1 truncate font-mono text-sm">{p.name}</span>
            <Badge variant="muted">{p.type}</Badge>
            {p.last_modified && <span className="hidden text-xs text-muted-foreground sm:inline">{new Date(p.last_modified).toLocaleDateString()}</span>}
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
              onClick={() => { setDeleteError(null); setToDelete(p) }}
              title="Delete parameter"
            >
              <HugeiconsIcon icon={Delete02Icon} size={15} />
            </Button>
          </div>
        ))}
        {params && params.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted-foreground">No parameters found.</div>}
      </Card>

      <SecretFormDialog open={adding} onOpenChange={setAdding} onSaved={load} />

      <ConfirmDelete
        open={!!toDelete}
        onOpenChange={(v) => { if (!v) setToDelete(null) }}
        title="Delete secret"
        description={
          <>Permanently delete <span className="font-mono text-foreground">{toDelete?.name}</span> from SSM Parameter Store. Workers still referencing it will fail on next deploy. This cannot be undone.</>
        }
        confirmWord={toDelete?.name ?? ""}
        busy={deleteBusy}
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

// ── New-secret form ────────────────────────────────────────────────────────────

function SecretFormDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void | Promise<void>
}) {
  const [leaf, setLeaf] = useState("")
  const [value, setValue] = useState("")
  const [type, setType] = useState<"SecureString" | "String">("SecureString")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) { setLeaf(""); setValue(""); setType("SecureString"); setError(null) }
  }, [open])

  const name = SSM_PREFIX + leaf.replace(/^\/+/, "")
  const valid = /^[A-Za-z0-9_./-]+$/.test(leaf) && value.length > 0

  const save = useCallback(async () => {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      await authFetch("/admin/infra/secrets", { method: "PUT", body: { name, value, type } })
      onOpenChange(false)
      await onSaved()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save parameter")
    } finally {
      setBusy(false)
    }
  }, [valid, name, value, type, onOpenChange, onSaved])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New secret</DialogTitle>
          <DialogDescription>Stored in SSM Parameter Store under <span className="font-mono">{SSM_PREFIX}</span>. Existing names are overwritten.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <div className="flex items-center rounded-lg border border-border bg-input/30 pl-3 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
              <span className="font-mono text-sm text-muted-foreground">{SSM_PREFIX}</span>
              <input
                value={leaf}
                onChange={(e) => setLeaf(e.target.value)}
                placeholder="MY_NEW_SECRET"
                spellCheck={false}
                className="h-9 flex-1 bg-transparent px-1 font-mono text-sm outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Value</label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="secret value"
              type={type === "SecureString" ? "password" : "text"}
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <Select value={type} onValueChange={(v) => setType(v as "SecureString" | "String")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SecureString">SecureString (encrypted)</SelectItem>
                <SelectItem value="String">String (plaintext)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={!valid || busy}>
            {busy && <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />}
            Save secret
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
