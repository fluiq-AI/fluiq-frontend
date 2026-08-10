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

/** Social preview image. Relative on purpose: `metadataBase` in the root layout
 *  is built from the request host, so this resolves per-domain. */
const OG_IMAGE = "/banner.png"

/**
 * Build a Next.js Metadata object from a page's SEO descriptor. Mirrors the
 * per-route <Helmet> tags the SPA used (title, description, keywords, canonical,
 * Open Graph).
 *
 * The image fields are repeated here rather than inherited: Next.js *replaces*
 * the parent `openGraph` / `twitter` objects when a page defines its own, so a
 * page that sets only title/description drops the layout's image and downgrades
 * the Twitter card to "summary".
 *
 * Every URL here stays relative and is made absolute against `metadataBase`,
 * which keeps canonical, og:url and og:image on whichever host served the
 * request. See `@/lib/site-url`.
 */
export function buildMetadata(seo: PageSeo): Metadata {
  const { title, description, keywords, path, ogType = "website" } = seo
  return {
    // `absolute` bypasses the "%s | Fluiq" template — these titles are complete.
    title: { absolute: title },
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: ogType,
      siteName: "Fluiq",
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: "Fluiq, the control plane for AI agents in production",
        },
      ],
    },
    twitter: { title, description, card: "summary_large_image", images: [OG_IMAGE] },
  }
}
