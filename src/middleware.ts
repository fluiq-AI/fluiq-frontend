import { NextResponse, type NextRequest } from "next/server"

import { bareHost, CANONICAL_HOST, CANONICAL_ORIGIN, isSiteHost } from "@/lib/site-host"

/**
 * Collapse every domain the site answers on onto `CANONICAL_HOST`.
 *
 * The site is registered on four domains and used to serve all four as
 * independent, self-canonical sites. Search engines treat that as one page
 * duplicated four times: they pick a single winner per query, drop the rest,
 * and split inbound links across hosts that never reinforce each other. A
 * permanent redirect makes the alternates feed the canonical domain instead.
 *
 * Hosts that are not part of the public site — Amplify preview URLs, raw IPs,
 * dev servers — are left reachable on purpose (redirecting them would make
 * branch previews untestable) and are kept out of the index with a noindex
 * header instead. `@/app/robots` disallows them for the same reason.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? ""

  if (bareHost(host) === CANONICAL_HOST && !host.toLowerCase().startsWith("www.")) {
    return NextResponse.next()
  }

  if (isSiteHost(host)) {
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, CANONICAL_ORIGIN)
    // 301, not 307/308: the permanent signal every crawler and SEO tool reads
    // without ambiguity, and the one Search Console's change-of-address check
    // looks for. All traffic to these hosts is GET, so preserving the method
    // buys nothing.
    return NextResponse.redirect(url, 301)
  }

  const response = NextResponse.next()
  response.headers.set("X-Robots-Tag", "noindex, nofollow")
  return response
}

export const config = {
  // Everything except Next's own build output. Static assets under /public are
  // intentionally included: a stray link to an image on an alternate domain
  // should land on the canonical one too.
  matcher: ["/((?!_next/static|_next/image).*)"],
}
