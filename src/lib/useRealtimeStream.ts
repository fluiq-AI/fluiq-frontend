import { useEffect, useRef, useState } from "react"
import type { EventSourceMessage } from "@microsoft/fetch-event-source"

import { FatalSseError, authStream } from "./sse"

export interface RealtimeError {
  status: number
  detail: string
}

export interface UseRealtimeStreamOptions {
  /**
   * Path on the API host (e.g. `/api/v1/traces/stream`). Pass `null` to
   * keep the hook mounted but the connection closed (useful when an
   * upstream gate hasn't resolved yet).
   */
  path: string | null
  /**
   * SSE event names to handle. Anything outside this set is ignored.
   * Defaults to `["trace"]` to match `authStream`.
   */
  events?: readonly string[]
  /**
   * Called for each named event. The callback is captured into a ref so
   * the stream is not torn down when the caller passes an inline closure;
   * the closure always sees the latest captured state at call time.
   */
  onEvent: (data: unknown, msg: EventSourceMessage) => void
}

export interface UseRealtimeStreamResult {
  error: RealtimeError | null
  /** Manually dismiss the banner; the next successful handshake clears it too. */
  clearError: () => void
}

/**
 * React hook around `authStream` that:
 *
 * - Opens the stream on mount, tears it down on unmount or path change.
 * - Captures `FatalSseError` (post-refresh 401, 402, 403, 404, 5xx) into
 *   state so the page can render a `RealtimeStatusBanner`.
 * - Clears the error on the next successful (re-)handshake.
 *
 * Transient network errors are absorbed by `fetch-event-source`'s built-in
 * backoff and never surface here.
 */
export function useRealtimeStream({
  path,
  events,
  onEvent,
}: UseRealtimeStreamOptions): UseRealtimeStreamResult {
  const [error, setError] = useState<RealtimeError | null>(null)

  // Hold the callback in a ref so changing it across renders does not
  // re-subscribe. The stream is keyed solely by `path` + `events`.
  const onEventRef = useRef(onEvent)
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  // Serialize `events` for a stable dep; an inline `["a", "b"]` would
  // otherwise re-allocate every render and re-open the stream.
  const eventsKey = events ? events.join("\u0000") : ""

  useEffect(() => {
    if (path === null) return
    const eventList = eventsKey ? eventsKey.split("\u0000") : undefined
    const controller = authStream(path, {
      events: eventList,
      onOpen: () => setError(null),
      onError: (err) => {
        if (err instanceof FatalSseError) {
          setError({ status: err.status, detail: err.detail })
        }
      },
      onEvent: (data, msg) => onEventRef.current(data, msg),
    })
    return () => controller.abort()
  }, [path, eventsKey])

  return {
    error,
    clearError: () => setError(null),
  }
}
