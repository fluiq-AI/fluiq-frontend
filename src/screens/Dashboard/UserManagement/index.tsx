"use client"

import { useCallback, useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Building01Icon,
  Loading03Icon,
  Mail01Icon,
  RefreshIcon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import type {
  OrgInvitation,
  OrgMember,
  OrgMembership,
  OrgRole,
} from "@/lib/auth-types"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { switchOrgThunk } from "@/store/auth/slice"

const ROLE_RANK: Record<OrgRole, number> = { member: 1, admin: 2, owner: 3 }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function RoleBadge({ role }: { role: OrgRole }) {
  return <Badge variant="outline" className="capitalize">{role}</Badge>
}

function UserManagement() {
  const dispatch = useAppDispatch()
  const { user, organization } = useAppSelector((s) => s.auth)
  const currentOrgId = organization?.org_id ?? null

  const [orgs, setOrgs] = useState<OrgMembership[] | null>(null)
  const [members, setMembers] = useState<OrgMember[] | null>(null)
  const [yourRole, setYourRole] = useState<OrgRole>("member")
  const [invites, setInvites] = useState<OrgInvitation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const canManage = ROLE_RANK[yourRole] >= ROLE_RANK.admin

  const loadOrgs = useCallback(async () => {
    try {
      const res = await authFetch<{ organizations: OrgMembership[] }>("/api/v1/organizations")
      setOrgs(res.organizations)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load organizations")
    }
  }, [])

  const loadMembers = useCallback(async () => {
    if (!currentOrgId) return
    try {
      const res = await authFetch<{ members: OrgMember[]; your_role: OrgRole }>(
        `/api/v1/organizations/${currentOrgId}/members`,
      )
      setMembers(res.members)
      setYourRole(res.your_role)
      if (ROLE_RANK[res.your_role] >= ROLE_RANK.admin) {
        const inv = await authFetch<{ invitations: OrgInvitation[] }>(
          `/api/v1/organizations/${currentOrgId}/invitations`,
        )
        setInvites(inv.invitations)
      } else {
        setInvites([])
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load members")
    }
  }, [currentOrgId])

  useEffect(() => { loadOrgs() }, [loadOrgs])
  useEffect(() => { loadMembers() }, [loadMembers])

  async function handleSwitch(orgId: string) {
    if (orgId === currentOrgId) return
    setBusy(true)
    const result = await dispatch(switchOrgThunk(orgId))
    setBusy(false)
    if (switchOrgThunk.fulfilled.match(result)) {
      toast.success("Switched organization")
      loadOrgs()
    } else {
      toast.error(typeof result.payload === "string" ? result.payload : "Failed to switch")
    }
  }

  return (
    <>
      <DashboardPageHeader
        title="User Management"
        description="Manage your organizations, members, and invitations."
      />
      <div className="flex flex-col gap-6 px-6 py-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <OrganizationsSection
          orgs={orgs}
          currentOrgId={currentOrgId}
          busy={busy}
          onSwitch={handleSwitch}
          onChanged={() => { loadOrgs(); loadMembers() }}
        />

        <MembersSection
          members={members}
          yourRole={yourRole}
          canManage={canManage}
          currentOrgId={currentOrgId}
          currentUserId={user?.user_id ?? null}
          onReload={loadMembers}
          onOrgsChanged={loadOrgs}
        />

        {canManage && currentOrgId && (
          <InvitationsSection
            orgId={currentOrgId}
            invites={invites}
            onReload={loadMembers}
          />
        )}
      </div>
    </>
  )
}

/* ── Organizations ─────────────────────────────────────────────────────────── */

function OrganizationsSection({
  orgs,
  currentOrgId,
  busy,
  onSwitch,
  onChanged,
}: {
  orgs: OrgMembership[] | null
  currentOrgId: string | null
  busy: boolean
  onSwitch: (orgId: string) => void
  onChanged: () => void
}) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Building01Icon} size={16} />
          <div>
            <CardTitle className="text-base">Your organizations</CardTitle>
            <CardDescription>Switch between teams or create a new one.</CardDescription>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <HugeiconsIcon icon={Add01Icon} size={14} />
          New organization
        </Button>
      </CardHeader>
      <CardContent className="grid gap-2">
        {!orgs ? (
          <p className="py-4 text-sm text-muted-foreground">Loading…</p>
        ) : (
          orgs.map((o) => (
            <OrgRow
              key={o.org_id}
              org={o}
              isCurrent={o.org_id === currentOrgId}
              busy={busy}
              onSwitch={onSwitch}
              onChanged={onChanged}
            />
          ))
        )}
      </CardContent>
      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={onChanged} />
    </Card>
  )
}

