import { useCallback, useMemo, useState } from "react"

import type { TraceFilters } from "../utils/types"
import { DEFAULT_TRACE_FILTERS } from "../utils/types"

export function useTraceFilters() {
  const [filters, setFilters] = useState<TraceFilters>(DEFAULT_TRACE_FILTERS)

  const activeFilterCount = useMemo(() => {
    const d = DEFAULT_TRACE_FILTERS
    return (
      (filters.sort        !== d.sort        ? 1 : 0) +
      (filters.security    !== d.security    ? 1 : 0) +
      (filters.integration !== d.integration ? 1 : 0) +
      (filters.quality     !== d.quality     ? 1 : 0) +
      (filters.status      !== d.status      ? 1 : 0) +
      // Each tag narrows independently, so each counts — "2 filters" reading as
      // one when two tags are applied would misstate how narrow the list is.
      filters.tags.length
    )
  }, [filters])

  const setFilter = useCallback(<K extends keyof TraceFilters>(key: K, value: TraceFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_TRACE_FILTERS)
  }, [])

  /** Replace the whole filter set — how a saved view is applied. */
  const applyFilters = useCallback((next: Partial<TraceFilters>) => {
    setFilters({ ...DEFAULT_TRACE_FILTERS, ...next })
  }, [])

  return { filters, setFilter, setFilters, applyFilters, clearFilters, activeFilterCount }
}
