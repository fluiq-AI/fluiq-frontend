import { useCallback, useEffect, useMemo, useState } from "react"
import { Loading03Icon, RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { formatCost } from "@/pages/Dashboard/Traces/utils"

import type { AgentRow, AgentSummaryResponse, SortKey } from "./types"
import { AgentTable } from "./AgentTable"

function Agents() {
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("total_cost")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await authFetch<AgentSummaryResponse>(
        "/api/v1/agents/summary?limit=200",
      )
      setAgents(data.agents)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load agents")
      setAgents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const sortedAgents = useMemo(() => {
    const arr = [...agents]
    const dir = sortDir === "asc" ? 1 : -1
    arr.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
    return arr
  }, [agents, sortKey, sortDir])

  const totals = useMemo(() => {
    let cost = 0
    let runs = 0
    let tokens = 0
    for (const a of agents) {
      cost += a.total_cost ?? 0
      runs += a.runs ?? 0
      tokens += a.total_tokens ?? 0
    }
    return { cost, runs, tokens }
  }, [agents])

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Agents
          </h1>
          <p className="mt-2 text-muted-foreground">
            Production cost and usage rolled up across every run of each agent,
            chain, or LangGraph node.
          </p>
        </div>
        <Button variant="outline" onClick={fetchAgents} disabled={loading}>
          <HugeiconsIcon
            icon={loading ? Loading03Icon : RefreshIcon}
            className={loading ? "animate-spin" : undefined}
          />
          Refresh
        </Button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryStat label="Agents" value={String(agents.length)} />
        <SummaryStat label="Total runs" value={totals.runs.toLocaleString()} />
        <SummaryStat label="Total cost" value={formatCost(totals.cost, "USD")} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-agent breakdown</CardTitle>
          <CardDescription>
            Click a column header to sort. Untraced LLM calls are bucketed as
            <code className="mx-1 rounded bg-muted px-1 py-px font-mono text-xs">
              provider:model
            </code>
            with kind <span className="font-medium">llm</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="px-6 py-10 text-center text-sm text-destructive">
              {error}
            </div>
          ) : loading && agents.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Loading agents…
            </div>
          ) : agents.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No agent activity yet. Once your SDK starts emitting priced traces,
              roll-ups will appear here.
            </div>
          ) : (
            <AgentTable
              agents={sortedAgents}
              sortKey={sortKey}
              sortDir={sortDir}
              onToggleSort={toggleSort}
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

export default Agents
