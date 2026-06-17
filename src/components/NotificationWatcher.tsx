import { useEffect, useRef } from "react"
import type { EventSourceMessage } from "@microsoft/fetch-event-source"

import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { addNotification } from "@/store/notifications/slice"
import { authFetch } from "@/lib/authFetch"
import { useRealtimeStream } from "@/lib/useRealtimeStream"

// ── Cooldown helpers (localStorage-backed so they survive page reloads) ────────

const COOLDOWN_5MIN   = 5  * 60 * 1000
const COOLDOWN_1HOUR  = 60 * 60 * 1000
const COOLDOWN_24HOUR = 24 * 60 * 60 * 1000
const CACHE_POLL_MS   = 15 * 60 * 1000
// Background notification checks wait this long after mount so their fetches
// don't contend with the dashboard's first-paint queries.
const NOTIFY_DEFER_MS = 4000

function lastNotifiedAt(key: string): number {
  return parseInt(localStorage.getItem(key) ?? "0", 10)
}

function stampNotified(key: string): void {
  localStorage.setItem(key, String(Date.now()))
}

function cooldownExpired(key: string, ms: number): boolean {
  return Date.now() - lastNotifiedAt(key) >= ms
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ── Response shapes (minimal, notification-specific) ──────────────────────────

interface TraceListResponse {
  traces: Array<{
    evaluations?: Array<{ metric: string; score: number | null }>
  }>
}

interface CacheStatsResponse {
  hit_rate: number
  calls: number
}

interface QuotaResponse {
  traces: { used: number; limit: number }
  evaluations: { used: number; limit: number }
}

// ── SSE payload shapes ────────────────────────────────────────────────────────

interface EnrichedPayload {
  enrichment?: string
  security?: Record<string, unknown>
}

interface TracePayload {
  trace_id?: string
  event?: Record<string, unknown>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationWatcher() {
  const dispatch = useAppDispatch()
  const { organization } = useAppSelector((s) => s.auth)
  const seenBlockedIds = useRef<Set<string>>(new Set())

  // ── 1. API key slot usage + quota limits (on mount) ───────────────────────
  useEffect(() => {
    if (!organization) return

    // API key slot limit (from auth state — no extra fetch needed)
    const { api_key_usage, api_key_limit } = organization
    if (
      api_key_limit > 0 &&
      api_key_usage / api_key_limit >= 0.9 &&
      cooldownExpired("fluiq.notify.apikeys", COOLDOWN_24HOUR)
    ) {
      stampNotified("fluiq.notify.apikeys")
      dispatch(
        addNotification({
          id: uid(),
          kind: "api",
          title: "API key limit almost reached",
          body: `${api_key_usage} of ${api_key_limit} API key slots used`,
          href: "/dashboard/api-management",
          timestamp: new Date().toISOString(),
          read: false,
        }),
      )
    }

    // Trace / eval quota limits (one-shot fetch)
    if (!cooldownExpired("fluiq.notify.quota", COOLDOWN_24HOUR)) return
    authFetch<QuotaResponse>("/api/v1/quota")
      .then((q) => {
        const now = new Date().toISOString()
        if (q.traces.limit > 0 && q.traces.used / q.traces.limit >= 0.9) {
          stampNotified("fluiq.notify.quota")
          dispatch(
            addNotification({
              id: uid(),
              kind: "api",
              title: "Approaching trace limit",
              body: `${q.traces.used.toLocaleString()} of ${q.traces.limit.toLocaleString()} traces used this period`,
              href: "/dashboard/overview",
              timestamp: now,
              read: false,
            }),
          )
        } else if (
          q.evaluations.limit > 0 &&
          q.evaluations.used / q.evaluations.limit >= 0.9
        ) {
          stampNotified("fluiq.notify.quota")
          dispatch(
            addNotification({
              id: uid(),
              kind: "evals",
              title: "Approaching eval limit",
              body: `${q.evaluations.used.toLocaleString()} of ${q.evaluations.limit.toLocaleString()} evaluations used this period`,
              href: "/dashboard/overview",
              timestamp: now,
              read: false,
            }),
          )
        }
      })
      .catch(() => {})
  }, [organization, dispatch])

  // ── 2. Eval score regression (on mount, 1-hour cooldown) ─────────────────
  useEffect(() => {
    if (!cooldownExpired("fluiq.notify.evals", COOLDOWN_1HOUR)) return

    // This is a background check, not first-paint data — defer it so its
    // (heavy, fully-joined) trace fetch doesn't compete with the dashboard's
    // initial render, and cap the sample at 100 recent traces (regression
    // needs only ≥3 scores per metric).
    const timer = setTimeout(() => {
    authFetch<TraceListResponse>("/api/v1/traces?limit=100")
      .then((data) => {
        const totals: Record<string, { sum: number; count: number }> = {}
        for (const trace of data.traces) {
          for (const ev of trace.evaluations ?? []) {
            if (typeof ev.score !== "number") continue
            totals[ev.metric] ??= { sum: 0, count: 0 }
            totals[ev.metric].sum += ev.score
            totals[ev.metric].count += 1
          }
        }
        const bad = Object.entries(totals)
          .filter(([, v]) => v.count >= 3 && v.sum / v.count < 0.7)
          .map(([metric]) => metric)

        if (bad.length > 0) {
          stampNotified("fluiq.notify.evals")
          dispatch(
            addNotification({
              id: uid(),
              kind: "evals",
              title: "Eval score regression",
              body: `${bad.join(", ")} avg score below 0.7`,
              href: "/dashboard/tests",
              timestamp: new Date().toISOString(),
              read: false,
            }),
          )
        }
      })
      .catch(() => {})
    }, NOTIFY_DEFER_MS)
    return () => clearTimeout(timer)
  }, [dispatch])

  // ── 3. Cache hit rate (on mount + poll every 15 min, 1-hour notification cooldown) ──
  useEffect(() => {
    function checkCache() {
      if (!cooldownExpired("fluiq.notify.cache", COOLDOWN_1HOUR)) return
      authFetch<CacheStatsResponse>("/api/v1/optimize/cache-stats?window_hours=1")
        .then((data) => {
          // Only alert when there's meaningful traffic (≥10 calls) and hit rate is poor
          if (data.calls < 10 || data.hit_rate >= 0.5) return
          stampNotified("fluiq.notify.cache")
          const pct = Math.round(data.hit_rate * 100)
          dispatch(
            addNotification({
              id: uid(),
              kind: "optimization",
              title: "Cache hit rate dropped",
              body: `Hit rate at ${pct}% over the last hour`,
              href: "/dashboard/optimize",
              timestamp: new Date().toISOString(),
              read: false,
            }),
          )
        })
        .catch(() => {})
    }

    // Defer the first check past first paint; keep the steady-state poll.
    const initial = setTimeout(checkCache, NOTIFY_DEFER_MS)
    const timer = setInterval(checkCache, CACHE_POLL_MS)
    return () => { clearTimeout(initial); clearInterval(timer) }
  }, [dispatch])

  // ── 4. Security: real-time SSE (no cooldown for blocked; 5-min for enriched) ─
  useRealtimeStream({
    path: "/api/v1/traces/stream",
    events: ["trace", "trace.enriched"],
    onEvent: (data: unknown, msg: EventSourceMessage) => {
      if (!data || typeof data !== "object") return

      if (msg.event === "trace.enriched") {
        const payload = data as EnrichedPayload
        if (payload.enrichment !== "security" || !payload.security) return

        const sec = payload.security
        const level = sec["security_risk_level"] as string | undefined
        if (level !== "medium" && level !== "high") return
        if (!cooldownExpired("fluiq.notify.security.enriched", COOLDOWN_5MIN)) return
        stampNotified("fluiq.notify.security.enriched")

        const flags: string[] = []
        if (sec["injection_detected"]) flags.push("Injection")
        if (sec["jailbreak_detected"]) flags.push("Jailbreak")
        if (sec["skeleton_key_detected"]) flags.push("Skeleton Key")
        if (sec["secrets_detected"]) flags.push("Secrets")
        if (
          Array.isArray(sec["pii_entities_prompt"]) &&
          (sec["pii_entities_prompt"] as unknown[]).length > 0
        )
          flags.push("PII")

        dispatch(
          addNotification({
            id: uid(),
            kind: "security",
            title: flags.length > 0 ? `${flags.join(" & ")} detected` : "Security risk flagged",
            body: `Risk level: ${level}`,
            href: "/dashboard/security",
            timestamp: new Date().toISOString(),
            read: false,
          }),
        )
        return
      }

      if (msg.event === "trace") {
        const payload = data as TracePayload
        if (payload.event?.["status"] !== "blocked") return

        const traceId =
          payload.trace_id ??
          (typeof payload.event?.["trace_id"] === "string" ? payload.event["trace_id"] : "")
        if (traceId && seenBlockedIds.current.has(traceId)) return
        if (traceId) seenBlockedIds.current.add(traceId)

        dispatch(
          addNotification({
            id: uid(),
            kind: "security",
            title: "Request blocked",
            body: "A request was blocked by the security filter",
            href: "/dashboard/security",
            timestamp: new Date().toISOString(),
            read: false,
          }),
        )
      }
    },
  })

  return null
}
