import { useMemo } from "react"
import type { Dispatch, SetStateAction } from "react"

import { useRealtimeStream } from "@/lib/useRealtimeStream"

import { ALL_KEYS, TRACES_PAGE_SIZE } from "../utils/constants"
import type { EvaluationScore, TraceRecord } from "../utils/types"
import { getStr, isRunning } from "../utils"

export function useTraceStream({
  keyId,
  setTraces,
  live = true,
  onReopen,
}: {
  keyId: string
  setTraces: Dispatch<SetStateAction<TraceRecord[]>>
  // When false (the user is viewing a deeper, fixed-offset page), new-trace
  // inserts are paused so they don't shift the page window; enrichment updates
  // to already-visible rows still apply.
  live?: boolean
  onReopen: () => void
}) {
  const streamPath = useMemo(() => {
    const params = new URLSearchParams()
    if (keyId !== ALL_KEYS) params.set("key_id", keyId)
    const qs = params.toString()
    return `/api/v1/traces/stream${qs ? `?${qs}` : ""}`
  }, [keyId])

  const { error: realtimeError } = useRealtimeStream({
    path: streamPath,
    events: ["trace", "trace.enriched", "trace.started"],
    onEvent: (data, msg) => {
      if (!data || typeof data !== "object") return

      if (msg.event === "trace.started") {
        // Paused on deeper pages — a new running row belongs on page 1 only.
        if (!live) return
        const payload = data as {
          api_key_prefix?: string
          trace_id?: string
          ingested_at_ms?: number
          event?: Record<string, unknown>
        }
        if (!payload.event || typeof payload.event !== "object") return
        // Only prepend root-level placeholders; child spans are loaded lazily.
        const evtRoot = payload.event["root_trace_id"]
        const evtTid = payload.trace_id ?? payload.event["trace_id"]
        if (evtRoot && evtRoot !== evtTid) return
        const placeholder: TraceRecord = {
          api_key_prefix: payload.api_key_prefix ?? "",
          event: { ...payload.event, status: "running" },
          ingested_at: payload.ingested_at_ms
            ? new Date(payload.ingested_at_ms).toISOString()
            : new Date().toISOString(),
          cost: null,
          currency: null,
          evaluations: [],
        }
        setTraces((prev) => {
          const tid = payload.trace_id ?? getStr(placeholder.event, "trace_id")
          if (tid && prev.some((t) => getStr(t.event, "trace_id") === tid)) return prev
          return [...prev, placeholder]
            .sort((a, b) => b.ingested_at.localeCompare(a.ingested_at))
            .slice(0, TRACES_PAGE_SIZE * 4)
        })
        return
      }

      if (msg.event === "trace.enriched") {
        const payload = data as {
          trace_id?: string
          cost?: number
          currency?: string
          evaluation?: EvaluationScore
          enrichment?: string
          security?: Record<string, unknown>
        }
        const tid = payload.trace_id
        if (!tid) return
        setTraces((prev) => {
          let changed = false
          const next = prev.map((t) => {
            if (getStr(t.event, "trace_id") !== tid) return t
            changed = true
            const merged: TraceRecord = { ...t }
            if (typeof payload.cost === "number") {
              merged.cost = payload.cost
              merged.currency = payload.currency ?? t.currency ?? "USD"
            }
            if (payload.evaluation) {
              const incoming = payload.evaluation
              const existing = t.evaluations ?? []
              const idx = existing.findIndex(
                (e) => e.evaluator === incoming.evaluator && e.metric === incoming.metric,
              )
              merged.evaluations =
                idx >= 0
                  ? existing.map((e, i) => (i === idx ? incoming : e))
                  : [...existing, incoming]
            }
            if (payload.enrichment === "security" && payload.security) {
              merged.event = { ...t.event, ...payload.security }
            }
            return merged
          })
          return changed ? next : prev
        })
        return
      }

      // "trace" event — completed trace record. Paused on deeper pages (no
      // running placeholder to upgrade there, and appending would shift the
      // fixed offset window).
      if (!live) return
      const payload = data as {
        api_key_prefix?: string
        trace_id?: string
        ingested_at_ms?: number
        event?: Record<string, unknown>
      }
      if (!payload.event || typeof payload.event !== "object") return
      // Only handle root traces; child spans are loaded lazily on expand.
      const evtRoot = payload.event["root_trace_id"]
      const evtTid = payload.trace_id ?? payload.event["trace_id"]
      if (evtRoot && evtRoot !== evtTid) return
      const newRecord: TraceRecord = {
        api_key_prefix: payload.api_key_prefix ?? "",
        event: payload.event,
        ingested_at: payload.ingested_at_ms
          ? new Date(payload.ingested_at_ms).toISOString()
          : new Date().toISOString(),
        cost: null,
        currency: null,
        evaluations: [],
      }
      setTraces((prev) => {
        const newId = payload.trace_id ?? getStr(newRecord.event, "trace_id")
        let next: TraceRecord[]
        if (newId) {
          const idx = prev.findIndex((t) => getStr(t.event, "trace_id") === newId)
          if (idx >= 0) {
            if (!isRunning(prev[idx].event)) return prev
            next = prev.map((t, i) => (i === idx ? newRecord : t))
          } else {
            next = [...prev, newRecord]
          }
        } else {
          next = [...prev, newRecord]
        }
        return next
          .sort((a, b) => b.ingested_at.localeCompare(a.ingested_at))
          .slice(0, TRACES_PAGE_SIZE * 4)
      })
    },
    onReopen,
  })

  return { realtimeError }
}
