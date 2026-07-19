import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon, RefreshIcon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

interface OrgAdminView {
  org_id: string
  org_name: string
  owner_email: string | null
  owner_name: string | null
  owner_type: string | null
  plan: string | null
  member_count: number
  api_key_usage: number
  api_key_limit: number
  created_at: string
}

interface OrgListResponse {
  organizations: OrgAdminView[]
  total: number
  page: number
  limit: number
}

interface AdminMember {
  user_id: string
  name: string
  email: string
  role: string
  created_at: string
}

const PLANS = ["Free", "Starter", "Team", "Growth", "Enterprise"] as const
const ROLES = ["member", "admin", "owner"] as const

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function AdminOrganizations() {
  const [data, setData] = useState<OrgListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [manage, setManage] = useState<OrgAdminView | null>(null)

  const LIMIT = 50

  async function load(p = page) {
    setError(null)
    try {
      const res = await authFetch<OrgListResponse>(
        `/admin/organizations?page=${p}&limit=${LIMIT}`,
      )
      setData(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load organizations")
    }
  }

  useEffect(() => { load(1) }, [])

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1

  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Organizations
        </h1>
        <p className="mt-2 text-muted-foreground">
          {data ? `${data.total.toLocaleString()} organizations total` : "Loading…"}
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2">
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Organization</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Members</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">API Keys</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {!data ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : data.organizations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No organizations found.
                </td>
              </tr>
            ) : (
              data.organizations.map((org) => (
                <tr
                  key={org.org_id}
                  className="bg-background hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{org.org_name}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{org.owner_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{org.owner_email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {org.plan ? (
                      <Badge variant="outline">{org.plan}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{org.member_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {org.api_key_usage} / {org.api_key_limit}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(org.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => setManage(org)}>
                      Manage
                    </Button>
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

      <ManageOrgDialog
        org={manage}
        onOpenChange={(v) => { if (!v) setManage(null) }}
        onChanged={() => load()}
      />
    </>
  )
}

function ManageOrgDialog({
  org,
  onOpenChange,
  onChanged,
}: {
  org: OrgAdminView | null
  onOpenChange: (v: boolean) => void
  onChanged: () => void
}) {
  const [members, setMembers] = useState<AdminMember[] | null>(null)
  const [plan, setPlan] = useState<string>("Free")
  const [savingPlan, setSavingPlan] = useState(false)
  const [addEmail, setAddEmail] = useState("")
  const [addRole, setAddRole] = useState("member")
  const [adding, setAdding] = useState(false)
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    if (!org) { setMembers(null); return }
    setPlan(org.plan ?? "Free")
    authFetch<{ members: AdminMember[] }>(`/admin/organizations/${org.org_id}/members`)
      .then((res) => setMembers(res.members))
      .catch((err) => toast.error(err instanceof ApiError ? err.detail : "Failed to load members"))
  }, [org])

  async function reloadMembers() {
    if (!org) return
    const res = await authFetch<{ members: AdminMember[] }>(
      `/admin/organizations/${org.org_id}/members`,
    )
    setMembers(res.members)
  }

  async function savePlan() {
    if (!org) return
    setSavingPlan(true)
    try {
      await authFetch(`/admin/organizations/${org.org_id}`, {
        method: "PATCH",
        body: { plan_tier: plan },
      })
      toast.success("Plan updated")
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to update plan")
    } finally {
      setSavingPlan(false)
    }
  }

  async function addMember() {
    if (!org || !addEmail.trim()) return
    setAdding(true)
    try {
      await authFetch(`/admin/organizations/${org.org_id}/members`, {
        method: "POST",
        body: { email: addEmail.trim(), role: addRole },
      })
      toast.success("Member added")
      setAddEmail("")
      await reloadMembers()
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to add member")
    } finally {
      setAdding(false)
    }
  }

  async function changeRole(m: AdminMember, role: string) {
    if (!org) return
    setPending(m.user_id)
    try {
      await authFetch(`/admin/organizations/${org.org_id}/members/${m.user_id}`, {
        method: "PATCH",
        body: { role },
      })
      await reloadMembers()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to change role")
    } finally {
      setPending(null)
    }
  }

  async function removeMember(m: AdminMember) {
    if (!org) return
    setPending(m.user_id)
    try {
      await authFetch(`/admin/organizations/${org.org_id}/members/${m.user_id}`, {
        method: "DELETE",
      })
      await reloadMembers()
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to remove member")
    } finally {
      setPending(null)
    }
  }

  return (
    <Dialog open={org !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{org?.org_name}</DialogTitle>
          <DialogDescription>Manage this organization&apos;s plan and members.</DialogDescription>
        </DialogHeader>

        {/* Plan override */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="admin-org-plan">Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger id="admin-org-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={savePlan} disabled={savingPlan}>
            {savingPlan ? <HugeiconsIcon icon={Loading03Icon} className="animate-spin" /> : "Save plan"}
          </Button>
        </div>

        {/* Add member */}
        <div className="flex items-end gap-2 border-t border-border/60 pt-4">
          <div className="flex-1">
            <Label htmlFor="admin-add-email">Add existing user by email</Label>
            <Input
              id="admin-add-email"
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="user@company.com"
            />
          </div>
          <div className="w-32">
            <Label htmlFor="admin-add-role">Role</Label>
            <Select value={addRole} onValueChange={setAddRole}>
              <SelectTrigger id="admin-add-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addMember} disabled={adding || !addEmail.trim()}>
            {adding ? <HugeiconsIcon icon={Loading03Icon} className="animate-spin" /> : "Add"}
          </Button>
        </div>

        {/* Members */}
        <div className="max-h-72 overflow-y-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {!members ? (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">No members.</td></tr>
              ) : (
                members.map((m) => (
                  <tr key={m.user_id} className="bg-background">
                    <td className="px-3 py-2">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </td>
                    <td className="px-3 py-2"><Badge variant="outline" className="capitalize">{m.role}</Badge></td>
                    <td className="px-3 py-2 text-right">
                      {pending === m.user_id ? (
                        <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin text-muted-foreground" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">⋯</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Set role</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {ROLES.filter((r) => r !== m.role).map((r) => (
                              <DropdownMenuItem key={r} className="capitalize" onSelect={() => changeRole(m, r)}>
                                Make {r}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => removeMember(m)}>
                              Remove
                            </DropdownMenuItem>
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
      </DialogContent>
    </Dialog>
  )
}

export default AdminOrganizations
