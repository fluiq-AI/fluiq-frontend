import { getSiteUrl, withSite } from "@/lib/site-url"

/**
 * Renders a JSON-LD structured-data block. Server component (no hooks) so the
 * script lands in the initial SSR HTML for crawlers.
 *
 * The graph is authored against the canonical origin; every absolute URL in it
 * is rewritten to the host serving this request, so each domain describes
 * itself. See `@/lib/site-url`.
 */
export async function JsonLd({ data }: { data: object }) {
  const site = await getSiteUrl()
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(withSite(data, site)) }}
    />
  )
}
