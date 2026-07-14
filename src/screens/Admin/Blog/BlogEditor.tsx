import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft02Icon, Loading03Icon, ImageUploadIcon, Delete02Icon, File01Icon } from "@hugeicons/core-free-icons"
import { marked } from "marked"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { ApiError } from "@/lib/api"
import {
  adminCreatePost, adminGetPost, adminUpdatePost, adminUploadMedia, mediaUrl,
  type PostInput,
} from "@/lib/blog"
import { RichTextEditor } from "./RichTextEditor"

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 127)
}

const EMPTY: PostInput = {
  slug: "", title: "", excerpt: "", body_html: "", cover_image_url: null,
  author: "Fluiq", tags: [], status: "draft", seo_title: null, seo_description: null,
}

export default function BlogEditor() {
  const { postId } = useParams<{ postId: string }>()
  const isEdit = Boolean(postId)
  const navigate = useNavigate()

  const [form, setForm] = useState<PostInput>(EMPTY)
  const [tagsText, setTagsText] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState<null | "draft" | "publish">(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingMarkdown, setPendingMarkdown] = useState<string | null>(null)
  const [coverUploading, setCoverUploading] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const mdInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!postId) return
    adminGetPost(postId)
      .then((p) => {
        setForm({
          slug: p.slug, title: p.title, excerpt: p.excerpt, body_html: p.body_html,
          cover_image_url: p.cover_image_url, author: p.author, tags: p.tags,
          status: p.status ?? "draft", seo_title: p.seo_title, seo_description: p.seo_description,
        })
        setTagsText(p.tags.join(", "))
        setSlugTouched(true)
      })
      .catch((err) => setError(err instanceof ApiError ? err.detail : "Failed to load post"))
      .finally(() => setLoading(false))
  }, [postId])

  function patch(updates: Partial<PostInput>) {
    setForm((f) => ({ ...f, ...updates }))
  }

  function onTitleChange(title: string) {
    patch({ title, ...(slugTouched ? {} : { slug: slugify(title) }) })
  }

  async function onCoverFile(file: File) {
    setCoverUploading(true)
    setError(null)
    try {
      const { url } = await adminUploadMedia(file)
      patch({ cover_image_url: url })
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Cover upload failed")
    } finally {
      setCoverUploading(false)
    }
  }

  async function onMarkdownFile(file: File) {
    setError(null)
    let html: string
    try {
      const text = await file.text()
      html = (await marked.parse(text)).trim()
    } catch {
      setError("Couldn't read that Markdown file.")
      return
    }
    // Ask before clobbering existing content; otherwise apply straight away.
    if (form.body_html.trim()) {
      setPendingMarkdown(html)
    } else {
      patch({ body_html: html })
      toast.success("Markdown imported")
    }
  }

  function confirmReplaceBody() {
    if (pendingMarkdown != null) {
      patch({ body_html: pendingMarkdown })
      toast.success("Body replaced with imported Markdown")
    }
    setPendingMarkdown(null)
  }

  async function save(intent: "draft" | "publish") {
    setError(null)
    if (!form.title.trim()) { setError("Title is required."); return }
    if (!form.slug.trim()) { setError("Slug is required."); return }

    const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean)
    const payload: PostInput = {
      ...form,
      tags,
      status: intent === "publish" ? "published" : "draft",
      seo_title: form.seo_title?.trim() || null,
      seo_description: form.seo_description?.trim() || null,
    }

    setSaving(intent)
    try {
      if (isEdit && postId) {
        await adminUpdatePost(postId, payload)
      } else {
        await adminCreatePost(payload)
      }
      navigate("/admin/blog")
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save post")
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-muted-foreground">
        <HugeiconsIcon icon={Loading03Icon} className="animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          to="/admin/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} size={15} /> All posts
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={saving !== null} onClick={() => save("draft")}>
            {saving === "draft" && <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />}
            Save draft
          </Button>
          <Button size="sm" disabled={saving !== null} onClick={() => save("publish")}>
            {saving === "publish" && <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />}
            {form.status === "published" ? "Update & republish" : "Publish"}
          </Button>
        </div>
      </div>

      <h1 className="mb-1 font-heading text-3xl font-semibold tracking-tight">
        {isEdit ? "Edit post" : "New post"}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Publishing or editing a live post triggers a site rebuild so the post is prerendered for SEO.
      </p>

      {error && (
        <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div className="space-y-5">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="A clear, compelling title"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={form.excerpt}
              onChange={(e) => patch({ excerpt: e.target.value })}
              placeholder="One or two sentences shown on the blog index and in previews."
              rows={2}
              className="mt-1.5"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <Label>Body</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => mdInputRef.current?.click()}
                title="Replace the body with the contents of a Markdown (.md) file"
              >
                <HugeiconsIcon icon={File01Icon} size={14} /> Import .md
              </Button>
              <input
                ref={mdInputRef}
                type="file"
                accept=".md,.markdown,text/markdown"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onMarkdownFile(f); e.target.value = "" }}
              />
            </div>
            <div className="mt-1.5">
              <RichTextEditor
                value={form.body_html}
                onChange={(html) => patch({ body_html: html })}
                onUploadError={setError}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => { setSlugTouched(true); patch({ slug: slugify(e.target.value) }) }}
              placeholder="my-post"
              className="mt-1.5 font-mono text-xs"
            />
            <p className="mt-1 text-xs text-muted-foreground">/blog/{form.slug || "…"}</p>
          </div>

          <div>
            <Label>Cover image</Label>
            <div className="mt-1.5 overflow-hidden rounded-lg border border-border/60 bg-muted/30">
              {form.cover_image_url ? (
                <img src={mediaUrl(form.cover_image_url)} alt="Cover" className="aspect-[16/10] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center text-xs text-muted-foreground">
                  No cover image
                </div>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline" size="sm" disabled={coverUploading}
                onClick={() => coverInputRef.current?.click()}
              >
                <HugeiconsIcon icon={coverUploading ? Loading03Icon : ImageUploadIcon} size={14} className={coverUploading ? "animate-spin" : ""} />
                Upload
              </Button>
              {form.cover_image_url && (
                <Button variant="ghost" size="sm" onClick={() => patch({ cover_image_url: null })}>
                  <HugeiconsIcon icon={Delete02Icon} size={14} /> Remove
                </Button>
              )}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onCoverFile(f); e.target.value = "" }}
            />
          </div>

          <div>
            <Label htmlFor="author">Author</Label>
            <Input id="author" value={form.author} onChange={(e) => patch({ author: e.target.value })} className="mt-1.5" />
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="evals, security, guides"
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">Comma-separated.</p>
          </div>

          <div className="border-t border-border/60 pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">SEO</p>
            <Label htmlFor="seo_title">Meta title</Label>
            <Input
              id="seo_title"
              value={form.seo_title ?? ""}
              onChange={(e) => patch({ seo_title: e.target.value })}
              placeholder="Defaults to the post title"
              className="mt-1.5"
            />
            <Label htmlFor="seo_description" className="mt-3 block">Meta description</Label>
            <Textarea
              id="seo_description"
              value={form.seo_description ?? ""}
              onChange={(e) => patch({ seo_description: e.target.value })}
              placeholder="Defaults to the excerpt"
              rows={3}
              className="mt-1.5"
            />
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={pendingMarkdown != null}
        onOpenChange={(v) => { if (!v) setPendingMarkdown(null) }}
        title="Replace body?"
        description="This will overwrite the current post body with the imported Markdown. Your existing content will be lost."
        confirmLabel="Replace body"
        onConfirm={confirmReplaceBody}
      />
    </>
  )
}
