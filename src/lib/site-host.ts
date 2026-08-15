/**
 * Host arithmetic, with no server-only imports.
 *
 * `@/lib/site-url` pulls in `next/headers` and therefore cannot be touched from
 * a client component. The pure pieces live here so both sides can share them.
 */

/** Fallback host, and the origin the static SEO descriptors are written against. */
export const CANONICAL_HOST = "fluiqai.dev"
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`

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
