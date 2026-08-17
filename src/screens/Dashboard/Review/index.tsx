"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckmarkCircle02Icon,
  Database01Icon,
  FlagIcon,
  Loading03Icon,
  ThumbsDownIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SearchSelect } from "@/components/SearchSelect"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { Pagination } from "@/components/Pagination"
import { JudgeAgreement } from "./JudgeAgreement"

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueItem {
  trace_id: string
  root_trace_id: string
  ingested_at: string | null
  model: string | null
  integration: string | null
  preview: string
  judge_score: number | null
  human_score: number | null
  comment: string
  flag_status: string
  flag_reason: string
  flag_note: string
}

type Cell = "agreed_good" | "judge_harsh" | "judge_lenient" | "agreed_bad"

interface Matrix {
  window_hours: number
  threshold: number
  agreed_good: number
  judge_harsh: number
  judge_lenient: number
  agreed_bad: number
  coverage: { both: number; judge_only: number; human_only: number }
  verdicts: Record<Cell, { label: string; detail: string; action: string | null }>
}

interface DatasetRef {
  dataset_id: string
  name: string
  example_count: number
}

const SOURCES = [
  { value: "all", label: "Everything needing review" },
  { value: "feedback", label: "Users said it was bad" },
  { value: "low_score", label: "Judges scored it low" },
  { value: "flagged", label: "Flagged by hand" },
]

const WINDOWS = [
  { value: "24", label: "Last 24 hours" },
  { value: "168", label: "Last 7 days" },
  { value: "720", label: "Last 30 days" },
]

const PAGE_SIZE = 25

