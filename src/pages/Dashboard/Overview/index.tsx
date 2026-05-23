import { Building01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAppSelector } from "@/store/hooks"
import { UpgradePlanButton } from "@/components/UpgradePlanButton"
import { CacheStatsCard } from "./CacheStatsCard"
import { UsageCard } from "./UsageCard"
import { SpendingChartCard } from "./SpendingChartCard"

function Overview() {
  const { user, organization } = useAppSelector((s) => s.auth)
  if (!user || !organization) return null

  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Welcome back, {user.name.split(" ")[0]}.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Drop the SDK into your pipeline and traces will start streaming here in seconds.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Building01Icon} size={16} />
              <CardTitle className="text-base">Organization</CardTitle>
            </div>
            <CardDescription>{organization.name}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Plan</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {user.user_type}
                </span>
                <UpgradePlanButton current={user.user_type} />
              </div>
            </div>
            <Row label="Email" value={user.email} />
            <Row
              label="API keys"
              value={`${organization.api_key_usage} / ${organization.api_key_limit}`}
            />
          </CardContent>
        </Card>

        <UsageCard />

        <CacheStatsCard />
      </div>

      
      <div className="mt-4 grid grid-cols-1">
        <SpendingChartCard />
      </div>

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

export default Overview
