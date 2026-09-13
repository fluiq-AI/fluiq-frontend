import { useEffect, useState } from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { GithubIcon } from "@hugeicons/core-free-icons"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NavIntegrationsDropdown } from "@/components/NavIntegrationsDropdown"
import { NavDeveloperDropdown } from "@/components/NavDeveloperDropdown"
import { NavPlatformDropdown } from "@/components/NavPlatformDropdown"

type NavKey = "platform" | "integrations" | "pricing" | "developer" | "faq" | "contact"

interface SiteNavbarProps {
  /** Visual theme. "marketing" matches the landing/marketing pages, "docs" matches the documentation/examples pages. */
  variant?: "marketing" | "docs"
  /** Which nav item to highlight as the current page. */
  active?: NavKey
  /** Badge shown next to the logo (docs variant only), e.g. "Docs" or "Examples". */
  badge?: string
  /** Landing page (Home) — renders Platform/How it works as in-page anchors. */
  landing?: boolean
}

export function SiteNavbar({ variant = "marketing", active, badge, landing }: SiteNavbarProps) {
  const isDocs = variant === "docs"

  // Marketing header gets a border/blur once the page is scrolled.
  const [navScrolled, setNavScrolled] = useState(false)
  useEffect(() => {
    if (isDocs) return
    const onScroll = () => setNavScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [isDocs])

  // Per-variant class helpers for plain links and dropdown triggers.
  const linkClass = (key: NavKey) => {
    const isActive = active === key
    if (isDocs) {
      return isActive ? "font-medium text-foreground" : "hover:text-foreground"
    }
    return isActive
      ? "text-[#0a0a0a] dark:text-[#FAF9F6] font-medium"
      : "hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors"
  }
  const triggerClass = (key: NavKey) => {
    const isActive = active === key
    if (isDocs) {
      return isActive
        ? "text-foreground font-medium transition-colors"
        : "hover:text-foreground transition-colors"
    }
    return isActive
      ? "text-[#0a0a0a] dark:text-[#FAF9F6] font-medium"
      : "hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors"
  }

  const headerClass = isDocs
    ? "sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur"
    : `sticky top-0 z-50 transition-all duration-300 ${
        navScrolled
          ? "bg-[#FAF9F6]/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#E5E1D6] dark:border-[#2A2A2A]"
          : "bg-[#FAF9F6] dark:bg-[#0A0A0A] border-b border-transparent"
      }`

  return (
    <header className={headerClass}>
      <div className={`mx-auto flex h-16 items-center justify-between px-6 ${isDocs ? "max-w-7xl" : "max-w-6xl"}`}>
        <Link to="/" className={`flex items-center ${isDocs ? "gap-2" : "gap-2.5"}`}>
          <img src="/logo.svg" alt="Fluiq" className="size-7" />
          <span className={`font-heading font-semibold tracking-tight ${isDocs ? "text-lg" : "text-[15px]"}`}>Fluiq</span>
          {isDocs && badge && <Badge variant="muted" className="ml-1">{badge}</Badge>}
        </Link>

        <nav className={`hidden items-center md:flex ${
          isDocs ? "gap-6 text-sm text-muted-foreground" : "gap-7 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]"
        }`}>
          <NavPlatformDropdown triggerClassName={triggerClass("platform")} />
          {landing && (
            <a href="#how-it-works" className={linkClass("platform")}>How it works</a>
          )}
          <NavIntegrationsDropdown triggerClassName={triggerClass("integrations")} />
          {/* Fluiq is archived and open source — there is nothing to price and no
              inbox behind the contact form. Restore both if the hosted service
              ever comes back.
          <Link to="/pricing" className={linkClass("pricing")}>Pricing</Link>
          */}
          <NavDeveloperDropdown triggerClassName={triggerClass("developer")} />
          {/*
          <Link to="/contact" className={linkClass("contact")}>Contact</Link>
          */}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Sign-in and sign-up are gone with the hosted service: there is no API
              to authenticate against. The single CTA now points at the source.
          {isDocs ? (
            <Button size="sm" asChild>
              <Link to="/signup">
                Get API key
                <HugeiconsIcon icon={ArrowRight02Icon} />
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="..." asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button size="sm" className="cta-btn ..." asChild>
                <Link to="/signup">Start free <HugeiconsIcon icon={ArrowRight02Icon} size={14} /></Link>
              </Button>
            </>
          )}
          */}
          <Button
            size="sm"
            className={isDocs ? undefined : "cta-btn bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9]"}
            asChild
          >
            <a href="https://github.com/fluiq-AI" target="_blank" rel="noopener noreferrer">
              <HugeiconsIcon icon={GithubIcon} size={14} />
              GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
