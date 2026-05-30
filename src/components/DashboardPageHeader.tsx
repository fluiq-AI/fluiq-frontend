import { useNavigate } from "react-router"
import { Logout01Icon, UserCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { logoutThunk } from "@/store/auth/slice"
import { ThemeToggle } from "@/components/ThemeToggle"
import { NotificationPanel } from "@/components/NotificationPanel"

export function DashboardPageHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAppSelector((s) => s.auth)

  async function handleLogout() {
    await dispatch(logoutThunk())
    navigate("/", { replace: true })
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?"

  return (
    <div className="sticky top-0 z-10 flex h-12 items-center justify-between gap-4 border-b border-border/60 bg-background px-6">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="font-heading text-sm font-semibold text-foreground">
          {title}
        </h1>
        {description && (
          <span className="hidden truncate text-xs text-muted-foreground lg:block">
            — {description}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <ThemeToggle className="text-muted-foreground hover:bg-muted hover:text-foreground" />

        {/* Notification bell */}
        <NotificationPanel />

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-[#EEF3FD] dark:bg-[#1A2A4A]/50 text-[10px] font-semibold text-[#1860D3] dark:text-[#6FA8FF]">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-2">
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
              <HugeiconsIcon icon={UserCircleIcon} size={14} />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <HugeiconsIcon icon={Logout01Icon} size={14} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
