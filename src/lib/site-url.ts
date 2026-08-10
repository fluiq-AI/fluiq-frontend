/**
 * Per-request site origin.
 *
 * The site is served on several hostnames. Canonical tags, Open Graph URLs and
 * JSON-LD must describe the host the visitor actually asked for, otherwise every
 * domain points its canonical at one of the others and the alternates collapse
 * into a single indexed site.
 *
 * Two mechanisms cover the whole app:
 *
 *  1. `metadataBase` in the root layout is built from the request host, so every
 *     page's relative `alternates.canonical` and `openGraph.url` resolve to the
 *     live host with no per-page change.
 *  2. Static JSON-LD descriptors (see `@/lib/seo-pages`) are authored against
 *     `CANONICAL_ORIGIN` and rewritten by `<JsonLd>` at render time.
 *
 * These helpers read `headers()`, so they only work in Server Components, route
 * handlers and `generateMetadata`. Client components cannot use them.
 */
import { headers } from "next/headers"

/** Fallback host, and the origin the static SEO descriptors are written against. */
export const CANONICAL_HOST = "getfluiq.com"
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`

/** Local dev is plain HTTP; every real host is HTTPS. */
export function originForHost(host: string): string {
  const protocol =
    host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https"
  return `${protocol}://${host}`
}

/** Request hostname, including port in dev (e.g. "localhost:3000"). */
export async function getHost(): Promise<string> {
  return (await headers()).get("host") ?? CANONICAL_HOST
}

/** Absolute origin for this request, e.g. "https://getfluiq.com". */
export async function getSiteUrl(): Promise<string> {
  return originForHost(await getHost())
}

/**
 * Swap the authored origin for the live one throughout a JSON-LD graph.
 *
 * Works on the serialized form so nested nodes (`isPartOf["@id"]`, breadcrumb
 * `item`, offer `url`) are all covered without walking the object by hand.
 *
 * Only the exact origin is replaced. Sibling products live on their own
 * subdomains (`polygate.getfluiq.com`, `infrager.getfluiq.com`) and the API on
 * `api.getfluiq.com`; none of those match `https://getfluiq.com`, so they are
 * left alone deliberately.
 */
export function withSite<T>(data: T, site: string): T {
  if (site === CANONICAL_ORIGIN) return data
  return JSON.parse(JSON.stringify(data).split(CANONICAL_ORIGIN).join(site)) as T
}
