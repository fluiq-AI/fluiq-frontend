import type { Metadata } from "next"
import { JsonLd } from "@/components/JsonLd"
import { breadcrumbLd } from "@/lib/seo-pages"
import { fetchPost, mediaUrl, type BlogPostFull } from "@/lib/blog"
import Component from "@/pages/Blog/BlogPost"

const SITE = "https://getfluiq.com"

async function getPost(slug: string): Promise<BlogPostFull | null> {
  try {
    return await fetchPost(slug)
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  const canonical = `/blog/${slug}`
  if (!post) return { alternates: { canonical } }
  const cover = post.cover_image_url ? mediaUrl(post.cover_image_url) : undefined
  const title = post.seo_title || `${post.title} | Fluiq Blog`
  const description = post.seo_description || post.excerpt
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: post.seo_title || post.title,
      description,
      url: canonical,
      images: cover ? [cover] : undefined,
    },
    twitter: { card: cover ? "summary_large_image" : "summary" },
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPost(slug)
  const canonical = `${SITE}/blog/${slug}`
  const cover = post?.cover_image_url ? mediaUrl(post.cover_image_url) : undefined
  return (
    <>
      {post && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.seo_description || post.excerpt,
            image: cover || undefined,
            author: { "@type": "Organization", name: post.author },
            publisher: { "@type": "Organization", name: "Fluiq" },
            datePublished: post.published_at || undefined,
            dateModified: post.updated_at || post.published_at || undefined,
            mainEntityOfPage: canonical,
          }}
        />
      )}
      {post && (
        <JsonLd
          data={breadcrumbLd([
            ["Home", "/"],
            ["Blog", "/blog"],
            [post.title, `/blog/${slug}`],
          ])}
        />
      )}
      <Component />
    </>
  )
}
