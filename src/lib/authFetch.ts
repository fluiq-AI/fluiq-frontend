import { ApiError, apiRequest } from "@/lib/api"
import { logoutThunk, refreshThunk } from "@/store/auth/slice"
import { store } from "@/store"

interface AuthRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  body?: unknown
  signal?: AbortSignal
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

export async function authFetch<T>(path: string, options: AuthRequestOptions = {}): Promise<T> {
  const token = store.getState().auth.accessToken
  try {
    return await apiRequest<T>(path, { ...options, token })
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err

    const refreshed = await attemptRefresh()
    if (!refreshed) {
      await store.dispatch(logoutThunk())
      throw err
    }

    const retryToken = store.getState().auth.accessToken
    return await apiRequest<T>(path, { ...options, token: retryToken })
  }
}
