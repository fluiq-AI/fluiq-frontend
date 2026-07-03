"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon, RefreshIcon, ArrowDown01Icon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { cn } from "@/lib/utils"

type Source = "kafka" | "clickhouse" | "postgres"

const SOURCES: { key: Source; label: string; hint: string }[] = [
  { key: "kafka", label: "Kafka", hint: "docker logs on the broker EC2 (via SSM)" },
  { key: "clickhouse", label: "ClickHouse", hint: "system.text_log / query_log" },
  { key: "postgres", label: "Postgres", hint: "RDS log file (latest)" },
]
const LINE_OPTS = [100, 200, 500, 1000]

interface LogsResponse {
  source: string
  lines: string[]
  status?: string
  file?: string
}

export function LogsTab() {
  const [source, setSource] = useState<Source>("kafka")
  const [limit, setLimit] = useState(200)
  const [lines, setLines] = useState<string[]>([])
  const [meta, setMeta] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (src: Source, n: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch<LogsResponse>(`/admin/infra/logs/${src}?limit=${n}`)
      setLines(res.lines ?? [])
      setMeta(res.file ? res.file : res.status ? `command ${res.status}` : null)
      // jump to the newest line (bottom) after render
      requestAnimationFrame(() => {
        const el = scrollRef.current
        if (el) el.scrollTop = el.scrollHeight
      })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load logs")
      setLines([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(source, limit) }, [source, limit, load])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-border/60 p-0.5">
          {SOURCES.map((s) => (
            <button
              key={s.key}
              onClick={() => setSource(s.key)}
              title={s.hint}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                source === s.key ? "bg-[#1860D3] text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="appearance-none rounded-md border border-border/60 bg-background py-1 pl-2.5 pr-7 text-xs font-medium"
          >
            {LINE_OPTS.map((n) => <option key={n} value={n}>{n} lines</option>)}
          </select>
          <HugeiconsIcon icon={ArrowDown01Icon} size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {meta && <Badge variant="muted" className="max-w-[240px] truncate font-mono text-[10px]">{meta}</Badge>}
          <Button size="sm" variant="outline" onClick={() => load(source, limit)} disabled={loading}>
            <HugeiconsIcon icon={loading ? Loading03Icon : RefreshIcon} size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
          <p className="font-medium">Couldn’t load {source} logs</p>
          <p className="mt-0.5 break-words text-xs opacity-90">{error}</p>
          <p className="mt-1 text-xs opacity-70">
            If this is a permissions error, the API task role needs the log IAM policy
            (ssm:SendCommand/GetCommandInvocation, rds:DescribeDBLogFiles/DownloadDBLogFilePortion).
          </p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="h-[440px] overflow-auto rounded-lg border border-border/60 bg-[#0b0e14] p-3 font-mono text-[12px] leading-relaxed text-slate-200"
        >
          {lines.length === 0 && !loading ? (
            <p className="text-slate-500">No log lines.</p>
          ) : (
            lines.map((l, i) => (
              <div key={i} className="whitespace-pre-wrap break-words hover:bg-white/5">{l || " "}</div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
