import { UserCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { UpgradePlanButton } from "@/components/UpgradePlanButton"
import { useAppSelector } from "@/store/hooks"

function Profile() {
  const { user } = useAppSelector((s) => s.auth)
  if (!user) return null

  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Profile
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your account details and preferences.
        </p>
      </div>

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
    </>
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
