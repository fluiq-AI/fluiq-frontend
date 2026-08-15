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

import {
  CANONICAL_HOST,
  CANONICAL_ORIGIN,
  originForHost,
  siblingOrigin,
  SIBLING_SUBDOMAINS,
} from "@/lib/site-host"

// Re-exported so server callers keep a single import; the definitions live in
// `@/lib/site-host` because client components cannot import `next/headers`.
export {
  CANONICAL_HOST,
  CANONICAL_ORIGIN,
  originForHost,
  siteApex,
  siblingOrigin,
  SIBLING_SUBDOMAINS,
} from "@/lib/site-host"

/** Request hostname, including port in dev (e.g. "localhost:3000"). */
export async function getHost(): Promise<string> {
  return (await headers()).get("host") ?? CANONICAL_HOST
}

/** Absolute origin for this request, e.g. "https://getfluiq.com". */
export async function getSiteUrl(): Promise<string> {
  return originForHost(await getHost())
}

/**
 * Swap the authored origins for the live ones throughout a JSON-LD graph.
 *
 * Works on the serialized form so nested nodes (`isPartOf["@id"]`, breadcrumb
 * `item`, offer `url`) are all covered without walking the object by hand.
 *
 * Both the site origin and the sibling-product subdomains move with the host,
 * because each domain the site answers on has its own `polygate.` / `infrager.`
 * subdomain. Anything else — `api.getfluiq.com`, GitHub, external licences — is
 * a single real host with no per-domain twin, so it is left alone.
 */
export function withSite<T>(data: T, site: string): T {
  if (site === CANONICAL_ORIGIN) return data
  const host = site.replace(/^https?:\/\//, "")
  let json = JSON.stringify(data)
  for (const sub of SIBLING_SUBDOMAINS) {
    json = json.split(`https://${sub}.${CANONICAL_HOST}`).join(siblingOrigin(sub, host))
  }
  return JSON.parse(json.split(CANONICAL_ORIGIN).join(site)) as T
}
