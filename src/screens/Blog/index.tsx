"use client"

import { useEffect, useState } from "react"
import { Link } from "react-router"
import { SiteNavbar } from "@/components/SiteNavbar"
import { SiteFooter } from "@/components/SiteFooter"
import { fetchPosts, mediaUrl, type BlogPostSummary } from "@/lib/blog"
import { signalPrerenderReady } from "@/lib/prerender"

function formatDate(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

export default function BlogIndex() {
  const [posts, setPosts] = useState<BlogPostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetchPosts({ limit: 50 })
      .then((res) => { if (active) setPosts(res.posts) })
      .catch(() => { if (active) setError(true) })
      .finally(() => {
        if (active) setLoading(false)
        signalPrerenderReady()
      })
    return () => { active = false }
  }, [])

  const [featured, ...rest] = posts

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">
<SiteNavbar />

      <header className="border-b border-[#D4CFC1] dark:border-[#1A1A1A]">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-[#1860D3] dark:text-[#6FA8FF]">
            The Fluiq Blog
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight md:text-5xl">
            Building reliable AI, in the open
          </h1>
          <p className="mt-4 max-w-2xl text-[#6B6B66] dark:text-[#9A9A92]">
            Engineering notes, deep dives, and product updates on observability, evaluation,
            security, and optimization for LLM applications.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14">
        {loading ? (
          <p className="text-[#6B6B66] dark:text-[#9A9A92]">Loading posts…</p>
        ) : error ? (
          <p className="text-[#6B6B66] dark:text-[#9A9A92]">Couldn’t load posts right now. Please try again later.</p>
        ) : posts.length === 0 ? (
          <p className="text-[#6B6B66] dark:text-[#9A9A92]">No posts yet — check back soon.</p>
        ) : (
          <>
            {featured && (
              <Link
                to={`/blog/${featured.slug}`}
                className="group mb-14 grid gap-6 md:grid-cols-2 md:items-center"
              >
                <div className="rounded-[1.85rem] bg-black/[0.04] p-2 ring-1 ring-black/[0.06] shadow-[0_36px_80px_-34px_rgba(24,96,211,0.22)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:shadow-[0_44px_90px_-32px_rgba(24,96,211,0.3)] dark:bg-white/[0.04] dark:ring-white/10">
                  <div className="overflow-hidden rounded-[1.35rem] border border-[#E5E1D6] bg-[#F2F0E9] aspect-[16/10] shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] dark:border-white/[0.06] dark:bg-[#111111] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                    {featured.cover_image_url && (
                      <img
                        src={mediaUrl(featured.cover_image_url)}
                        alt={featured.title}
                        className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <PostMeta post={featured} />
                  <h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight md:text-3xl group-hover:text-[#1860D3] dark:group-hover:text-[#6FA8FF] transition-colors">
                    {featured.title}
                  </h2>
                  <p className="mt-3 text-[#6B6B66] dark:text-[#9A9A92]">{featured.excerpt}</p>
                </div>
              </Link>
            )}

            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <Link key={post.post_id} to={`/blog/${post.slug}`} className="group">
                  <div className="overflow-hidden rounded-xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9] dark:bg-[#111111] aspect-[16/10]">
                    {post.cover_image_url && (
                      <img
                        src={mediaUrl(post.cover_image_url)}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    )}
                  </div>
                  <div className="mt-4">
                    <PostMeta post={post} />
                    <h3 className="mt-2 font-heading text-lg font-semibold tracking-tight group-hover:text-[#1860D3] dark:group-hover:text-[#6FA8FF] transition-colors">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-[#6B6B66] dark:text-[#9A9A92]">{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}

function PostMeta({ post }: { post: BlogPostSummary }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[#9A9A92]">
      <span>{post.author}</span>
      {post.published_at && <span aria-hidden>·</span>}
      {post.published_at && <span>{formatDate(post.published_at)}</span>}
      <span aria-hidden>·</span>
      <span>{post.reading_minutes} min read</span>
    </div>
  )
}