function OrgRow({
  org,
  isCurrent,
  busy,
  onSwitch,
  onChanged,
}: {
  org: OrgMembership
  isCurrent: boolean
  busy: boolean
  onSwitch: (orgId: string) => void
  onChanged: () => void
}) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isOwner = org.role === "owner"

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{org.name}</span>
          {isCurrent && <Badge variant="muted">Current</Badge>}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          <span className="capitalize">{org.role}</span> · {org.plan ?? "Free"} plan ·{" "}
          {org.member_count} member{org.member_count === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!isCurrent && (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onSwitch(org.org_id)}>
            Switch
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">⋯</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{org.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={ROLE_RANK[org.role] < ROLE_RANK.admin}
              onSelect={() => setRenameOpen(true)}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!isOwner}
              className="text-destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              Delete organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <RenameOrgDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        org={org}
        onDone={onChanged}
      />
      <DeleteOrgDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        org={org}
        onDone={onChanged}
      />
    </div>
  )
}

function CreateOrgDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!name.trim()) return
    setBusy(true)
    try {
      await authFetch("/api/v1/organizations", { method: "POST", body: { name: name.trim() } })
      toast.success("Organization created")
      setName("")
      onOpenChange(false)
      onCreated()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to create organization")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New organization</DialogTitle>
          <DialogDescription>
            You&apos;ll be the owner. It starts on the Free plan and can be upgraded separately.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="new-org-name">Organization name</Label>
          <Input
            id="new-org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Inc."
            maxLength={80}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") submit() }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !name.trim()}>
            {busy ? <HugeiconsIcon icon={Loading03Icon} className="animate-spin" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RenameOrgDialog({
  open,
  onOpenChange,
  org,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  org: OrgMembership
  onDone: () => void
}) {
  const [name, setName] = useState(org.name)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setName(org.name) }, [open, org.name])

  async function submit() {
    if (!name.trim()) return
    setBusy(true)
    try {
      await authFetch(`/api/v1/organizations/${org.org_id}`, {
        method: "PATCH",
        body: { name: name.trim() },
      })
      toast.success("Organization renamed")
      onOpenChange(false)
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to rename")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename organization</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="rename-org">Name</Label>
          <Input
            id="rename-org"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") submit() }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !name.trim()}>
            {busy ? <HugeiconsIcon icon={Loading03Icon} className="animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteOrgDialog({
  open,
  onOpenChange,
  org,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  org: OrgMembership
  onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await authFetch(`/api/v1/organizations/${org.org_id}`, { method: "DELETE" })
      toast.success("Organization deleted")
      onOpenChange(false)
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to delete organization")
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${org.name}?`}
      description="This permanently deletes the organization and all of its data — traces, evaluations, prompts, datasets, and API keys. This cannot be undone."
      confirmWord={org.name}
      confirmLabel="Delete organization"
      destructive
      busy={busy}
      error={error}
      onConfirm={confirm}
    />
  )
}

/* ── Members ───────────────────────────────────────────────────────────────── */

function MembersSection({
  members,
  yourRole,
  canManage,
  currentOrgId,
  currentUserId,
  onReload,
  onOrgsChanged,
}: {
  members: OrgMember[] | null
  yourRole: OrgRole
  canManage: boolean
  currentOrgId: string | null
  currentUserId: string | null
  onReload: () => void
  onOrgsChanged: () => void
}) {
  const [pending, setPending] = useState<string | null>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<OrgMember | null>(null)

  async function changeRole(m: OrgMember, role: OrgRole) {
    if (!currentOrgId) return
    setPending(m.user_id)
    try {
      await authFetch(`/api/v1/organizations/${currentOrgId}/members/${m.user_id}`, {
        method: "PATCH",
        body: { role },
      })
      toast.success(`${m.name} is now ${role}`)
      onReload()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to change role")
    } finally {
      setPending(null)
    }
  }

  const isOwner = yourRole === "owner"

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={UserMultiple02Icon} size={16} />
          <div>
            <CardTitle className="text-base">Members</CardTitle>
            <CardDescription>People with access to this organization.</CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onReload}>
          <HugeiconsIcon icon={RefreshIcon} size={14} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {!members ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : (
                members.map((m) => (
                  <tr key={m.user_id} className="bg-background">
                    <td className="px-4 py-3 font-medium">
                      {m.name}{m.is_you && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={m.role} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(m.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {m.is_you && !isOwner ? (
                        <Button variant="outline" size="sm" onClick={() => setLeaveOpen(true)}>
                          Leave
                        </Button>
                      ) : canManage && !isOwner ? (
                        pending === m.user_id ? (
                          <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin text-muted-foreground" />
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">Manage</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Set role</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {(["member", "admin"] as OrgRole[])
                                .filter((r) => r !== m.role)
                                .map((r) => (
                                  <DropdownMenuItem key={r} onSelect={() => changeRole(m, r)}>
                                    Make {r}
                                  </DropdownMenuItem>
                                ))}
                              {isOwner && m.role !== "owner" && (
                                <DropdownMenuItem onSelect={() => changeRole(m, "owner")}>
                                  Transfer ownership
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => setRemoveTarget(m)}
                              >
                                Remove from organization
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      <LeaveOrgDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        orgId={currentOrgId}
        userId={currentUserId}
        onDone={() => { onReload(); onOrgsChanged() }}
      />
      <RemoveMemberDialog
        member={removeTarget}
        onOpenChange={(v) => { if (!v) setRemoveTarget(null) }}
        orgId={currentOrgId}
        onDone={onReload}
      />
    </Card>
  )
}

function LeaveOrgDialog({
  open,
  onOpenChange,
  orgId,
  userId,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  orgId: string | null
  userId: string | null
  onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!orgId || !userId) return
    setBusy(true)
    setError(null)
    try {
      await authFetch(`/api/v1/organizations/${orgId}/members/${userId}`, { method: "DELETE" })
      toast.success("You left the organization")
      onOpenChange(false)
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to leave organization")
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Leave this organization?"
      description="You'll lose access to its data until you're invited back."
      confirmLabel="Leave"
      destructive
      busy={busy}
      error={error}
      onConfirm={confirm}
    />
  )
}

function RemoveMemberDialog({
  member,
  onOpenChange,
  orgId,
  onDone,
}: {
  member: OrgMember | null
  onOpenChange: (v: boolean) => void
  orgId: string | null
  onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!orgId || !member) return
    setBusy(true)
    setError(null)
    try {
      await authFetch(`/api/v1/organizations/${orgId}/members/${member.user_id}`, { method: "DELETE" })
      toast.success(`Removed ${member.name}`)
      onOpenChange(false)
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to remove member")
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfirmDialog
      open={member !== null}
      onOpenChange={onOpenChange}
      title={member ? `Remove ${member.name}?` : "Remove member?"}
      description="They'll immediately lose access to this organization."
      confirmLabel="Remove"
      destructive
      busy={busy}
      error={error}
      onConfirm={confirm}
    />
  )
}

/* ── Invitations ───────────────────────────────────────────────────────────── */

function InvitationsSection({
  orgId,
  invites,
  onReload,
}: {
  orgId: string
  invites: OrgInvitation[]
  onReload: () => void
}) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<OrgRole>("member")
  const [busy, setBusy] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  async function invite() {
    if (!email.trim()) return
    setBusy(true)
    try {
      await authFetch(`/api/v1/organizations/${orgId}/invitations`, {
        method: "POST",
        body: { email: email.trim(), role },
      })
      toast.success(`Invitation sent to ${email.trim()}`)
      setEmail("")
      setRole("member")
      onReload()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to send invitation")
    } finally {
      setBusy(false)
    }
  }

  async function revoke(id: string) {
    setRevoking(id)
    try {
      await authFetch(`/api/v1/organizations/${orgId}/invitations/${id}`, { method: "DELETE" })
      toast.success("Invitation revoked")
      onReload()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to revoke")
    } finally {
      setRevoking(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Mail01Icon} size={16} />
          <div>
            <CardTitle className="text-base">Invite teammates</CardTitle>
            <CardDescription>They&apos;ll receive an email with a link to join.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              onKeyDown={(e) => { if (e.key === "Enter") invite() }}
            />
          </div>
          <div className="w-full sm:w-40">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={invite} disabled={busy || !email.trim()}>
            {busy ? <HugeiconsIcon icon={Loading03Icon} className="animate-spin" /> : "Send invite"}
          </Button>
        </div>

        {invites.length > 0 && (
          <div className="grid gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
              Pending invitations
            </p>
            {invites.map((inv) => (
              <div
                key={inv.invite_id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <span className="truncate text-sm font-medium">{inv.email}</span>
                  <p className="text-xs text-muted-foreground">
                    <span className="capitalize">{inv.role}</span> · invited {fmtDate(inv.created_at)}
                    {" · "}expires {fmtDate(inv.expires_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revoking === inv.invite_id}
                  onClick={() => revoke(inv.invite_id)}
                >
                  {revoking === inv.invite_id ? (
                    <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
                  ) : "Revoke"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UserManagement