function pct(v: number | null | undefined): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`
}

function scoreColor(v: number | null | undefined): string {
  if (v == null) return "text-muted-foreground/50"
  if (v >= 0.8) return "text-emerald-600 dark:text-emerald-400"
  if (v >= 0.5) return "text-amber-600 dark:text-amber-400"
  return "text-destructive"
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * The human half of the quality loop.
 *
 * Feedback has been collected for a while and nothing consumed it, which is the
 * expensive kind of waste — it is the only signal in the system a real person
 * produced. This page finds what a human or a judge thinks is bad, lets someone
 * look at it, and turns the ones worth keeping into dataset examples so the next
 * eval run catches the same failure.
 */
function Review() {
  const [hours, setHours] = useState("168")
  const [source, setSource] = useState("all")
  const [page, setPage] = useState(0)

  const [matrix, setMatrix] = useState<Matrix | null>(null)
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [datasets, setDatasets] = useState<DatasetRef[]>([])
  const [sending, setSending] = useState(false)

  const loadQueue = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        hours,
        source,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      })
      const res = await authFetch<{ items: QueueItem[] }>(`/api/v1/review/queue?${params}`)
      setItems(res.items ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load the review queue")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [hours, source, page])

  const loadMatrix = useCallback(async () => {
    try {
      setMatrix(await authFetch<Matrix>(`/api/v1/review/matrix?hours=${hours}`))
    } catch {
      // The matrix is a diagnostic; the queue is the job. Losing one must not
      // cost the other.
      setMatrix(null)
    }
  }, [hours])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  useEffect(() => {
    loadMatrix()
  }, [loadMatrix])

  useEffect(() => {
    authFetch<{ datasets: DatasetRef[] }>("/api/v1/datasets")
      .then((res) => setDatasets(res.datasets ?? []))
      .catch(() => setDatasets([]))
  }, [])

  // Selection is per page: carrying it across pages invites sending a hundred
  // traces you last looked at three screens ago.
  useEffect(() => {
    setSelected(new Set())
  }, [page, source, hours])

  async function resolve(item: QueueItem) {
    setItems((prev) => prev.filter((i) => i.trace_id !== item.trace_id))
    try {
      await authFetch(`/api/v1/traces/${item.trace_id}/flag`, { method: "DELETE" })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to resolve")
      loadQueue()
    }
  }

  async function sendToDataset(datasetId: string) {
    if (selected.size === 0 || sending) return
    setSending(true)
    try {
      const res = await authFetch<{ added: number; requested: number }>(
        "/api/v1/review/to-dataset",
        {
          method: "POST",
          body: { dataset_id: datasetId, trace_ids: Array.from(selected) },
        },
      )
      const name = datasets.find((d) => d.dataset_id === datasetId)?.name
      toast.success(
        res.added === res.requested
          ? `Added ${res.added} example${res.added === 1 ? "" : "s"} to “${name}”`
          : `Added ${res.added} of ${res.requested} — the rest had no input to capture.`,
      )
      setSelected(new Set())
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to add to dataset")
    } finally {
      setSending(false)
    }
  }

  const allSelected = items.length > 0 && selected.size === items.length

  return (
    <div>
      <DashboardPageHeader
        title="Review"
        description="What people and judges disagree about, and what both of them think is broken."
      />

      <div className="space-y-4 px-6 py-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <SearchSelect value={hours} onChange={setHours} options={WINDOWS}
                          placeholder="Window" searchable={false} />
          </div>
          <div className="w-60">
            <SearchSelect value={source} onChange={(v) => { setSource(v); setPage(0) }}
                          options={SOURCES} placeholder="Show" searchable={false} />
          </div>
        </div>

        {matrix ? <MatrixCard matrix={matrix} /> : null}

        {/* The matrix asks whether people and judges agree in aggregate; this
            asks it of one judge, which is the form you can act on. */}
        <JudgeAgreement hours={hours} />

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {/* Bulk actions appear only with a selection — an always-visible toolbar
            of disabled buttons teaches nothing. */}
        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
            <span className="text-xs font-medium text-foreground">
              {selected.size} selected
            </span>
            <span className="text-[11px] text-muted-foreground">
              Saved as examples with no expected output — what the model said here
              is wrong by construction.
            </span>
            <div className="ml-auto w-56">
              <SearchSelect
                value=""
                onChange={sendToDataset}
                options={datasets.map((d) => ({ value: d.dataset_id, label: d.name }))}
                placeholder={sending ? "Adding…" : "Add to dataset…"}
                emptyText="No datasets yet."
                disabled={sending || datasets.length === 0}
              />
            </div>
          </div>
        ) : null}

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={20}
                  className="mx-auto text-emerald-600 dark:text-emerald-400"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  Nothing needs review in this window.
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  Traces land here when a user rates one badly, a judge scores one
                  below {matrix ? Math.round(matrix.threshold * 100) : 50}%, or
                  someone flags one by hand.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    aria-label="Select all on this page"
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(items.map((i) => i.trace_id)))
                    }
                    className="size-3 accent-primary"
                  />
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                    Worst first
                  </span>
                </div>
                {items.map((item) => (
                  <QueueRow
                    key={item.trace_id}
                    item={item}
                    selected={selected.has(item.trace_id)}
                    onToggle={() =>
                      setSelected((prev) => {
                        const next = new Set(prev)
                        if (next.has(item.trace_id)) next.delete(item.trace_id)
                        else next.add(item.trace_id)
                        return next
                      })
                    }
                    onResolve={() => resolve(item)}
                  />
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <Pagination
          page={page}
          hasMore={items.length === PAGE_SIZE}
          loading={loading}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>
    </div>
  )
}

// ── The 2×2 ───────────────────────────────────────────────────────────────────

/**
 * Human verdict crossed with judge score.
 *
 * The two disagreement cells are the reason this exists: they say the *eval* is
 * wrong rather than the app, which is the distinction that decides whether
 * someone spends the afternoon on a prompt or on a judge.
 */
function MatrixCard({ matrix }: { matrix: Matrix }) {
  const cells: { key: Cell; count: number }[] = [
    { key: "judge_harsh", count: matrix.judge_harsh },
    { key: "agreed_good", count: matrix.agreed_good },
    { key: "agreed_bad", count: matrix.agreed_bad },
    { key: "judge_lenient", count: matrix.judge_lenient },
  ]
  const placed = cells.reduce((a, c) => a + c.count, 0)
  const { judge_only, human_only } = matrix.coverage

  return (
    <Card>
      <CardContent className="px-4 py-3">
        <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
          <p className="text-sm font-medium text-foreground">
            Do people and judges agree?
          </p>
          <p className="text-[11px] text-muted-foreground">
            Where they don&apos;t, the score is the thing to fix.
          </p>
        </div>

        {placed === 0 ? (
          <p className="py-4 text-center text-[11px] text-muted-foreground">
            No trace in this window carries both a human verdict and a judge
            score, so there is nothing to cross yet.
            {judge_only > 0
              ? ` ${judge_only} were judged but never rated by a person — collect feedback with fluiq.feedback() to fill this in.`
              : ""}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {cells.map(({ key, count }) => {
                const verdict = matrix.verdicts[key]
                const share = placed > 0 ? count / placed : 0
                return (
                  <div
                    key={key}
                    className={cn(
                      "rounded-lg border px-3 py-2.5",
                      key === "agreed_good" && "border-emerald-500/30 bg-emerald-500/5",
                      key === "agreed_bad" && "border-destructive/30 bg-destructive/5",
                      key === "judge_lenient" && "border-amber-500/40 bg-amber-500/10",
                      key === "judge_harsh" && "border-border/60 bg-muted/30",
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">{verdict.label}</p>
                      <p className="font-mono text-lg font-semibold tabular-nums">{count}</p>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {verdict.detail}
                    </p>
                    {verdict.action ? (
                      <p
                        className={cn(
                          "mt-1 text-[10px] font-medium uppercase tracking-wide",
                          verdict.action === "fix_eval"
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-destructive",
                        )}
                      >
                        {verdict.action === "fix_eval" ? "Fix the eval" : "Fix the app"}
                        <span className="ml-1 font-normal normal-case tracking-normal text-muted-foreground">
                          {Math.round(share * 100)}% of rated traces
                        </span>
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Built from {placed} trace{placed === 1 ? "" : "s"} carrying both signals.
              {judge_only > 0
                ? ` ${judge_only} more were judged but never rated by a person.`
                : ""}
              {human_only > 0 ? ` ${human_only} were rated but never judged.` : ""}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Queue row ─────────────────────────────────────────────────────────────────

function QueueRow({
  item,
  selected,
  onToggle,
  onResolve,
}: {
  item: QueueItem
  selected: boolean
  onToggle: () => void
  onResolve: () => void
}) {
  const reason =
    item.flag_status === "open"
      ? { icon: FlagIcon, label: item.flag_reason === "manual" ? "Flagged" : item.flag_reason }
      : item.human_score != null && item.human_score < 0.5
        ? { icon: ThumbsDownIcon, label: "User feedback" }
        : { icon: null, label: "Low score" }

  return (
    <div
      className={cn(
        "flex items-start gap-3 border-b border-border/40 px-3 py-2.5 last:border-0 transition-colors",
        selected ? "bg-primary/5" : "hover:bg-muted/30",
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        aria-label={`Select trace ${item.trace_id}`}
        className="mt-1 size-3 shrink-0 accent-primary"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          {reason.icon ? <HugeiconsIcon icon={reason.icon} size={11} /> : null}
          <span>{reason.label}</span>
          {item.model ? <span className="font-mono">{item.model}</span> : null}
          {item.integration ? <span>{item.integration}</span> : null}
        </div>

        <p className="mt-1 line-clamp-2 text-xs text-foreground">
          {item.preview || <span className="text-muted-foreground/60">No response recorded</span>}
        </p>

        {/* A user's own words about why it was bad are the most useful thing on
            the row, so they get their own line rather than a tooltip. */}
        {item.comment ? (
          <p className="mt-1 border-l-2 border-amber-500/40 pl-2 text-[11px] italic text-muted-foreground">
            {item.comment}
          </p>
        ) : null}
        {item.flag_note ? (
          <p className="mt-1 text-[11px] text-muted-foreground">{item.flag_note}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3 text-[11px]">
        <span className="text-right">
          <span className="block text-[10px] text-muted-foreground/60">Judge</span>
          <b className={cn("font-mono", scoreColor(item.judge_score))}>{pct(item.judge_score)}</b>
        </span>
        <span className="text-right">
          <span className="block text-[10px] text-muted-foreground/60">Human</span>
          <b className={cn("font-mono", scoreColor(item.human_score))}>{pct(item.human_score)}</b>
        </span>
        <a
          href={`/dashboard/traces?trace=${item.root_trace_id}`}
          className="rounded border border-border/60 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Open
        </a>
        {item.flag_status === "open" ? (
          <button
            type="button"
            onClick={onResolve}
            title="Mark as dealt with"
            className="rounded border border-border/60 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-emerald-600"
          >
            Resolve
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default Review
