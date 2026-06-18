"use client"

import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router"
import DOMPurify from "dompurify"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons"

import { SiteNavbar } from "@/components/SiteNavbar"
import { SiteFooter } from "@/components/SiteFooter"
import { fetchPost, mediaUrl, type BlogPostFull } from "@/lib/blog"
import { signalPrerenderReady } from "@/lib/prerender"
import "@/styles/blog.css"

const SITE = "https://getfluiq.com"

function formatDate(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<BlogPostFull | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading")

  useEffect(() => {
    if (!slug) return
    let active = true
    setStatus("loading")
    fetchPost(slug)
      .then((p) => { if (active) { setPost(p); setStatus("ready") } })
      .catch(() => { if (active) setStatus("notfound") })
      .finally(() => signalPrerenderReady())
    return () => { active = false }
  }, [slug])

  const cleanHtml = useMemo(
    () => (post ? DOMPurify.sanitize(post.body_html) : ""),
    [post],
  )

  const canonical = `${SITE}/blog/${slug}`
  const cover = post?.cover_image_url ? mediaUrl(post.cover_image_url) : null

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">
      <SiteNavbar />

      {status === "notfound" ? (
        <div className="mx-auto max-w-3xl px-6 py-32 text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Post not found</h1>
          <p className="mt-3 text-[#6B6B66] dark:text-[#9A9A92]">
            This post may have been moved or unpublished.
          </p>
          <Link to="/blog" className="mt-6 inline-block text-[#1860D3] dark:text-[#6FA8FF] hover:underline">
            ← Back to the blog
          </Link>
        </div>
      ) : status === "loading" ? (
        <div className="mx-auto max-w-3xl px-6 py-32 text-center text-[#6B6B66] dark:text-[#9A9A92]">
          Loading…
        </div>
      ) : post ? (
        <>
<article className="mx-auto max-w-3xl px-6 py-14 md:py-20">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-[#6B6B66] dark:text-[#9A9A92] hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors"
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} size={15} /> All posts
            </Link>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-[#9A9A92]">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] px-2.5 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
              {post.title}
            </h1>

            <div className="mt-5 flex items-center gap-2 text-sm text-[#6B6B66] dark:text-[#9A9A92]">
              <span className="font-medium text-[#0a0a0a] dark:text-[#FAF9F6]">{post.author}</span>
              <span aria-hidden>·</span>
              <span>{formatDate(post.published_at)}</span>
              <span aria-hidden>·</span>
              <span>{post.reading_minutes} min read</span>
            </div>

            {cover && (
              <img
                src={cover}
                alt={post.title}
                className="mt-8 w-full rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] object-cover"
              />
            )}

            <div
              className="blog-content mt-10"
              dangerouslySetInnerHTML={{ __html: cleanHtml }}
            />
          </article>
        </>
      ) : null}

      <SiteFooter />
    </div>
  )
}
