import { Link, NavLink, Navigate, Outlet } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Activity01Icon,
  ApiIcon,
  DashboardSquare01Icon,
  Database01Icon,
  MagicWand01Icon,
  AiSecurity02Icon,
  AiContentGenerator01Icon,
  TestTube01Icon,
  Rocket02Icon,
  UserCircleIcon,
  RoboticIcon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { useAppSelector } from "@/store/hooks"
import { cn } from "@/lib/utils"

const NAV_SECTIONS = [
  {
    section: "",
    items:[
      { to: "/dashboard/getting-started", label: "Getting Started", icon: Rocket02Icon},
      { to: "/dashboard/overview", label: "Overview", icon: DashboardSquare01Icon },
    ]
  },
  {
    section: "Observability",
    items: [
      { to: "/dashboard/traces", label: "Traces", icon: Activity01Icon },
      { to: "/dashboard/agents", label: "Agents", icon: RoboticIcon },
    ],
  },
  {
    section: "Evaluation",
    items: [
      { to: "/dashboard/tests", label: "Tests", icon: TestTube01Icon },
      { to: "/dashboard/prompts", label: "Prompts", icon: AiContentGenerator01Icon },
      { to: "/dashboard/datasets", label: "Datasets", icon: Database01Icon }
    ],
  },
  {
    section: "Security",
    items: [
      { to: "/dashboard/security", label: "Security", icon: AiSecurity02Icon },
    ],
  },
  {
    section: "Optimization",
    items: [
      { to: "/dashboard/optimize", label: "Optimize", icon: MagicWand01Icon },
    ],
  },
  {
    section: "Account",
    items: [
      { to: "/dashboard/api-management", label: "API Management", icon: ApiIcon },
      { to: "/dashboard/profile", label: "Profile", icon: UserCircleIcon },
    ],
  },
]

function Dashboard() {
  const { user, organization } = useAppSelector((s) => s.auth)

  if (!user || !organization) return null
  if (user.user_type === "Admin") return <Navigate to="/admin" replace />

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 flex h-screen w-60 flex-col border-r border-border/60 bg-background">
        <div className="flex h-16 items-center border-b border-border/60 px-5">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Fluiq" className="size-7" />
            <span className="font-heading text-lg font-semibold tracking-tight">Fluiq</span>
            <Badge variant="muted" className="ml-1">Dashboard</Badge>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <div className="grid gap-4">
            {NAV_SECTIONS.map((group) => (
              <div key={group.section}>
                <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/50">
                  {group.section}
                </p>
                <ul className="grid gap-1">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-muted font-medium text-foreground"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                          )
                        }
                      >
                        <HugeiconsIcon icon={item.icon} size={16} />
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default Dashboard