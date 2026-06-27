"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Alert02Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  CloudServerIcon,
  Cancel01Icon,
  Delete02Icon,
  Loading03Icon,
  RefreshIcon,
  Search01Icon,
  ShieldKeyIcon,
} from "@hugeicons/core-free-icons"

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
import { cn } from "@/lib/utils"
import { ConfirmDelete } from "./ConfirmDelete"

interface Worker {
  name: string
  status: string | null
  running: number
  desired: number
  pending: number
  task_definition: string
  rollout: string | null
  updated_at: string | null
}
interface LogEvent { ts: number; message: string }

const ERROR_RE = /\b(error|exception|traceback|critical|fatal|failed|err)\b/i

// ── Tab root: master (list) ↔ detail (logs) ─────────────────────────────────────

export function WorkersTab() {
  const [workers, setWorkers] = useState<Worker[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Worker | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch<{ workers: Worker[] }>("/admin/infra/workers")
      setWorkers(res.workers)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load workers")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (selected) {
    return <WorkerDetail worker={selected} onBack={() => setSelected(null)} />
  }

  if (loading && !workers) {
    return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={16} /> Loading workers…</div>
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
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <HugeiconsIcon icon={loading ? Loading03Icon : RefreshIcon} className={loading ? "animate-spin" : ""} size={14} /> Refresh
        </Button>
      </div>
      {workers?.map((w) => {
        const healthy = w.running >= w.desired && w.status === "ACTIVE"
        return (
          <Card
            key={w.name}
            onClick={() => setSelected(w)}
            className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:border-[#1860D3]/40 hover:bg-muted/40"
          >
            <span className="flex size-9 items-center justify-center rounded-md bg-muted text-blue-600 dark:text-blue-400">
              <HugeiconsIcon icon={CloudServerIcon} size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium leading-tight">{w.name}</p>
                <Badge variant="muted">{w.task_definition}</Badge>
                {w.rollout && <span className="text-xs text-muted-foreground">{w.rollout}</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                {w.running}/{w.desired} running{w.pending ? ` · ${w.pending} pending` : ""}
                {w.updated_at ? ` · updated ${new Date(w.updated_at).toLocaleString()}` : ""}
              </p>
            </div>
            <span className={cn("size-2 rounded-full", healthy ? "bg-emerald-500" : "bg-amber-500")} title={w.status ?? ""} />
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              View logs <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
            </span>
          </Card>
        )
      })}
    </div>
  )
}

// ── Detail: header + Logs / Secrets sub-tabs ───────────────────────────────────

function WorkerDetail({ worker, onBack }: { worker: Worker; onBack: () => void }) {
  const [pane, setPane] = useState<"logs" | "secrets">("logs")
  const panes: { key: "logs" | "secrets"; label: string }[] = [
    { key: "logs", label: "Logs" },
    { key: "secrets", label: "Secrets" },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={onBack}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} /> Workers
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-semibold">{worker.name}</h2>
            <Badge variant="muted">{worker.task_definition}</Badge>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border/60">
        {panes.map((p) => (
          <button
            key={p.key}
            onClick={() => setPane(p.key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition-colors",
              pane === p.key
                ? "border-[#1860D3] text-[#1860D3] dark:text-[#6FA8FF]"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {pane === "logs" ? <WorkerLogs worker={worker} /> : <WorkerSecrets worker={worker} />}
    </div>
  )
}

// ── Logs pane: search + filtering ──────────────────────────────────────────────

// `datetime-local` value (local time, no tz) ⇄ epoch ms.
function toEpochMs(v: string): number | null {
  if (!v) return null
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? null : t
}

function WorkerLogs({ worker }: { worker: Worker }) {
  const [logs, setLogs] = useState<LogEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Client-side refinements over whatever is loaded.
  const [search, setSearch] = useState("")
  const [errorsOnly, setErrorsOnly] = useState(false)
  const [newestFirst, setNewestFirst] = useState(false)
  // Server-side search (across all streams, full history) controls.
  const [query, setQuery] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  // The criteria the currently-loaded results were fetched with (null = live tail).
  const [activeSearch, setActiveSearch] = useState<{ q: string; from: string; to: string } | null>(null)

  // `criteria` null → tail the latest stream; otherwise search all streams.
  const load = useCallback(
    async (criteria: { q: string; from: string; to: string } | null) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ limit: criteria ? "2000" : "500" })
        if (criteria) {
          if (criteria.q.trim()) params.set("q", criteria.q.trim())
          const start = toEpochMs(criteria.from)
          const end = toEpochMs(criteria.to)
          if (start !== null) params.set("start", String(start))
          if (end !== null) params.set("end", String(end))
        }
        const res = await authFetch<{ events: LogEvent[] }>(
          `/admin/infra/workers/${worker.name}/logs?${params.toString()}`,
        )
        setLogs(res.events)
        setActiveSearch(criteria)
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load logs")
      } finally {
        setLoading(false)
      }
    },
    [worker.name],
  )

  useEffect(() => { void load(null) }, [load])

  const runSearch = useCallback(() => {
    if (!query.trim() && !from && !to) return
    void load({ q: query, from, to })
  }, [load, query, from, to])

  const clearSearch = useCallback(() => {
    setQuery(""); setFrom(""); setTo("")
    void load(null)
  }, [load])

  const errorCount = useMemo(() => (logs ?? []).filter((e) => ERROR_RE.test(e.message)).length, [logs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const out = (logs ?? []).filter((e) => {
      if (errorsOnly && !ERROR_RE.test(e.message)) return false
      if (q && !e.message.toLowerCase().includes(q)) return false
      return true
    })
    out.sort((a, b) => (newestFirst ? b.ts - a.ts : a.ts - b.ts))
    return out
  }, [logs, search, errorsOnly, newestFirst])

  return (
    <div className="space-y-3">
      {/* Caption / refresh */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">/ecs/{worker.name}</span> · {activeSearch ? "searching all streams" : "latest stream"}
        </p>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => load(activeSearch)} disabled={loading}>
          <HugeiconsIcon icon={loading ? Loading03Icon : RefreshIcon} className={loading ? "animate-spin" : ""} size={14} /> Refresh
        </Button>
      </div>

      {/* Search-all-streams bar */}
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border/60 bg-muted/30 p-2.5">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Search all logs</label>
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runSearch() }}
              placeholder="Term across every stream (case-sensitive)…"
              className="h-9 w-full rounded-md border border-border/60 bg-background pl-8 pr-3 text-sm outline-none focus:border-[#1860D3]"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">From</label>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 rounded-md border border-border/60 bg-background px-2 text-sm outline-none focus:border-[#1860D3]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">To</label>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 rounded-md border border-border/60 bg-background px-2 text-sm outline-none focus:border-[#1860D3]"
          />
        </div>
        <Button size="sm" onClick={runSearch} disabled={loading || (!query.trim() && !from && !to)}>
          <HugeiconsIcon icon={Search01Icon} size={14} /> Search
        </Button>
        {activeSearch && (
          <Button size="sm" variant="outline" onClick={clearSearch} disabled={loading}>
            <HugeiconsIcon icon={Cancel01Icon} size={14} /> Live tail
          </Button>
        )}
      </div>

      {/* Refine bar (client-side over loaded results) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <HugeiconsIcon icon={Search01Icon} size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Refine loaded lines…"
            className="h-9 w-full rounded-md border border-border/60 bg-background pl-8 pr-3 text-sm outline-none focus:border-[#1860D3]"
          />
        </div>
        <button
          onClick={() => setNewestFirst((v) => !v)}
          className="flex h-9 items-center gap-1.5 rounded-md border border-border/60 px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          title="Sort by date"
        >
          <HugeiconsIcon icon={newestFirst ? ArrowDown01Icon : ArrowUp01Icon} size={14} />
          {newestFirst ? "Newest first" : "Oldest first"}
        </button>
        <button
          onClick={() => setErrorsOnly((v) => !v)}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
            errorsOnly
              ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              : "border-border/60 text-muted-foreground hover:text-foreground",
          )}
        >
          <HugeiconsIcon icon={Alert02Icon} size={14} />
          Errors only
          {errorCount > 0 && <Badge variant="muted" className="ml-0.5">{errorCount}</Badge>}
        </button>
      </div>

      {/* Logs */}
      {error && (
        <div className="rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
      )}
      <div className="overflow-hidden rounded-lg border border-border/60 bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5 text-[11px] text-zinc-400">
          <span>{filtered.length} line{filtered.length === 1 ? "" : "s"}{logs ? ` of ${logs.length}` : ""}</span>
          <span className="flex items-center gap-2">
            {activeSearch && <span>all streams{activeSearch.q.trim() ? ` · “${activeSearch.q.trim()}”` : ""}</span>}
            {errorsOnly && <span>errors only</span>}
          </span>
        </div>
        <div className="max-h-[60vh] min-h-[200px] overflow-auto px-3 py-2 font-mono text-[11.5px] leading-relaxed">
          {loading && <p className="text-zinc-500">Loading…</p>}
          {logs && filtered.length === 0 && !loading && (
            <p className="text-zinc-500">{logs.length === 0 ? "No matching log events." : "No lines match the filter."}</p>
          )}
          {!loading && filtered.map((e, i) => {
            const isErr = ERROR_RE.test(e.message)
            return (
              <div key={i} className={cn("whitespace-pre-wrap break-all", isErr ? "text-red-400" : "text-zinc-200")}>
                <span className="text-zinc-600">{new Date(e.ts).toLocaleString()} </span>
                {e.message}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Secrets pane: env-var bindings on the worker's task definition ──────────────

interface SecretBinding { name: string; value_from: string }

const SSM_PREFIX = "/fluiq/prod/"

// Pull the parameter path out of an SSM ARN (…:parameter/fluiq/prod/X → /fluiq/prod/X).
function ssmPathFromArn(arn: string): string {
  const i = arn.indexOf(":parameter")
  return i === -1 ? arn : arn.slice(i + ":parameter".length)
}

function WorkerSecrets({ worker }: { worker: Worker }) {
  const [bindings, setBindings] = useState<SecretBinding[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [toDelete, setToDelete] = useState<SecretBinding | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch<{ secrets: SecretBinding[] }>(`/admin/infra/workers/${worker.name}/secrets`)
      setBindings(res.secrets)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load secrets")
    } finally {
      setLoading(false)
    }
  }, [worker.name])

  useEffect(() => { void load() }, [load])

  const confirmDelete = useCallback(async () => {
    if (!toDelete) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await authFetch(`/admin/infra/workers/${worker.name}/secrets/${encodeURIComponent(toDelete.name)}`, { method: "DELETE" })
      setToDelete(null)
      await load()
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : "Failed to remove secret")
    } finally {
      setDeleteBusy(false)
    }
  }, [toDelete, worker.name, load])

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
        <HugeiconsIcon icon={Alert02Icon} size={14} className="mt-0.5 shrink-0" />
        <span>Env vars injected into <span className="font-mono">{worker.name}</span> from SSM. Adding or removing one registers a new task-definition revision and <strong>redeploys this worker</strong>.</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{bindings ? `${bindings.length} secret${bindings.length === 1 ? "" : "s"}` : "—"}</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <HugeiconsIcon icon={loading ? Loading03Icon : RefreshIcon} className={loading ? "animate-spin" : ""} size={14} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setAdding(true)}>
            <HugeiconsIcon icon={Add01Icon} size={14} /> Add secret
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
      )}

      {loading && !bindings ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={16} /> Loading secrets…</div>
      ) : (
        <Card className="divide-y divide-border/50">
          {bindings?.map((b) => (
            <div key={b.name} className="flex items-center gap-3 px-4 py-2.5">
              <HugeiconsIcon icon={ShieldKeyIcon} size={16} className="text-rose-500" />
              <span className="font-mono text-sm font-medium">{b.name}</span>
              <span className="hidden flex-1 truncate font-mono text-xs text-muted-foreground sm:inline">{ssmPathFromArn(b.value_from)}</span>
              <Button
                size="icon-sm"
                variant="ghost"
                className="ml-auto text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                onClick={() => { setDeleteError(null); setToDelete(b) }}
                title="Remove secret"
              >
                <HugeiconsIcon icon={Delete02Icon} size={15} />
              </Button>
            </div>
          ))}
          {bindings && bindings.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted-foreground">No SSM-backed env vars on this worker.</div>}
        </Card>
      )}

      <AddWorkerSecretDialog worker={worker} open={adding} onOpenChange={setAdding} onSaved={load} />

      <ConfirmDelete
        open={!!toDelete}
        onOpenChange={(v) => { if (!v) setToDelete(null) }}
        title="Remove secret binding"
        description={
          <>Remove <span className="font-mono text-foreground">{toDelete?.name}</span> from <span className="font-mono text-foreground">{worker.name}</span> and redeploy. The SSM parameter itself is kept — delete it from the Secrets tab if unused.</>
        }
        confirmWord={toDelete?.name ?? ""}
        busy={deleteBusy}
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function AddWorkerSecretDialog({
  worker,
  open,
  onOpenChange,
  onSaved,
}: {
  worker: Worker
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void | Promise<void>
}) {
  const [envName, setEnvName] = useState("")
  const [leaf, setLeaf] = useState("")
  const [value, setValue] = useState("")
  const [type, setType] = useState<"SecureString" | "String">("SecureString")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) { setEnvName(""); setLeaf(""); setValue(""); setType("SecureString"); setError(null) }
  }, [open])

  const ssmName = SSM_PREFIX + leaf.replace(/^\/+/, "")
  const validEnv = /^[A-Za-z_][A-Za-z0-9_]*$/.test(envName)
  const validLeaf = /^[A-Za-z0-9_./-]+$/.test(leaf)
  const valid = validEnv && validLeaf

  const save = useCallback(async () => {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      await authFetch(`/admin/infra/workers/${worker.name}/secrets`, {
        method: "POST",
        body: { env_name: envName, ssm_name: ssmName, ...(value ? { value, type } : {}) },
      })
      onOpenChange(false)
      await onSaved()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to add secret")
    } finally {
      setBusy(false)
    }
  }, [valid, worker.name, envName, ssmName, value, type, onOpenChange, onSaved])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add secret to {worker.name}</DialogTitle>
          <DialogDescription>Injects an SSM parameter as an env var. Leave the value blank to reference an existing parameter, or set it to create/update the parameter too. Saving redeploys the worker.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Env var name</label>
            <Input
              value={envName}
              onChange={(e) => setEnvName(e.target.value)}
              placeholder="OPENAI_API_KEY"
              spellCheck={false}
              className="font-mono"
              aria-invalid={!!envName && !validEnv}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">SSM parameter</label>
            <div className="flex items-center rounded-lg border border-border bg-input/30 pl-3 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
              <span className="font-mono text-sm text-muted-foreground">{SSM_PREFIX}</span>
              <input
                value={leaf}
                onChange={(e) => setLeaf(e.target.value)}
                placeholder="OPENAI_API_KEY"
                spellCheck={false}
                className="h-9 flex-1 bg-transparent px-1 font-mono text-sm outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Value <span className="font-normal">(optional — creates/updates the parameter)</span></label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="leave blank to reference existing"
              type={type === "SecureString" ? "password" : "text"}
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          {value && (
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
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={!valid || busy}>
            {busy && <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />}
            Add &amp; redeploy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
