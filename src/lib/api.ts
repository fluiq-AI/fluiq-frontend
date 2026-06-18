const RAW_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ?? "http://localhost:8000"
export const API_BASE_URL = RAW_BASE.replace(/\/$/, "")

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  body?: unknown
  token?: string | null
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, signal } = options
  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (token) headers["Authorization"] = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (err) {
    throw new ApiError(0, err instanceof Error ? err.message : "Network error")
  }

  const text = await response.text()
  const data = text ? safeParse(text) : null

  if (!response.ok) {
    const detail = extractDetail(data) ?? response.statusText ?? "Request failed"
    throw new ApiError(response.status, detail)
  }

  return data as T
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function extractDetail(data: unknown): string | null {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail
    if (typeof detail === "string") return detail
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0]
      if (first && typeof first === "object" && "msg" in first) {
        const msg = (first as { msg: unknown }).msg
        if (typeof msg === "string") return msg
      }
    }
  }
  return null
}
