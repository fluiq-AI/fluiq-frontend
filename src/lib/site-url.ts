/**
 * Site origin, for canonical tags, Open Graph URLs and JSON-LD.
 *
 * The site is reachable on several hostnames but indexed on exactly one. Every
 * generated URL therefore names `CANONICAL_ORIGIN` regardless of which host
 * served the request: `metadataBase` in the root layout makes each page's
 * relative `alternates.canonical` and `openGraph.url` absolute against it, and
 * `<JsonLd>` resolves the static descriptors in `@/lib/seo-pages` the same way.
 *
 * `getHost` still reads `headers()`, so it only works in Server Components,
 * route handlers and `generateMetadata`. Client components cannot use it.
 */
import { headers } from "next/headers"

import {
  CANONICAL_HOST,
  CANONICAL_ORIGIN,
  siblingOrigin,
  SIBLING_SUBDOMAINS,
} from "@/lib/site-host"

// Re-exported so server callers keep a single import; the definitions live in
// `@/lib/site-host` because client components cannot import `next/headers`.
export {
  ALTERNATE_HOSTS,
  bareHost,
  CANONICAL_HOST,
  CANONICAL_ORIGIN,
  isSiteHost,
  originForHost,
  siteApex,
  siblingOrigin,
  SIBLING_SUBDOMAINS,
} from "@/lib/site-host"

/** Request hostname, including port in dev (e.g. "localhost:3000"). */
export async function getHost(): Promise<string> {
  return (await headers()).get("host") ?? CANONICAL_HOST
}

/**
 * Absolute origin for every generated URL, e.g. "https://getfluiq.com".
 *
 * Always the canonical origin, never the request host. `@/middleware` 301s the
 * alternate domains here, so the only hosts that can still reach this code are
 * previews and dev servers — and those must not emit self-referential
 * canonicals, or they become indexable duplicates of the real site.
 */
export async function getSiteUrl(): Promise<string> {
  return CANONICAL_ORIGIN
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
