"use client"

import { createContext, useContext } from "react"

import { CANONICAL_HOST, siblingOrigin } from "@/lib/site-host"

/**
 * The request host, handed down from the root layout.
 *
 * Marketing components link to sibling products (polygate, Infrager) that live
 * on a subdomain of whichever domain the visitor is on, so those hrefs cannot be
 * constants. `headers()` is server-only and these components are client-side, so
 * the layout reads the host once and publishes it here — which also keeps the
 * server-rendered href identical to the hydrated one.
 *
 * The default only applies outside the provider (tests, storybook-style usage).
 */
const SiteHostContext = createContext<string>(CANONICAL_HOST)

export function SiteHostProvider({
  host,
  children,
}: {
  host: string
  children: React.ReactNode
}) {
  return <SiteHostContext.Provider value={host}>{children}</SiteHostContext.Provider>
}

/** Request hostname, including port in dev (e.g. "localhost:3000"). */
export function useSiteHost(): string {
  return useContext(SiteHostContext)
}

/** `useSiblingOrigin("polygate")` → "https://polygate.<this domain>". */
export function useSiblingOrigin(sub: string): string {
  return siblingOrigin(sub, useSiteHost())
}
