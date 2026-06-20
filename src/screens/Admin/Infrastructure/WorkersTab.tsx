"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CloudServerIcon,
  Loading03Icon,
  RefreshIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { cn } from "@/lib/utils"

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
    return <WorkerLogs worker={selected} onBack={() => setSelected(null)} />
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

// ── Detail: a worker's logs with filtering ─────────────────────────────────────

function WorkerLogs({ worker, onBack }: { worker: Worker; onBack: () => void }) {
  const [logs, setLogs] = useState<LogEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [errorsOnly, setErrorsOnly] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch<{ events: LogEvent[] }>(`/admin/infra/workers/${worker.name}/logs?limit=500`)
      setLogs(res.events)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load logs")
    } finally {
      setLoading(false)
    }
  }, [worker.name])

  useEffect(() => { void load() }, [load])

  const errorCount = useMemo(() => (logs ?? []).filter((e) => ERROR_RE.test(e.message)).length, [logs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (logs ?? []).filter((e) => {
      if (errorsOnly && !ERROR_RE.test(e.message)) return false
      if (q && !e.message.toLowerCase().includes(q)) return false
      return true
    })
  }, [logs, search, errorsOnly])

  return (
    <div className="space-y-3">
      {/* Header / back */}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={onBack}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} /> Workers
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-semibold">{worker.name}</h2>
            <Badge variant="muted">{worker.task_definition}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">/ecs/{worker.name} · latest stream</p>
        </div>
        <Button size="sm" variant="outline" className="ml-auto" onClick={load} disabled={loading}>
          <HugeiconsIcon icon={loading ? Loading03Icon : RefreshIcon} className={loading ? "animate-spin" : ""} size={14} /> Refresh
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <HugeiconsIcon icon={Search01Icon} size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter log lines…"
            className="h-9 w-full rounded-md border border-border/60 bg-background pl-8 pr-3 text-sm outline-none focus:border-[#1860D3]"
          />
        </div>
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
          {errorsOnly && <span>showing errors only</span>}
        </div>
        <div className="max-h-[60vh] min-h-[200px] overflow-auto px-3 py-2 font-mono text-[11.5px] leading-relaxed">
          {loading && !logs && <p className="text-zinc-500">Loading…</p>}
          {logs && filtered.length === 0 && !loading && (
            <p className="text-zinc-500">{logs.length === 0 ? "No recent log events." : "No lines match the filter."}</p>
          )}
          {filtered.map((e, i) => {
            const isErr = ERROR_RE.test(e.message)
            return (
              <div key={i} className={cn("whitespace-pre-wrap break-all", isErr ? "text-red-400" : "text-zinc-200")}>
                <span className="text-zinc-600">{new Date(e.ts).toLocaleTimeString()} </span>
                {e.message}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
