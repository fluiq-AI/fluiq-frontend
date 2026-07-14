import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Cancel01Icon,
  Loading03Icon,
  RefreshIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Pagination } from "@/components/Pagination"

import type { AgentRow, AgentSummaryResponse, SortKey } from "./utils/types"
import { AgentTable } from "./components/AgentTable"
import { AgentDrawer } from "./components/AgentDrawer"

const AGENTS_PAGE_SIZE = 50

function Agents() {
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("last_run")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [selectedAgent, setSelectedAgent] = useState<AgentRow | null>(null)
  const [search, setSearch] = useState("")
  const [integrationFilter, setIntegrationFilter] = useState("all")

  // Windowed pagination: fetch one page (replacing the list) whenever `page` or
  // `reloadKey` (refresh) changes. `hasMore` = the page came back full.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    authFetch<AgentSummaryResponse>(
      `/api/v1/agents/summary?limit=${AGENTS_PAGE_SIZE}&offset=${page * AGENTS_PAGE_SIZE}`,
    )
      .then((data) => {
        if (cancelled) return
        setAgents(data.agents)
        setHasMore(data.agents.length >= AGENTS_PAGE_SIZE)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.detail : "Failed to load agents")
        setAgents([])
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [page, reloadKey])

  // Refresh reloads from the first page (batched → a single fetch).
  const refresh = useCallback(() => {
    setPage(0)
    setReloadKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!selectedAgent) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedAgent(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedAgent])

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

  const availableIntegrations = useMemo(() => {
    const seen = new Set<string>()
    for (const a of agents) if (a.integration) seen.add(a.integration)
    return [...seen].sort()
  }, [agents])

  const filteredAgents = useMemo(() => {
    let result = sortedAgents
    const q = search.trim().toLowerCase()
    if (q) result = result.filter((a) => a.agent_key.toLowerCase().includes(q))
    if (integrationFilter !== "all") result = result.filter((a) => a.integration === integrationFilter)
    return result
  }, [sortedAgents, search, integrationFilter])

  const activeFilterCount = (search.trim() ? 1 : 0) + (integrationFilter !== "all" ? 1 : 0)

  function clearFilters() {
    setSearch("")
    setIntegrationFilter("all")
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const selectedKey = selectedAgent
    ? `${selectedAgent.agent_key}__${selectedAgent.agent_kind}__${selectedAgent.integration}`
    : undefined

  return (
    <>
      <DashboardPageHeader
        title="Agents"
        description="Cost and usage rolled up across every run of each traced function, chain, or LangGraph node."
      />
      <div className="px-6 py-6">

      <Card>
        <CardHeader>
          <div className="flex justify-between">
          <div>
          <CardTitle>Per-agent breakdown</CardTitle>
          <CardDescription>
            {filteredAgents.length === agents.length
              ? "Click a row to inspect recent runs. Click a column header to sort."
              : `${filteredAgents.length} of ${agents.length} agents match`}
          </CardDescription>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <HugeiconsIcon icon={loading ? Loading03Icon : RefreshIcon} className={loading ? "animate-spin" : undefined} />
              Refresh
            </Button>
          </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {agents.length > 0 ? (
            <div className="flex justify-between">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2.5">
              {/* Search */}

              <div className="relative flex items-center">
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={13}
                  className="pointer-events-none absolute left-2.5 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Search agents…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-48 rounded-md border border-border/60 bg-background pl-7 pr-3 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Integration filter */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 text-xs shadow-xs cursor-pointer select-none hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:bg-muted/60",
                    integrationFilter !== "all" && "border-primary/60 bg-primary/5 text-primary font-medium hover:bg-primary/10 data-[state=open]:bg-primary/10",
                  )}
                >
                  {integrationFilter === "all"
                    ? "All integrations"
                    : integrationFilter === "OTHERFUNCTION" ? "Function" : integrationFilter}
                  <span className="text-[10px] opacity-60">▾</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-44">
                  <DropdownMenuRadioGroup value={integrationFilter} onValueChange={setIntegrationFilter}>
                    <DropdownMenuRadioItem value="all">All integrations</DropdownMenuRadioItem>
                    {availableIntegrations.map((i) => (
                      <DropdownMenuRadioItem key={i} value={i}>
                        {i === "OTHERFUNCTION" ? "Function" : i}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear */}
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1 text-xs text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={11} />
                  Clear
                  <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 font-mono text-[9px] font-semibold text-primary">
                    {activeFilterCount}
                  </span>
                </button>
              ) : null}
            </div>
            </div>
          ) : null}
           

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
          ) : filteredAgents.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No agents match your filters.
            </div>
          ) : (
            <AgentTable
              agents={filteredAgents}
              sortKey={sortKey}
              sortDir={sortDir}
              onToggleSort={toggleSort}
              selectedKey={selectedKey}
              onSelectAgent={setSelectedAgent}
            />
          )}
          {!error ? (
            <Pagination
              page={page}
              hasMore={hasMore}
              loading={loading}
              onPrev={() => setPage((p) => Math.max(0, p - 1))}
              onNext={() => setPage((p) => p + 1)}
            />
          ) : null}
        </CardContent>
      </Card>
      </div>

      {selectedAgent ? (
        <AgentDrawer
          key={selectedKey}
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      ) : null}
    </>
  )
}

export default Agents
