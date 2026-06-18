import { useEffect, useState } from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon, PlusSignIcon, Edit02Icon, Delete02Icon, EyeIcon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/lib/api"
import {
  adminListPosts, adminDeletePost, adminPublishPost,
  type AdminPostListResponse, type BlogPostSummary,
} from "@/lib/blog"

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

export default function AdminBlog() {
  const [data, setData] = useState<AdminPostListResponse | null>(null)
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load(s = search) {
    setError(null)
    try {
      setData(await adminListPosts({ search: s }))
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load posts")
    }
  }

  useEffect(() => { load(search) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search])

  async function togglePublish(post: BlogPostSummary) {
    setBusyId(post.post_id)
    try {
      await adminPublishPost(post.post_id, post.status !== "published")
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update post")
    } finally {
      setBusyId(null)
    }
  }

  async function remove(post: BlogPostSummary) {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return
    setBusyId(post.post_id)
    try {
      await adminDeletePost(post.post_id)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to delete post")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">Blog</h1>
          <p className="mt-2 text-muted-foreground">
            {data ? `${data.total.toLocaleString()} posts` : "Loading…"}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/admin/blog/new">
            <HugeiconsIcon icon={PlusSignIcon} size={14} /> New post
          </Link>
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by title or slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-64"
        />
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Author</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Published</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {!data ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : data.posts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No posts yet.</td></tr>
            ) : (
              data.posts.map((post) => (
                <tr key={post.post_id} className="bg-background hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/admin/blog/${post.post_id}`} className="font-medium hover:underline">
                      {post.title}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">/blog/{post.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={post.status === "published" ? "default" : "outline"}>
                      {post.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{post.author}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(post.published_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {post.status === "published" && (
                        <Button variant="ghost" size="sm" asChild title="View">
                          <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">
                            <HugeiconsIcon icon={EyeIcon} size={15} />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild title="Edit">
                        <Link to={`/admin/blog/${post.post_id}`}>
                          <HugeiconsIcon icon={Edit02Icon} size={15} />
                        </Link>
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        disabled={busyId === post.post_id}
                        onClick={() => togglePublish(post)}
                      >
                        {busyId === post.post_id
                          ? <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
                          : post.status === "published" ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        variant="ghost" size="sm" title="Delete"
                        disabled={busyId === post.post_id}
                        onClick={() => remove(post)}
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={15} className="text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
