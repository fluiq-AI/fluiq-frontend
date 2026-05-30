import { Link, NavLink, Outlet } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  ArrowRight02Icon,
  BookOpen01Icon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  FileScriptIcon,
  MagicWand01Icon,
  RocketIcon,
  SecurityCheckIcon,
  ZapIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const NAV = [
  {
    section: "Getting Started",
    items: [
      { to: "/documentation/quickstart", label: "Quickstart", icon: RocketIcon },
    ],
  },
  {
    section: "Pillars",
    items: [
      { to: "/documentation/observability", label: "Observability", icon: ChartLineData01Icon },
      { to: "/documentation/security",      label: "Security",      icon: SecurityCheckIcon },
      { to: "/documentation/evaluation",    label: "Evaluation",    icon: CheckmarkCircle02Icon },
      { to: "/documentation/optimization",  label: "Optimization",  icon: MagicWand01Icon },
    ],
  },
  {
    section: "Reference",
    items: [
      { to: "/documentation/prompts",       label: "Prompts",       icon: FileScriptIcon },
      { to: "/documentation/configuration", label: "Configuration", icon: ZapIcon },
    ],
  },
]

export default function DocLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Fluiq" className="size-7" />
            <span className="font-heading text-lg font-semibold tracking-tight">Fluiq</span>
            <Badge variant="muted" className="ml-1">Docs</Badge>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link to="/" className="hover:text-foreground">Platform</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/documentation" className="font-medium text-foreground">Documentation</Link>
            <Link to="/examples" className="hover:text-foreground">Examples</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" asChild>
              <Link to="/signup">
                Get API key
                <HugeiconsIcon icon={ArrowRight02Icon} />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-8 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <nav className="sticky top-24 flex flex-col gap-0.5 text-sm">
            {NAV.map((group) => (
              <div key={group.section} className="mb-5">
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  {group.section}
                </p>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-1.5 transition-colors",
                        isActive
                          ? "bg-[#EEF3FD] dark:bg-[#1A2A4A]/40 font-medium text-[#1860D3] dark:text-[#6FA8FF]"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )
                    }
                  >
                    <HugeiconsIcon icon={item.icon} size={14} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
            <div className="border-t border-border/60 pt-4">
              <Link
                to="/examples"
                className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <HugeiconsIcon icon={BookOpen01Icon} size={14} />
                Code Examples
              </Link>
            </div>
          </nav>
        </aside>

        <main className="min-w-0 max-w-3xl py-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
