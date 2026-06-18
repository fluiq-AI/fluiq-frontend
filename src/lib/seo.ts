import type { Metadata } from "next"

export interface PageSeo {
  /** Full, literal <title> (template in root layout is bypassed). */
  title: string
  description: string
  keywords?: string
  /** Canonical path, e.g. "/pricing". metadataBase makes it absolute. */
  path: string
  ogType?: "website" | "article"
  /** Optional JSON-LD graph rendered via <JsonLd /> in the page. */
  jsonLd?: object
}

/**
 * Build a Next.js Metadata object from a page's SEO descriptor. Mirrors the
 * per-route <Helmet> tags the SPA used (title, description, keywords, canonical,
 * Open Graph). og:image / twitter:image are inherited from the root layout.
 */
export function buildMetadata(seo: PageSeo): Metadata {
  const { title, description, keywords, path, ogType = "website" } = seo
  return {
    // `absolute` bypasses the "%s | Fluiq" template — these titles are complete.
    title: { absolute: title },
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: ogType },
    twitter: { title, description },
  }
}
