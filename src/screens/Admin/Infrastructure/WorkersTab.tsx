"use client"

import { useCallback, useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { CloudServerIcon, Loading03Icon, RefreshIcon } from "@hugeicons/core-free-icons"

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

export function WorkersTab() {
  const [workers, setWorkers] = useState<Worker[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
      {workers?.map((w) => <WorkerRow key={w.name} worker={w} />)}
    </div>
  )
}

function WorkerRow({ worker: w }: { worker: Worker }) {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<LogEvent[] | null>(null)
  const [logErr, setLogErr] = useState<string | null>(null)
  const [logLoading, setLogLoading] = useState(false)

  const healthy = w.running >= w.desired && w.status === "ACTIVE"

  const loadLogs = useCallback(async () => {
    setLogLoading(true)
    setLogErr(null)
    try {
      const res = await authFetch<{ events: LogEvent[] }>(`/admin/infra/workers/${w.name}/logs`)
      setLogs(res.events)
    } catch (e) {
      setLogErr(e instanceof ApiError ? e.message : "Failed to load logs")
    } finally {
      setLogLoading(false)
    }
  }, [w.name])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && !logs) void loadLogs()
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 p-4">
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
        <Button size="sm" variant="outline" onClick={toggle}>{open ? "Hide" : "Logs"}</Button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-zinc-950">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[11px] text-zinc-400">/ecs/{w.name} · latest stream</span>
            <button onClick={loadLogs} className="text-[11px] text-zinc-400 hover:text-zinc-200">refresh</button>
          </div>
          <div className="max-h-80 overflow-auto px-3 pb-3 font-mono text-[11.5px] leading-relaxed text-zinc-200">
            {logLoading && <p className="text-zinc-500">Loading…</p>}
            {logErr && <p className="text-red-400">{logErr}</p>}
            {logs && logs.length === 0 && <p className="text-zinc-500">No recent log events.</p>}
            {logs?.map((e, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                <span className="text-zinc-500">{new Date(e.ts).toLocaleTimeString()} </span>
                {e.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
