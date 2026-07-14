"use client"

import { useEffect, useState } from "react"
import {
  Cancel01Icon,
  Loading03Icon,
  RoboticIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"
import type { AgentRow, AgentSummaryResponse } from "@/pages/Dashboard/Agents/utils/types"

/**
 * Connect an agent to a dataset. Connecting imports ALL of the agent's runs to
 * date as examples (server-side, deduped by source trace) and links the agent
 * so its future runs auto-append.
 */
export function ConnectAgentsModal({
  datasetId,
  onClose,
  onDone,
}: {
  datasetId: string
  onClose: () => void
  onDone: (importedCount: number) => void
}) {
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [picked, setPicked] = useState<AgentRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingAgents(true)
      try {
        const data = await authFetch<AgentSummaryResponse>("/api/v1/agents/summary?limit=100")
        if (!cancelled) setAgents(data.agents)
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.detail : "Failed to load agents")
      } finally {
        if (!cancelled) setLoadingAgents(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function connect() {
    if (!picked) return
    setBusy(true)
    setError(null)
    try {
      const res = await authFetch<{ ok: boolean; imported: number }>(
        `/api/v1/datasets/${datasetId}/agents`,
        {
          method: "POST",
          body: { agent_key: picked.agent_key, agent_kind: picked.agent_kind },
        },
      )
      onDone(res.imported ?? 0)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to connect agent")
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Connect agents"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={RoboticIcon} size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Connect an agent</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {!picked ? (
            loadingAgents ? (
              <Loading label="Loading agents…" />
            ) : agents.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No agents found yet.</p>
            ) : (
              <div className="space-y-1.5">
                <p className="mb-2 text-xs text-muted-foreground">
                  Pick an agent — connecting imports all of its runs to date and keeps future runs flowing in.
                </p>
                {agents.map((a) => (
                  <button
                    key={`${a.agent_key}::${a.agent_kind}`}
                    type="button"
                    onClick={() => { setPicked(a); setError(null) }}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium">{a.agent_key}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {a.integration} · {a.runs.toLocaleString()} runs
                    </span>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setPicked(null)}
                disabled={busy}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                ← Back to agents
              </button>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={RoboticIcon} size={15} className="text-muted-foreground" />
                  <span className="font-mono text-sm font-medium">{picked.agent_key}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  This imports{" "}
                  <span className="font-medium text-foreground">
                    all {picked.runs.toLocaleString()} run{picked.runs !== 1 ? "s" : ""}
                  </span>{" "}
                  of this agent to date as dataset examples, and links it so its{" "}
                  <span className="font-medium text-foreground">future runs auto-append</span>.
                  Runs already imported are skipped.
                </p>
              </div>
            </div>
          )}
          {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
        </div>

        {picked ? (
          <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={connect} disabled={busy}>
              {busy ? (
                <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
              ) : (
                <HugeiconsIcon icon={Tick02Icon} size={13} />
              )}
              {busy ? "Importing…" : "Connect & import"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
      <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
      {label}
    </div>
  )
}
