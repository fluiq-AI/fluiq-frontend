import { Link, NavLink, Outlet } from "react-router"
import { SiteNavbar } from "@/components/SiteNavbar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BookOpen01Icon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  FileScriptIcon,
  MagicWand01Icon,
  RocketIcon,
  SecurityCheckIcon,
  ZapIcon,
} from "@hugeicons/core-free-icons"
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
      <SiteNavbar variant="docs" badge="Docs" active="developer" />

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
