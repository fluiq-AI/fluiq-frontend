import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon, RefreshIcon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"

interface UserAdminView {
  user_id: string
  email: string
  name: string
  user_type: string
  org_id: string
  org_name: string | null
  created_at: string
}

interface UserListResponse {
  users: UserAdminView[]
  total: number
  page: number
  limit: number
}

const BILLABLE_TYPES = ["Free", "Starter", "Team", "Growth", "Enterprise"] as const

const PLAN_COLORS: Record<string, string> = {
  Free: "outline",
  Starter: "outline",
  Team: "outline",
  Growth: "outline",
  Enterprise: "outline",
  Admin: "outline",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function AdminUsers() {
  const [data, setData] = useState<UserListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [changingId, setChangingId] = useState<string | null>(null)

  const LIMIT = 50

  async function load(p = page, s = search, pf = planFilter) {
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT), search: s })
      if (pf) params.set("user_type", pf)
      const res = await authFetch<UserListResponse>(`/admin/users?${params}`)
      setData(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load users")
    }
  }

  useEffect(() => { load(1, search, planFilter) }, [search, planFilter])

  async function changePlan(userId: string, newType: string) {
    setChangingId(userId)
    try {
      await authFetch(`/admin/users/${userId}`, {
        method: "PATCH",
        body: { user_type: newType },
      })
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update plan")
    } finally {
      setChangingId(null)
    }
  }

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1

  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Users
        </h1>
        <p className="mt-2 text-muted-foreground">
          {data ? `${data.total.toLocaleString()} users total` : "Loading…"}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-64"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {planFilter ?? "All plans"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by plan</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => { setPlanFilter(null); setPage(1) }}>
              All plans
            </DropdownMenuItem>
            {BILLABLE_TYPES.map((t) => (
              <DropdownMenuItem key={t} onSelect={() => { setPlanFilter(t); setPage(1) }}>
                {t}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="sm" onClick={() => load()}>
          <HugeiconsIcon icon={RefreshIcon} size={14} />
          Refresh
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Organization</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {!data ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : data.users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            ) : (
              data.users.map((u) => (
                <tr key={u.user_id} className="bg-background hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.org_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={PLAN_COLORS[u.user_type] as "outline"}>{u.user_type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    {u.user_type === "Admin" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : changingId === u.user_id ? (
                      <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin text-muted-foreground" />
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">Change plan</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Set plan</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {BILLABLE_TYPES.filter((t) => t !== u.user_type).map((t) => (
                            <DropdownMenuItem key={t} onSelect={() => changePlan(u.user_id, t)}>
                              {t}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => { setPage((p) => p - 1); load(page - 1) }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => { setPage((p) => p + 1); load(page + 1) }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

export default AdminUsers
