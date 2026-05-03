import {
  EventStreamContentType,
  fetchEventSource,
  type EventSourceMessage,
} from "@microsoft/fetch-event-source"

import { API_BASE_URL } from "@/lib/api"
import { logoutThunk, refreshThunk } from "@/store/auth/slice"
import { store } from "@/store"

interface AuthSseOptions {
  /** Called for each named SSE event (default: "trace"). */
  onEvent: (data: unknown, event: EventSourceMessage) => void
  /** Called when the stream is established and the server confirms readiness. */
  onOpen?: () => void
  /** Called for unrecoverable errors (post-refresh, after retries). */
  onError?: (err: unknown) => void
  /** SSE event names to handle. Anything not in this set is ignored. */
  events?: string[]
}

/**
 * Thrown for unrecoverable SSE handshake failures (post-refresh 401, 402,
 * 403, 404, 5xx). Carries the HTTP status and the server's `detail` so the
 * caller can render a status-specific banner (e.g. 402 quota exceeded).
 */
export class FatalSseError extends Error {
  status: number
  detail: string
  constructor(status: number, detail: string) {
    super(detail || `SSE handshake failed: ${status}`)
    this.name = "FatalSseError"
    this.status = status
    this.detail = detail
  }
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text()
    if (!text) return response.statusText || `HTTP ${response.status}`
    try {
      const json = JSON.parse(text) as { detail?: unknown }
      if (typeof json.detail === "string" && json.detail.length > 0) {
        return json.detail
      }
    } catch {
      // body wasn't JSON; fall through to raw text
    }
    return text
  } catch {
    return response.statusText || `HTTP ${response.status}`
  }
}

let refreshInFlight: Promise<boolean> | null = null

async function attemptRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    const result = await store.dispatch(refreshThunk())
    return refreshThunk.fulfilled.match(result)
  })()
  try {
    return await refreshInFlight
  } finally {
    refreshInFlight = null
  }
}

/**
 * Open an authenticated Server-Sent Events stream against the API.
 *
 * Mirrors the auth/refresh semantics of `authFetch`: a 401 triggers a
 * single in-flight refresh attempt and the stream is reopened with the
 * new access token. Two consecutive 401s log the user out and surface
 * the error via `onError`.
 *
 * Returns an AbortController; call `abort()` to close the stream.
 */
export function authStream(path: string, options: AuthSseOptions): AbortController {
  const controller = new AbortController()
  const events = new Set(options.events ?? ["trace"])
  let retriedAfterRefresh = false

  const open = async () => {
    const token = store.getState().auth.accessToken
    try {
      await fetchEventSource(`${API_BASE_URL}${path}`, {
        signal: controller.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        // Keep the connection alive when the tab is hidden; the caller
        // controls visibility-based pausing if it wants to.
        openWhenHidden: true,
        async onopen(response) {
          if (response.ok && response.headers.get("content-type")?.includes(EventStreamContentType)) {
            retriedAfterRefresh = false
            options.onOpen?.()
            return
          }
          if (response.status === 401 && !retriedAfterRefresh) {
            retriedAfterRefresh = true
            const refreshed = await attemptRefresh()
            if (!refreshed) {
              await store.dispatch(logoutThunk())
              throw new FatalSseError(401, "Unauthorized")
            }
            // throw to abort *this* attempt; the outer loop reopens with
            // the refreshed token.
            throw new Error("retry-with-refreshed-token")
          }
          const detail = await readErrorDetail(response)
          throw new FatalSseError(response.status, detail)
        },
        onmessage(msg) {
          if (msg.event === "ping" || msg.event === "ready") return
          if (!events.has(msg.event || "message")) return
          let parsed: unknown = msg.data
          if (typeof msg.data === "string" && msg.data.length > 0) {
            try {
              parsed = JSON.parse(msg.data)
            } catch {
              // fall through with raw string
            }
          }
          options.onEvent(parsed, msg)
        },
        onerror(err) {
          if (err instanceof FatalSseError || controller.signal.aborted) {
            // Stop retrying; surface to caller.
            throw err
          }
          // Transient — let fetch-event-source back off and retry.
          return
        },
        onclose() {
          // Server closed the connection; let fetch-event-source retry.
        },
      })
    } catch (err) {
      if (controller.signal.aborted) return
      if (err instanceof Error && err.message === "retry-with-refreshed-token") {
        await open()
        return
      }
      options.onError?.(err)
    }
  }

  void open()
  return controller
}
