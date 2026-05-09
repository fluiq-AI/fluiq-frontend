import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { formatCost, formatDate, formatLatency } from "@/pages/Dashboard/Traces/utils"
import type { AgentRow, SortKey } from "./types"

export const KIND_LABEL: Record<string, string> = {
  function: "function",
  chain: "chain",
  langgraph_node: "graph",
}

export const KIND_CLASS: Record<string, string> = {
  function: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  chain: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  langgraph_node: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
}

export function AgentTable({
  agents,
  sortKey,
  sortDir,
  onToggleSort,
  selectedKey,
  onSelectAgent,
}: {
  agents: AgentRow[]
  sortKey: SortKey
  sortDir: "asc" | "desc"
  onToggleSort: (key: SortKey) => void
  selectedKey?: string
  onSelectAgent: (a: AgentRow) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <SortableTh label="Agent"       skey="agent_key"      sortKey={sortKey} sortDir={sortDir} onClick={onToggleSort} />
            <SortableTh label="Integration" skey="integration"    sortKey={sortKey} sortDir={sortDir} onClick={onToggleSort} />
            <SortableTh label="Runs"      skey="runs"             sortKey={sortKey} sortDir={sortDir} onClick={onToggleSort} align="right" />
            <SortableTh label="Total cost" skey="total_cost"      sortKey={sortKey} sortDir={sortDir} onClick={onToggleSort} align="right" />
            <SortableTh label="Avg / run" skey="avg_cost_per_run" sortKey={sortKey} sortDir={sortDir} onClick={onToggleSort} align="right" />
            <SortableTh label="Tokens"    skey="total_tokens"     sortKey={sortKey} sortDir={sortDir} onClick={onToggleSort} align="right" />
            <SortableTh label="Avg latency" skey="avg_latency"    sortKey={sortKey} sortDir={sortDir} onClick={onToggleSort} align="right" />
            <SortableTh label="Last run"  skey="last_run"         sortKey={sortKey} sortDir={sortDir} onClick={onToggleSort} />
          </tr>
        </thead>
        <tbody>
          {agents.map((a) => {
            const rowKey = `${a.agent_key}__${a.agent_kind}__${a.integration}`
            const isSelected = selectedKey === rowKey
            return (
            <tr
              key={rowKey}
              onClick={() => onSelectAgent(a)}
              className={cn(
                "cursor-pointer border-b border-border/60 align-middle hover:bg-muted/20",
                isSelected ? "bg-primary/5 hover:bg-primary/8" : "",
              )}
            >
              <td className="px-6 py-3 font-mono text-xs">{a.agent_key}</td>
              <td className="px-6 py-3 text-xs text-muted-foreground">
                {a.integration == "OTHERFUNCTION" ? "FUNCTION" : a.integration || "\u2014"}
              </td>
              <td className="px-6 py-3 text-right font-mono text-xs">
                {a.runs.toLocaleString()}
              </td>
              <td className="px-6 py-3 text-right font-mono text-xs font-medium">
                {formatCost(a.total_cost, "USD")}
              </td>
              <td className="px-6 py-3 text-right font-mono text-xs text-muted-foreground">
                {formatCost(a.avg_cost_per_run, "USD")}
              </td>
              <td className="px-6 py-3 text-right font-mono text-xs text-muted-foreground">
                {a.total_tokens.toLocaleString()}
              </td>
              <td className="px-6 py-3 text-right font-mono text-xs text-muted-foreground">
                {formatLatency(a.avg_latency)}
              </td>
              <td className="px-6 py-3 text-xs text-muted-foreground">
                {a.last_run ? formatDate(a.last_run) : "\u2014"}
              </td>
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  )
}

function SortableTh({
  label,
  skey,
  sortKey,
  sortDir,
  onClick,
  align = "left",
  sortable = true,
}: {
  label: string
  skey: SortKey
  sortKey: SortKey
  sortDir: "asc" | "desc"
  onClick: (key: SortKey) => void
  align?: "left" | "right"
  sortable?: boolean
}) {
  const active = sortable && skey === sortKey
  return (
    <th
      className={cn(
        "px-6 py-2 font-medium",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => onClick(skey)}
          className={cn(
            "inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground",
            active ? "text-foreground" : "",
          )}
        >
          {label}
          {active ? (
            <HugeiconsIcon
              icon={sortDir === "asc" ? ArrowUp01Icon : ArrowDown01Icon}
              size={12}
            />
          ) : null}
        </button>
      ) : (
        label
      )}
    </th>
  )
}
