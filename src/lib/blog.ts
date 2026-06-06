import { API_BASE_URL, ApiError, apiRequest } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { store } from "@/store"

export interface BlogPostSummary {
  post_id: string
  slug: string
  title: string
  excerpt: string
  cover_image_url: string | null
  author: string
  tags: string[]
  status?: "draft" | "published"
  reading_minutes: number
  published_at: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface BlogPostFull extends BlogPostSummary {
  body_html: string
  seo_title: string | null
  seo_description: string | null
}

export interface PostListResponse {
  posts: BlogPostSummary[]
  total: number
}

export interface AdminPostListResponse extends PostListResponse {
  page: number
  limit: number
}

export interface PostInput {
  slug: string
  title: string
  excerpt: string
  body_html: string
  cover_image_url: string | null
  author: string
  tags: string[]
  status: "draft" | "published"
  seo_title: string | null
  seo_description: string | null
}

/** Resolve a stored media path (relative or absolute) to a loadable URL. */
export function mediaUrl(path: string): string {
  if (!path) return path
  return /^https?:\/\//.test(path) ? path : `${API_BASE_URL}${path}`
}

// ── Public ──────────────────────────────────────────────────────────────────

export function fetchPosts(params: { limit?: number; offset?: number; tag?: string } = {}) {
  const qs = new URLSearchParams()
  if (params.limit != null) qs.set("limit", String(params.limit))
  if (params.offset != null) qs.set("offset", String(params.offset))
  if (params.tag) qs.set("tag", params.tag)
  return apiRequest<PostListResponse>(`/api/v1/blog/posts?${qs}`)
}

export function fetchPost(slug: string) {
  return apiRequest<BlogPostFull>(`/api/v1/blog/posts/${slug}`)
}

// ── Admin ───────────────────────────────────────────────────────────────────

export function adminListPosts(params: { page?: number; search?: string; status?: string } = {}) {
  const qs = new URLSearchParams()
  qs.set("page", String(params.page ?? 1))
  if (params.search) qs.set("search", params.search)
  if (params.status) qs.set("status", params.status)
  return authFetch<AdminPostListResponse>(`/api/v1/blog/admin/posts?${qs}`)
}

export function adminGetPost(postId: string) {
  return authFetch<BlogPostFull>(`/api/v1/blog/admin/posts/${postId}`)
}

export function adminCreatePost(body: PostInput) {
  return authFetch<BlogPostFull>(`/api/v1/blog/admin/posts`, { method: "POST", body })
}

export function adminUpdatePost(postId: string, body: Partial<PostInput>) {
  return authFetch<BlogPostFull>(`/api/v1/blog/admin/posts/${postId}`, { method: "PATCH", body })
}

export function adminDeletePost(postId: string) {
  return authFetch<void>(`/api/v1/blog/admin/posts/${postId}`, { method: "DELETE" })
}

export function adminPublishPost(postId: string, publish: boolean) {
  return authFetch<BlogPostFull>(`/api/v1/blog/admin/posts/${postId}/publish`, {
    method: "POST",
    body: { publish },
  })
}

/** Multipart upload (apiRequest only handles JSON, so this posts FormData directly). */
export async function adminUploadMedia(file: File): Promise<{ media_id: string; url: string }> {
  const token = store.getState().auth.accessToken
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${API_BASE_URL}/api/v1/blog/admin/media`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    throw new ApiError(res.status, data?.detail ?? "Upload failed")
  }
  return data
}
