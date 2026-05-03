import { Building01Icon, Key01Icon } from "@hugeicons/core-free-icons"
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

function Overview() {
  const { user, organization } = useAppSelector((s) => s.auth)
  if (!user || !organization) return null

  const apiKey = organization.api_keys[0] ?? null

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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Key01Icon} size={16} />
              <CardTitle className="text-base">API key</CardTitle>
            </div>
            <CardDescription>
              Use this key to call <code className="font-mono text-foreground">instrument()</code> from the SDK.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apiKey ? (
              <code className="block rounded-md border border-border/60 bg-muted/40 p-3 font-mono text-xs break-all">
                {apiKey.prefix}
                <span className="text-muted-foreground/60">{"\u2026"}</span>
              </code>
            ) : (
              <p className="text-sm text-muted-foreground">
                No API key yet. Create one in API Management to get started.
              </p>
            )}
          </CardContent>
        </Card>
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
