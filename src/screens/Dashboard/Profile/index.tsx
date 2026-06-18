import { useState } from "react"
import { useNavigate } from "react-router"
import { UserCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { UpgradePlanButton } from "@/components/UpgradePlanButton"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { deleteAccountThunk } from "@/store/auth/slice"

function Profile() {
  const { user } = useAppSelector((s) => s.auth)
  if (!user) return null

  return (
    <>
      <DashboardPageHeader
        title="Profile"
        description="Your account details and preferences."
      />
      <div className="px-6 py-6">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={UserCircleIcon} size={16} />
              <CardTitle className="text-base">Account</CardTitle>
            </div>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Row label="Name" value={user.name} />
            <Row label="Email" value={user.email} />
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Plan</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {user.user_type}
                </span>
                <UpgradePlanButton current={user.user_type} />
              </div>
            </div>
          </CardContent>
        </Card>

        <DangerZone />
      </div>
      </div>
    </>
  )
}

function DangerZone() {
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          Irreversible actions that permanently affect your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Delete account</p>
            <p className="text-xs text-muted-foreground">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
          <DeleteAccountDialog />
        </div>
      </CardContent>
    </Card>
  )
}

function DeleteAccountDialog() {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const result = await dispatch(deleteAccountThunk({ reason: reason.trim() || undefined }))
    if (deleteAccountThunk.fulfilled.match(result)) {
      navigate("/login", { replace: true })
    } else {
      setError(
        typeof result.payload === "string"
          ? result.payload
          : "Something went wrong. Please try again.",
      )
      setLoading(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setReason("")
      setError(null)
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="shrink-0">
          Delete account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This will permanently delete your account, API keys, traces, evaluations, and all
            other data. This action is <strong>irreversible</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 flex flex-col gap-3">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            All your data will be erased immediately from our systems. There is no recovery option.
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-reason">
              Why are you leaving?{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="delete-reason"
              placeholder="Tell us what we could have done better…"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting…" : "Yes, delete my account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

export default Profile
