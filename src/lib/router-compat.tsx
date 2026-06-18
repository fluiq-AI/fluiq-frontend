"use client"

/**
 * react-router → Next.js compatibility shim.
 *
 * `react-router` is aliased to this module (see next.config.ts + tsconfig
 * paths) so components that still `import { Link, useNavigate, useParams, ... }
 * from "react-router"` keep working on top of the Next App Router without edits.
 *
 * Routing/layout structure lives in the `app/` directory; this only covers the
 * client-side navigation primitives the components actually use.
 */

import * as React from "react"
import NextLink from "next/link"
import {
  useRouter,
  usePathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from "next/navigation"

const STATE_KEY = "__fluiq_router_state__"

function readState(): unknown {
  if (typeof window === "undefined") return undefined
  try {
    const raw = window.sessionStorage.getItem(STATE_KEY)
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

function writeState(state: unknown) {
  if (typeof window === "undefined" || state === undefined) return
  try {
    window.sessionStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

function toHref(to: unknown): string {
  if (typeof to === "string") return to
  if (to && typeof to === "object") {
    const t = to as { pathname?: string; search?: string; hash?: string }
    return `${t.pathname ?? ""}${t.search ?? ""}${t.hash ?? ""}`
  }
  return "#"
}

/* ---------------------------------------------------------------- <Link> -- */

type LinkProps = Omit<React.ComponentProps<typeof NextLink>, "href"> & {
  to: unknown
  state?: unknown
  // react-router-only props that must not reach the DOM
  reloadDocument?: boolean
  preventScrollReset?: boolean
  relative?: "route" | "path"
  end?: boolean
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, state, reloadDocument, preventScrollReset, relative, end, onClick, ...rest },
  ref,
) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (state !== undefined) writeState(state)
    onClick?.(e)
  }
  return <NextLink ref={ref} href={toHref(to)} onClick={handleClick} {...rest} />
})

/* ------------------------------------------------------------- <NavLink> -- */

type NavRenderState = { isActive: boolean; isPending: boolean; isTransitioning: boolean }

type NavLinkProps = Omit<LinkProps, "className" | "style" | "children"> & {
  className?: string | ((s: NavRenderState) => string)
  style?: React.CSSProperties | ((s: NavRenderState) => React.CSSProperties)
  children?: React.ReactNode | ((s: NavRenderState) => React.ReactNode)
}

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, end, className, style, children, ...rest },
  ref,
) {
  const pathname = usePathname()
  const target = toHref(to)
  const isActive = end
    ? pathname === target
    : pathname === target || pathname.startsWith(target.endsWith("/") ? target : target + "/")

  const renderState: NavRenderState = { isActive, isPending: false, isTransitioning: false }
  const cls = typeof className === "function" ? className(renderState) : className
  const sty = typeof style === "function" ? style(renderState) : style
  const kids = typeof children === "function" ? children(renderState) : children

  return (
    <Link ref={ref} to={to} className={cls} style={sty} aria-current={isActive ? "page" : undefined} {...rest}>
      {kids}
    </Link>
  )
})

/* ------------------------------------------------------------- <Navigate> -- */

export function Navigate({
  to,
  replace,
  state,
}: {
  to: string
  replace?: boolean
  state?: unknown
}) {
  const router = useRouter()
  React.useEffect(() => {
    if (state !== undefined) writeState(state)
    if (replace) router.replace(to)
    else router.push(to)
  }, [to, replace, state, router])
  return null
}

/* -------------------------------------------------------------- <Outlet> -- */

const OutletContext = React.createContext<React.ReactNode>(null)

/** Bridges a Next layout's `children` to components that render <Outlet/>. */
export function OutletProvider({
  outlet,
  children,
}: {
  outlet: React.ReactNode
  children: React.ReactNode
}) {
  return <OutletContext.Provider value={outlet}>{children}</OutletContext.Provider>
}

export function Outlet() {
  return <>{React.useContext(OutletContext)}</>
}

/* ----------------------------------------------------------------- hooks -- */

export function useNavigate() {
  const router = useRouter()
  return React.useCallback(
    (to: string | number, opts?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === "number") {
        if (to < 0) router.back()
        else router.forward()
        return
      }
      if (opts?.state !== undefined) writeState(opts.state)
      if (opts?.replace) router.replace(to)
      else router.push(to)
    },
    [router],
  )
}

export function useLocation() {
  const pathname = usePathname()
  const searchParams = useNextSearchParams()
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : ""
  const [hash, setHash] = React.useState("")
  React.useEffect(() => {
    setHash(window.location.hash)
  }, [pathname, search])
  return { pathname, search, hash, state: readState(), key: "default" as const }
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return useNextParams() as T
}

type SetSearchParams = (
  next:
    | URLSearchParams
    | Record<string, string>
    | ((prev: URLSearchParams) => URLSearchParams),
  opts?: { replace?: boolean },
) => void

export function useSearchParams(): [URLSearchParams, SetSearchParams] {
  const params = useNextSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const current = new URLSearchParams(params?.toString() ?? "")

  const setSearchParams: SetSearchParams = (next, opts) => {
    const resolved = typeof next === "function" ? next(new URLSearchParams(current)) : next
    const usp = resolved instanceof URLSearchParams ? resolved : new URLSearchParams(resolved)
    const qs = usp.toString()
    const url = qs ? `${pathname}?${qs}` : pathname
    if (opts?.replace) router.replace(url)
    else router.push(url)
  }

  return [current, setSearchParams]
}

/* ---- passthroughs (routing now lives in app/, these are inert wrappers) -- */

export function BrowserRouter({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
export const MemoryRouter = BrowserRouter
export const HashRouter = BrowserRouter
