"use client"

import { useCallback, useEffect, useState } from "react"
import { Loading03Icon, PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"

interface SchemaTable {
  name: string
  columns: string[]
}

interface SchemaResponse {
  tables: SchemaTable[]
  notes: string[]
}

interface QueryResult {
  columns: string[]
  rows: unknown[][]
  row_count: number
  truncated: boolean
  elapsed_ms: number
}

const STARTER = `SELECT model,
       count()      AS calls,
       avg(latency) AS avg_latency
FROM traces
WHERE ingested_at >= now() - INTERVAL 7 DAY
GROUP BY model
ORDER BY calls DESC`

/** Questions worth one click, chosen to teach the joins rather than the syntax. */
const EXAMPLES: { label: string; sql: string }[] = [
  {
    label: "Spend by model, last 7 days",
    sql: `SELECT model, sum(total_cost) AS cost, sum(output_tokens) AS out_tokens
FROM costs
WHERE ingested_at >= now() - INTERVAL 7 DAY
GROUP BY model
ORDER BY cost DESC`,
  },
  {
    label: "Worst-scoring traces",
    sql: `SELECT t.trace_id, t.model, avg(e.score) AS score
FROM traces AS t
JOIN evaluations AS e ON t.trace_id = e.trace_id
WHERE e.evaluator NOT LIKE 'human.%'
GROUP BY t.trace_id, t.model
ORDER BY score ASC
LIMIT 50`,
  },
  {
    label: "Scores by tag",
    sql: `SELECT g.tag, avg(e.score) AS score, count() AS n
FROM tags AS g
JOIN evaluations AS e ON g.trace_id = e.trace_id
GROUP BY g.tag
ORDER BY n DESC`,
  },
  {
    label: "Slowest agent runs",
    sql: `SELECT trace_id, agent_key, latency
FROM traces
WHERE is_root = 1 AND latency > 0
ORDER BY latency DESC
LIMIT 25`,
  },
]

/**
 * A read-only SQL box scoped to this organization.
 *
 * Every dashboard is somebody's second-favourite question. "Which model
 * regressed on Tuesday for customers on the gold plan" is not a screen anyone
 * will build, and without somewhere to ask it the answer is simply unavailable.
 *
 * The tables here are already filtered to your organization — the query never
 * names a real one — so there is no `WHERE org_id` to remember and no way to
 * forget it.
 */
function SqlSandbox() {
  const [sql, setSql] = useState(STARTER)
  const [schema, setSchema] = useState<SchemaResponse | null>(null)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    authFetch<SchemaResponse>("/api/v1/sql/schema")
      .then(setSchema)
      .catch(() => setSchema(null))
  }, [])

  const run = useCallback(async () => {
    if (running || !sql.trim()) return
    setRunning(true)
    setError(null)
    try {
      setResult(
        await authFetch<QueryResult>("/api/v1/sql/query", {
          method: "POST",
          body: { sql },
        }),
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Query failed")
      setResult(null)
    } finally {
      setRunning(false)
    }
  }, [sql, running])

  return (
    <div>
      <DashboardPageHeader
        title="SQL"
        description="Ask the question no dashboard answers. Read-only, and already scoped to your workspace."
      />

      <div className="grid gap-4 px-6 py-6 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-3">
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={(e) => {
              // Ctrl/Cmd+Enter runs — the shortcut every SQL tool has, and the
              // one people try first.
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault()
                run()
              }
            }}
            spellCheck={false}
            rows={10}
            className="w-full rounded-lg border border-border/60 bg-background p-3 font-mono text-xs leading-relaxed outline-none transition-colors focus:border-primary/50"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={run} disabled={running || !sql.trim()}>
              <HugeiconsIcon
                icon={running ? Loading03Icon : PlayIcon}
                size={14}
                className={running ? "animate-spin" : undefined}
              />
              Run
            </Button>
            <span className="text-[11px] text-muted-foreground">⌘/Ctrl + Enter</span>
            {result ? (
              <span className="ml-auto text-[11px] text-muted-foreground">
                {result.row_count} row{result.row_count === 1 ? "" : "s"} ·{" "}
                {result.elapsed_ms}ms
                {result.truncated ? " · truncated" : ""}
              </span>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-[11px] text-destructive">
              {error}
            </p>
          ) : null}

          {result ? (
            <Card>
              <CardContent className="p-0">
                {result.rows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No rows.
                  </p>
                ) : (
                  <div className="max-h-[28rem] overflow-auto">
                    <table className="w-full border-collapse text-[11px]">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b border-border/60 text-left">
                          {result.columns.map((column) => (
                            <th
                              key={column}
                              className="whitespace-nowrap px-2.5 py-1.5 font-medium text-muted-foreground"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, i) => (
                          <tr key={i} className="border-b border-border/30 last:border-0">
                            {row.map((cell, j) => (
                              <td
                                key={j}
                                className={cn(
                                  "max-w-[24rem] truncate px-2.5 py-1",
                                  typeof cell === "number" && "text-right font-mono tabular-nums",
                                )}
                                title={cell == null ? "" : String(cell)}
                              >
                                {cell == null ? (
                                  <span className="text-muted-foreground/40">null</span>
                                ) : typeof cell === "object" ? (
                                  JSON.stringify(cell)
                                ) : (
                                  String(cell)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-3">
          <Card>
            <CardContent className="px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                Start from
              </p>
              <div className="mt-1.5 space-y-1">
                {EXAMPLES.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setSql(example.sql)}
                    className="block w-full rounded px-1.5 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                Tables
              </p>
              {schema?.tables.map((table) => (
                <details key={table.name} className="mt-1.5">
                  <summary className="cursor-pointer font-mono text-[11px] text-foreground">
                    {table.name}
                  </summary>
                  <div className="mt-1 flex flex-wrap gap-1 pl-2">
                    {table.columns.map((column) => (
                      <button
                        key={column}
                        type="button"
                        onClick={() => setSql((prev) => `${prev}${column}`)}
                        title="Append to the query"
                        className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {column}
                      </button>
                    ))}
                  </div>
                </details>
              ))}
              {schema?.notes.map((note) => (
                <p key={note} className="mt-2 text-[10px] leading-snug text-muted-foreground">
                  {note}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default SqlSandbox
