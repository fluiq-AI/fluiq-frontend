import { Link, NavLink, Outlet } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { SiteNavbar } from "@/components/SiteNavbar"
import {
  BookOpen01Icon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  FileScriptIcon,
  MagicWand01Icon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { LanguageProvider, LanguageToggle } from "./LanguageContext"

const NAV = [
  { to: "/examples/observability", label: "Observability", icon: ChartLineData01Icon },
  { to: "/examples/security",      label: "Security",      icon: SecurityCheckIcon },
  { to: "/examples/evaluation",    label: "Evaluation",    icon: CheckmarkCircle02Icon },
  { to: "/examples/optimization",  label: "Optimization",  icon: MagicWand01Icon },
  { to: "/examples/prompts",       label: "Prompts",       icon: FileScriptIcon },
]

export default function ExamplesLayout() {
  return (
    <LanguageProvider>
    <div className="min-h-screen bg-background text-foreground">
      <SiteNavbar variant="docs" badge="Examples" active="developer" />

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-8 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <nav className="sticky top-24 flex flex-col gap-0.5 text-sm">
            <LanguageToggle />
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              Examples
            </p>
            {NAV.map((item) => (
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
            <div className="mt-6 border-t border-border/60 pt-4">
              <Link
                to="/documentation"
                className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <HugeiconsIcon icon={BookOpen01Icon} size={14} />
                SDK Reference
              </Link>
            </div>
          </nav>
        </aside>

        <main className="min-w-0 max-w-3xl py-4">
          <Outlet />
        </main>
      </div>
    </div>
    </LanguageProvider>
  )
}
