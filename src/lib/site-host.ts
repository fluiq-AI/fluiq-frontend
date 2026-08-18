/**
 * Host arithmetic, with no server-only imports.
 *
 * `@/lib/site-url` pulls in `next/headers` and therefore cannot be touched from
 * a client component. The pure pieces live here so both sides can share them.
 */

/**
 * The one host the site is indexed on. Everything else 301s here.
 *
 * The site answers on four registered domains. Serving the same pages on all
 * four made them compete as duplicates rather than reinforce one another, so
 * only this host is canonical, indexable, and named in the sitemap; the rest
 * are redirects that pass their link equity along (see `@/middleware`).
 */
export const CANONICAL_HOST = "getfluiq.com"
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`

/** The registered domains that redirect to `CANONICAL_HOST`. */
export const ALTERNATE_HOSTS = ["getfluiq.dev", "fluiqai.dev", "fluiq.net"] as const

/** Hostname with any port and leading `www.` removed. */
export function bareHost(host: string): string {
  return host.replace(/:\d+$/, "").toLowerCase().replace(/^www\./, "")
}

/**
 * True for a hostname the marketing site is meant to be reached on — the
 * canonical domain, the alternates, and the `www.` form of any of them.
 *
 * Deliberately false for Amplify preview URLs, raw IPs and dev servers: those
 * must not be redirected (previews would become untestable), they are kept out
 * of the index by `middleware` and `robots` instead.
 */
export function isSiteHost(host: string): boolean {
  const bare = bareHost(host)
  return bare === CANONICAL_HOST || (ALTERNATE_HOSTS as readonly string[]).includes(bare)
}

/** Local dev is plain HTTP; every real host is HTTPS. */
export function originForHost(host: string): string {
  const protocol =
    host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https"
  return `${protocol}://${host}`
}

const LOOPBACK = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/
const PREVIEW = /\.amplifyapp\.com$/

/**
 * The apex the sibling products hang off, derived from the host being served.
 *
 * The marketing site answers on several domains and each one has its own
 * `polygate.` / `infrager.` subdomain, so a visitor on `getfluiq.com` must be
 * sent to `polygate.getfluiq.com` rather than bounced to another domain.
 *
 * Hosts that have no sibling subdomains — dev servers, raw IPs, Amplify preview
 * URLs — fall back to the canonical domain, which does.
 */
export function siteApex(host: string): string {
  const bare = host.replace(/:\d+$/, "").toLowerCase()
  if (!bare.includes(".") || LOOPBACK.test(bare) || IPV4.test(bare) || PREVIEW.test(bare)) {
    return CANONICAL_HOST
  }
  return bare.startsWith("www.") ? bare.slice(4) : bare
}

/** Products that are served as a subdomain of every domain the site answers on. */
export const SIBLING_SUBDOMAINS = ["polygate", "infrager"] as const

/** Origin of a sibling product, e.g. `siblingOrigin("polygate", host)`. */
export function siblingOrigin(sub: string, host: string): string {
  return `https://${sub}.${siteApex(host)}`
}
