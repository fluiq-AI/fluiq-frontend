"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowDown01Icon,
  Building01Icon,
  Loading03Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authFetch } from "@/lib/authFetch"
import type { OrgMembership } from "@/lib/auth-types"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { switchOrgThunk } from "@/store/auth/slice"
import { cn } from "@/lib/utils"

/**
 * Sidebar organization switcher. Lists the orgs the user belongs to, shows the
 * active one, and switches by re-minting the JWT (switchOrgThunk). After a
 * successful switch the app is reloaded so every page re-fetches under the new
 * org scope.
 */
export function OrgSwitcher() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { organization } = useAppSelector((s) => s.auth)
  const [orgs, setOrgs] = useState<OrgMembership[]>([])
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    let alive = true
    authFetch<{ organizations: OrgMembership[] }>("/api/v1/organizations")
      .then((res) => { if (alive) setOrgs(res.organizations) })
      .catch(() => { /* silent — switcher just shows the current org */ })
    return () => { alive = false }
  }, [organization?.org_id])

  async function switchTo(orgId: string) {
    if (orgId === organization?.org_id || switching) return
    setSwitching(true)
    const result = await dispatch(switchOrgThunk(orgId))
    if (switchOrgThunk.fulfilled.match(result)) {
      // Reload so every dashboard page re-fetches under the new org.
      window.location.reload()
    } else {
      setSwitching(false)
    }
  }

  const currentName = organization?.name ?? "Organization"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted">
            {switching
              ? <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
              : <HugeiconsIcon icon={Building01Icon} size={13} />}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{currentName}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map((o) => {
          const active = o.org_id === organization?.org_id
          return (
            <DropdownMenuItem key={o.org_id} onSelect={() => switchTo(o.org_id)}>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{o.name}</span>
                <span className="text-xs capitalize text-muted-foreground">
                  {o.role} · {o.plan ?? "Free"}
                </span>
              </div>
              <HugeiconsIcon
                icon={Tick02Icon}
                size={15}
                className={cn("ml-2 shrink-0 text-[#1860D3]", active ? "opacity-100" : "opacity-0")}
              />
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/dashboard/user-management")}>
          <HugeiconsIcon icon={Add01Icon} size={15} />
          Create organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
