import type { MetadataRoute } from "next"

import { API_BASE_URL } from "@/lib/api"
import { INTEGRATIONS } from "@/pages/Integrations/data"

const SITE = "https://getfluiq.com"

// Regenerate hourly so newly published blog posts appear without a redeploy.
export const revalidate = 3600

type ChangeFreq = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>
type Entry = { path: string; changeFrequency: ChangeFreq; priority: number }

const STATIC_ROUTES: Entry[] = [
  // Marketing
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.9 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.7 },

  // Documentation
  { path: "/documentation/quickstart", changeFrequency: "weekly", priority: 0.9 },
  { path: "/documentation/observability", changeFrequency: "weekly", priority: 0.8 },
  { path: "/documentation/security", changeFrequency: "weekly", priority: 0.8 },
  { path: "/documentation/optimization", changeFrequency: "weekly", priority: 0.8 },
  { path: "/documentation/evaluation", changeFrequency: "weekly", priority: 0.8 },
  { path: "/documentation/prompts", changeFrequency: "weekly", priority: 0.8 },
  { path: "/documentation/configuration", changeFrequency: "monthly", priority: 0.7 },
  { path: "/documentation/alerts", changeFrequency: "monthly", priority: 0.7 },

  // Examples
  { path: "/examples/observability", changeFrequency: "weekly", priority: 0.7 },
  { path: "/examples/security", changeFrequency: "weekly", priority: 0.7 },
  { path: "/examples/optimization", changeFrequency: "weekly", priority: 0.7 },
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
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },

  // Legal
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },

  // Auth (low priority — no unique content)
  { path: "/signup", changeFrequency: "monthly", priority: 0.6 },
  { path: "/login", changeFrequency: "monthly", priority: 0.3 },
]

// Published blog slugs come from the API. Fail open — a sitemap should never
// break the build if the API is unreachable; posts just appear on the next
// successful regeneration.
async function fetchBlogSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/blog/slugs`, {
      next: { revalidate },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { slugs?: string[] }
    return Array.isArray(data.slugs) ? data.slugs : []
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((e) => ({
    url: `${SITE}${e.path}`,
    lastModified,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
  }))

  const integrationEntries: MetadataRoute.Sitemap = INTEGRATIONS.map((i) => ({
    url: `${SITE}/integrations/${i.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.8,
  }))

  const blogEntries: MetadataRoute.Sitemap = (await fetchBlogSlugs()).map((slug) => ({
    url: `${SITE}/blog/${slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.6,
  }))

  return [...staticEntries, ...integrationEntries, ...blogEntries]
}
