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
      (filters.status      !== d.status      ? 1 : 0)
    )
  }, [filters])

  const setFilter = useCallback(<K extends keyof TraceFilters>(key: K, value: TraceFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_TRACE_FILTERS)
  }, [])

  return { filters, setFilter, clearFilters, activeFilterCount }
}
