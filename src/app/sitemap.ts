import type { MetadataRoute } from "next"

// API_BASE_URL is commented out along with the blog-slug fetch below.
// import { API_BASE_URL } from "@/lib/api"
import { INTEGRATIONS } from "@/pages/Integrations/data"

import { CANONICAL_HOST, CANONICAL_ORIGIN, siblingOrigin } from "@/lib/site-url"

// The sitemap reads the request host, so the route itself renders per request
// (a route-segment `revalidate` would be ignored). This caches only the blog
// slug fetch, so a new post shows up within the hour without hammering the API.
// const BLOG_SLUGS_TTL = 3600

type ChangeFreq = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>
type Entry = { path: string; changeFrequency: ChangeFreq; priority: number }

const STATIC_ROUTES: Entry[] = [
  // Marketing
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  // { path: "/pricing", changeFrequency: "monthly", priority: 0.9 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  // { path: "/contact", changeFrequency: "monthly", priority: 0.7 },

  // Free tools (linkable assets)
  { path: "/response-gate-demo", changeFrequency: "monthly", priority: 0.9 },
  { path: "/llm-cost-calculator", changeFrequency: "monthly", priority: 0.8 },
  { path: "/infrager", changeFrequency: "monthly", priority: 0.8 },

  // Platform pillars
  { path: "/observability", changeFrequency: "monthly", priority: 0.8 },
  { path: "/security", changeFrequency: "monthly", priority: 0.8 },
  { path: "/evaluation", changeFrequency: "monthly", priority: 0.8 },
  { path: "/datasets", changeFrequency: "monthly", priority: 0.8 },
  { path: "/prompts", changeFrequency: "monthly", priority: 0.8 },
  { path: "/alerts", changeFrequency: "monthly", priority: 0.8 },

  // Documentation
  { path: "/documentation/quickstart", changeFrequency: "weekly", priority: 0.9 },
  { path: "/documentation/observability", changeFrequency: "weekly", priority: 0.8 },
  { path: "/documentation/security", changeFrequency: "weekly", priority: 0.8 },
  { path: "/documentation/evaluation", changeFrequency: "weekly", priority: 0.8 },
  { path: "/documentation/datasets", changeFrequency: "weekly", priority: 0.8 },
  { path: "/documentation/prompts", changeFrequency: "weekly", priority: 0.8 },
  { path: "/documentation/configuration", changeFrequency: "monthly", priority: 0.7 },
  { path: "/documentation/alerts", changeFrequency: "monthly", priority: 0.7 },

  // Examples
  { path: "/examples/observability", changeFrequency: "weekly", priority: 0.7 },
  { path: "/examples/security", changeFrequency: "weekly", priority: 0.7 },
  { path: "/examples/evaluation", changeFrequency: "weekly", priority: 0.7 },
  { path: "/examples/prompts", changeFrequency: "weekly", priority: 0.7 },

  // Integrations index (individual integration pages are appended below)
  { path: "/integrations", changeFrequency: "monthly", priority: 0.9 },

  // Comparison / alternative pages
  { path: "/langsmith-alternative", changeFrequency: "monthly", priority: 0.9 },
  { path: "/langfuse-alternative", changeFrequency: "monthly", priority: 0.9 },
  { path: "/helicone-alternative", changeFrequency: "monthly", priority: 0.9 },
  { path: "/braintrust-alternative", changeFrequency: "monthly", priority: 0.9 },
  { path: "/portkey-alternative", changeFrequency: "monthly", priority: 0.9 },
  { path: "/lakera-alternative", changeFrequency: "monthly", priority: 0.9 },

  // Blog index (posts appended below)
  // { path: "/blog", changeFrequency: "weekly", priority: 0.7 },

  // Legal
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },

  // NOTE: auth pages (/signup, /login, /forgot-password, /reset-password) are
  // intentionally excluded — they set robots noindex, so listing them in the
  // sitemap would be contradictory.
]

// Published blog slugs come from the API. Fail open — a sitemap should never
// break the build if the API is unreachable; posts just appear on the next
// successful regeneration.
// async function fetchBlogSlugs(): Promise<string[]> {
//   try {
//     const res = await fetch(`${API_BASE_URL}/api/v1/blog/slugs`, {
//       next: { revalidate: BLOG_SLUGS_TTL },
//     })
//     if (!res.ok) return []
//     const data = (await res.json()) as { slugs?: string[] }
//     return Array.isArray(data.slugs) ? data.slugs : []
//   } catch {
//     return []
//   }
// }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Pinned to the canonical domain, not the request host: a sitemap may only
  // list URLs on the site it is served from, and the alternate domains 301 here.
  const host = CANONICAL_HOST
  const SITE = CANONICAL_ORIGIN

  // Both subdomains moved to Vercel on the same hostnames.
  const SUBDOMAIN_URLS: { url: string; changeFrequency: ChangeFreq; priority: number }[] = [
    { url: siblingOrigin("polygate", host), changeFrequency: "monthly", priority: 0.8 },
    { url: siblingOrigin("infrager", host), changeFrequency: "monthly", priority: 0.8 },
  ]

  const lastModified = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((e) => ({
    url: `${SITE}${e.path}`,
    lastModified,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
  }))

  const subdomainEntries: MetadataRoute.Sitemap = SUBDOMAIN_URLS.map((e) => ({
    ...e,
    lastModified,
  }))

  const integrationEntries: MetadataRoute.Sitemap = INTEGRATIONS.map((i) => ({
    url: `${SITE}/integrations/${i.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.8,
  }))

  // const blogEntries: MetadataRoute.Sitemap = (await fetchBlogSlugs()).map((slug) => ({
  //   url: `${SITE}/blog/${slug}`,
  //   lastModified,
  //   changeFrequency: "weekly",
  //   priority: 0.6,
  // }))

  return [...staticEntries, ...subdomainEntries, ...integrationEntries /*, ...blogEntries */]
}
