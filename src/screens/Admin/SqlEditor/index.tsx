"use client"

import { useEffect, useRef, useState } from "react"
import {
  EditorView,
  lineNumbers,
  keymap,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  MatchDecorator,
  ViewPlugin,
  Decoration,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { history, defaultKeymap, historyKeymap } from "@codemirror/commands"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Loading03Icon,
  PlayIcon,
  Cancel01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Download04Icon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { cn } from "@/lib/utils"

type Database = "postgres" | "clickhouse"

interface QueryResult {
  database: string
  columns: string[]
  rows: unknown[][]
  row_count: number
  truncated: boolean
  elapsed_ms: number
}

const SAMPLES: Record<Database, string> = {
  postgres: "SELECT name, plan_tier, created_at\nFROM users\nORDER BY created_at DESC\nLIMIT 50;",
  clickhouse: "SELECT table, sum(rows) AS rows\nFROM system.parts\nWHERE active AND database = 'fluiq'\nGROUP BY table\nORDER BY rows DESC;",
}

// ── lightweight SQL keyword highlight (no lang-sql dep) ─────────────────────────
const kwMatcher = new MatchDecorator({
  regexp:
    /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|JOIN|LEFT|RIGHT|INNER|ON|AS|AND|OR|NOT|IN|IS|NULL|WITH|HAVING|DISTINCT|COUNT|SUM|AVG|MIN|MAX|DESC|ASC|SHOW|DESCRIBE|EXPLAIN)\b/gi,
  decoration: Decoration.mark({ class: "cm-sql-kw" }),
})
const sqlHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = kwMatcher.createDeco(view)
    }
    update(u: ViewUpdate) {
      this.decorations = kwMatcher.updateDeco(u, this.decorations)
    }
  },
  { decorations: (v) => v.decorations },
)

const theme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: "14px" },
  ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", overflow: "auto" },
  ".cm-content": { padding: "14px 0" },
  ".cm-line": { padding: "0 18px", lineHeight: "1.75" },
  ".cm-gutters": { backgroundColor: "var(--muted)", borderRight: "1px solid var(--border)", color: "var(--muted-foreground)" },
  ".cm-focused": { outline: "none" },
  ".cm-cursor": { borderLeftColor: "var(--foreground)" },
  ".cm-sql-kw": { color: "var(--fluiq-var-color, #2563eb)", fontWeight: "600" },
})

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "NULL"
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

function toCsv(result: QueryResult): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  const head = result.columns.map(esc).join(",")
  const body = result.rows.map((r) => r.map((c) => esc(cellText(c))).join(",")).join("\n")
  return `${head}\n${body}`
}

export default function SqlEditorPage() {
  const [db, setDb] = useState<Database>("postgres")
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)        // results drawer visible
  const [expanded, setExpanded] = useState(false) // results drawer tall

  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const runRef = useRef<() => void>(() => {})

  async function run() {
    const sql = viewRef.current?.state.doc.toString().trim()
    if (!sql || running) return
    setRunning(true)
    setError(null)
    setOpen(true) // drop the panel up as soon as we fire
    try {
      const res = await authFetch<QueryResult>("/admin/infra/query", {
        method: "POST",
        body: { database: db, sql },
      })
      setResult(res)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Query failed")
      setResult(null)
    } finally {
      setRunning(false)
    }
  }
  runRef.current = run

  useEffect(() => {
    if (!containerRef.current) return
    viewRef.current = new EditorView({
      state: EditorState.create({
        doc: SAMPLES.postgres,
        extensions: [
          lineNumbers(),
          history(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          drawSelection(),
          EditorView.lineWrapping,
          sqlHighlighter,
          theme,
          keymap.of([
            { key: "Mod-Enter", run: () => (runRef.current(), true) },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
        ],
      }),
      parent: containerRef.current,
    })
    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [])

  function loadSample(next: Database) {
    setDb(next)
    const view = viewRef.current
    if (!view) return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: SAMPLES[next] } })
  }

  function downloadCsv() {
    if (!result) return
    const blob = new Blob([toCsv(result)], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `fluiq-${db}-query.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relative flex h-[calc(100dvh-7rem)] flex-col overflow-hidden">
      {/* Header / toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">SQL Editor</h1>
          <p className="text-sm text-muted-foreground">
            Read-only queries against Postgres or ClickHouse · SELECT/WITH/SHOW/DESCRIBE/EXPLAIN · capped at 1000 rows.
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-md border border-border/60 p-0.5">
            {(["postgres", "clickhouse"] as Database[]).map((d) => (
              <button
                key={d}
                onClick={() => loadSample(d)}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium capitalize transition-colors",
                  db === d ? "bg-[#1860D3] text-white" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <Badge variant="muted">read-only</Badge>
          <span className="hidden text-xs text-muted-foreground sm:inline">⌘/Ctrl + Enter</span>
          <Button size="sm" onClick={run} disabled={running}>
            <HugeiconsIcon icon={running ? Loading03Icon : PlayIcon} className={running ? "animate-spin" : ""} size={14} />
            Run
          </Button>
        </div>
      </div>

      {/* Editor fills the page */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border/60">
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {/* Results drawer — drops UP from the bottom */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-xl border-x border-t border-border/60 bg-background shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        )}
        style={{ height: expanded ? "82%" : "52%" }}
      >
        {/* Drawer header */}
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
          <div className="mx-auto h-1 w-10 rounded-full bg-border sm:hidden" />
          <span className="text-xs font-semibold">Results</span>
          {result && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{result.row_count} row{result.row_count === 1 ? "" : "s"}</span>
              <span>·</span>
              <span>{result.elapsed_ms} ms</span>
              {result.truncated && <Badge variant="muted">truncated to 1000</Badge>}
            </div>
          )}
          <div className="ml-auto flex items-center gap-1">
            {result && result.columns.length > 0 && (
              <Button size="sm" variant="ghost" onClick={downloadCsv} title="Download CSV">
                <HugeiconsIcon icon={Download04Icon} size={14} />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)} title={expanded ? "Collapse" : "Expand"}>
              <HugeiconsIcon icon={expanded ? ArrowDown01Icon : ArrowUp01Icon} size={16} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} title="Close">
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </Button>
          </div>
        </div>

        {/* Drawer body */}
        <div className="min-h-0 flex-1 overflow-auto">
          {running ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" /> Running…
            </div>
          ) : error ? (
            <div className="m-3 rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : result && result.columns.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="w-10 border-b border-border/60 px-3 py-2 text-right font-medium text-muted-foreground">#</th>
                  {result.columns.map((c) => (
                    <th key={c} className="whitespace-nowrap border-b border-border/60 px-3 py-2 font-medium">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} className="even:bg-muted/30">
                    <td className="border-b border-border/40 px-3 py-1.5 text-right font-mono text-muted-foreground">{i + 1}</td>
                    {row.map((cell, j) => (
                      <td key={j} className="max-w-[360px] truncate border-b border-border/40 px-3 py-1.5 font-mono" title={cellText(cell)}>
                        {cellText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : result ? (
            <p className="p-4 text-sm text-muted-foreground">Query ran successfully — no rows returned.</p>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Run a query to see results.</p>
          )}
        </div>
      </div>
    </div>
  )
}
