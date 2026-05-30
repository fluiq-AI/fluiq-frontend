import { Link, NavLink, Outlet, useNavigate } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Building01Icon,
  DashboardSquare01Icon,
  Loading03Icon,
  Logout01Icon,
  ShieldKeyIcon,
  SparklesIcon,
  UserCircleIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { logoutThunk } from "@/store/auth/slice"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { to: "/admin/overview", label: "Overview", icon: DashboardSquare01Icon },
  { to: "/admin/users", label: "Users", icon: UserIcon },
  { to: "/admin/organizations", label: "Organizations", icon: Building01Icon },
  { to: "/admin/plans", label: "Plans", icon: SparklesIcon },
] as const

function AdminLayout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user, organization, status } = useAppSelector((s) => s.auth)

  const isLoggingOut = status === "loading"

  async function handleLogout() {
    await dispatch(logoutThunk())
    navigate("/", { replace: true })
  }

  if (!user || !organization) return null

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 flex h-screen w-60 flex-col border-r border-border/60 bg-background">
        <div className="flex h-16 items-center border-b border-border/60 px-5">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Fluiq" className="size-7" />
            <span className="font-heading text-lg font-semibold tracking-tight">Fluiq</span>
            <Badge variant="muted" className="ml-1">Admin</Badge>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="grid gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-[#EEF3FD] dark:bg-[#1A2A4A]/40 font-medium text-[#1860D3] dark:text-[#6FA8FF]"
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
        </nav>

        <div className="border-t border-border/60 p-3">
          <div className="mb-2 flex items-center gap-2 px-2 py-1 text-sm">
            <HugeiconsIcon icon={UserCircleIcon} size={16} className="text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <HugeiconsIcon icon={ShieldKeyIcon} size={10} />
              Admin
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
            ) : (
              <HugeiconsIcon icon={Logout01Icon} />
            )}
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-2 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AdminLayout
