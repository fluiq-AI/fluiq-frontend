import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ApiKey } from "@/lib/auth-types"
import type {
  TraceFilters,
  TraceQualityFilter,
  TraceSecurityFilter,
  TraceSortKey,
  TraceStatusFilter,
} from "../utils/types"
import { ALL_KEYS } from "../utils/constants"
import { ViewPicker } from "./ViewPicker"

const INTEGRATIONS: { value: string; label: string }[] = [
  { value: "all",           label: "All integrations" },
  { value: "OTHERFUNCTION", label: "Function" },
  { value: "OPENAI",        label: "OpenAI" },
  { value: "ANTHROPIC",     label: "Anthropic" },
  { value: "GEMINI",        label: "Gemini" },
  { value: "LANGCHAIN",     label: "LangChain" },
  { value: "LANGGRAPH",     label: "LangGraph" },
  { value: "LLAMAINDEX",    label: "LlamaIndex" },
  { value: "CREWAI",        label: "CrewAI" },
  { value: "GOOGLEADK",     label: "Google ADK" },
  { value: "CHROMADB",      label: "ChromaDB" },
  { value: "PINECONE",      label: "Pinecone" },
  { value: "QDRANT",        label: "Qdrant" },
  { value: "WEAVIATE",      label: "Weaviate" },
  { value: "FAISS",         label: "FAISS" },
]

const triggerCls = cn(
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60",
  "bg-background px-3 text-xs shadow-xs cursor-pointer select-none",
  "hover:bg-muted/60 transition-colors",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "data-[state=open]:bg-muted/60",
)

function FilterDropdown<T extends string>({
  label,
  value,
  onChange,
  options,
  active,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  active: boolean
}) {
  const currentLabel = options.find((o) => o.value === value)?.label ?? label
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(triggerCls, active && "border-primary/60 bg-primary/5 text-primary font-medium hover:bg-primary/10 data-[state=open]:bg-primary/10")}
        aria-label={label}
      >
        {currentLabel}
        <span className="text-[10px] text-current opacity-60">▾</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function FilterBar({
  filters,
  setFilter,
  clearFilters,
  activeFilterCount,
  apiKeys,
  keyId,
  onKeyChange,
  loading,
  orgTags = [],
  onApplyView,
}: {
  filters: TraceFilters
  setFilter: <K extends keyof TraceFilters>(key: K, value: TraceFilters[K]) => void
  clearFilters: () => void
  activeFilterCount: number
  apiKeys: ApiKey[]
  keyId: string
  onKeyChange: (id: string) => void
  loading: boolean
  /** Tags the org actually uses, with counts. Drives the tag dropdown. */
  orgTags?: { tag: string; count: number }[]
  onApplyView: (filters: Partial<TraceFilters>) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2.5">
      {/* API key scope selector */}
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={loading || apiKeys.length === 0}
          className={cn(triggerCls, "disabled:cursor-not-allowed disabled:opacity-50")}
        >
          {keyId === ALL_KEYS
            ? "All API keys"
            : (apiKeys.find((k) => k.key_id === keyId)?.name ?? "All API keys")}
          <span className="text-[10px] opacity-60">▾</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-52">
          <DropdownMenuRadioGroup value={keyId} onValueChange={onKeyChange}>
            <DropdownMenuRadioItem value={ALL_KEYS}>
              All API keys
            </DropdownMenuRadioItem>
            {apiKeys.map((k) => (
              <DropdownMenuRadioItem key={k.key_id} value={k.key_id}>
                {k.name}
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {k.prefix}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-px bg-border/60" />

      <FilterDropdown<TraceSortKey>
        label="Sort"
        value={filters.sort}
        onChange={(v) => setFilter("sort", v)}
        active={filters.sort !== "newest"}
        options={[
          { value: "newest",       label: "↓ Newest first" },
          { value: "oldest",       label: "↑ Oldest first" },
          { value: "latency_desc", label: "↓ Highest latency" },
          { value: "latency_asc",  label: "↑ Lowest latency" },
          { value: "cost_desc",    label: "↓ Highest cost" },
          { value: "cost_asc",     label: "↑ Lowest cost" },
        ]}
      />

      <FilterDropdown<TraceStatusFilter>
        label="Status"
        value={filters.status}
        onChange={(v) => setFilter("status", v)}
        active={filters.status !== "all"}
        options={[
          { value: "all",       label: "All statuses" },
          { value: "completed", label: "Completed" },
          { value: "running",   label: "Running" },
          { value: "blocked",   label: "Blocked" },
          { value: "failed",    label: "Failed" },
        ]}
      />

      <FilterDropdown<TraceSecurityFilter>
        label="Security"
        value={filters.security}
        onChange={(v) => setFilter("security", v)}
        active={filters.security !== "all"}
        options={[
          { value: "all",    label: "All security" },
          { value: "clean",  label: "Clean" },
          { value: "low",    label: "Low risk" },
          { value: "medium", label: "Medium risk" },
          { value: "high",   label: "High risk" },
        ]}
      />

      <FilterDropdown<string>
        label="Integration"
        value={filters.integration}
        onChange={(v) => setFilter("integration", v)}
        active={filters.integration !== "all"}
        options={INTEGRATIONS}
      />

      <FilterDropdown<TraceQualityFilter>
        label="Quality"
        value={filters.quality}
        onChange={(v) => setFilter("quality", v)}
        active={filters.quality !== "all"}
        options={[
          { value: "all",    label: "All quality" },
          { value: "high",   label: "High  (≥ 80%)" },
          { value: "medium", label: "Medium (50–80%)" },
          { value: "low",    label: "Low  (< 50%)" },
          { value: "none",   label: "No evals" },
        ]}
      />

      <TagFilter
        selected={filters.tags}
        available={orgTags}
        onChange={(tags) => setFilter("tags", tags)}
      />

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

      {/* Views sit at the far right, after the filters they capture — you narrow
          first, then decide the result is worth keeping. */}
      <div className="ml-auto">
        <ViewPicker filters={filters} onApply={onApplyView} />
      </div>
    </div>
  )
}

/**
 * Tags a trace must carry. Multiple tags narrow (AND), matching every other
 * filter here — one that widened instead would be a trap.
 */
function TagFilter({
  selected,
  available,
  onChange,
}: {
  selected: string[]
  available: { tag: string; count: number }[]
  onChange: (tags: string[]) => void
}) {
  // Nothing tagged yet: showing an empty dropdown teaches nothing, so the
  // control stays hidden until there is something to pick.
  if (available.length === 0 && selected.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(triggerCls, selected.length > 0 && "border-primary/40 bg-primary/5 text-primary")}
      >
        {selected.length === 0
          ? "Tags"
          : selected.length === 1
            ? selected[0]
            : `${selected.length} tags`}
        <span className="text-[10px] opacity-60">▾</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 min-w-52 overflow-y-auto">
        {available.map((t) => {
          const on = selected.includes(t.tag)
          return (
            <DropdownMenuCheckboxItem
              key={t.tag}
              checked={on}
              onCheckedChange={(next) =>
                onChange(next ? [...selected, t.tag] : selected.filter((x) => x !== t.tag))
              }
            >
              <span className="truncate">{t.tag}</span>
              <span className="ml-auto pl-2 font-mono text-[10px] text-muted-foreground">
                {t.count}
              </span>
            </DropdownMenuCheckboxItem>
          )
        })}
        {selected.length > 0 ? (
          <DropdownMenuItem onClick={() => onChange([])} className="text-muted-foreground">
            Clear tags
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
