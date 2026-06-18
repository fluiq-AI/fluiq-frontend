import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Building01Icon,
  ChartLineData01Icon,
  RocketIcon,
  SparklesIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"

interface PlatformStats {
  total_users: number
  total_orgs: number
  users_by_type: Record<string, number>
}

const PLAN_META: Record<string, { icon: typeof RocketIcon; label: string }> = {
  Free: { icon: RocketIcon, label: "Free" },
  Team: { icon: RocketIcon, label: "Team" },
  Growth: { icon: ChartLineData01Icon, label: "Growth" },
  Enterprise: { icon: Building01Icon, label: "Enterprise" },
}

function AdminOverview() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch<PlatformStats>("/admin/stats")
        if (!cancelled) setStats(res)
      } catch (err) {
        if (!cancelled)
          setError(err instanceof ApiError ? err.detail : "Failed to load stats")
      }
    })()
    return () => { cancelled = true }
  }, [])

  const totalUsers = stats?.total_users ?? 0

  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Platform Overview
        </h1>
        <p className="mt-2 text-muted-foreground">
          Live snapshot of users and organizations across Fluiq.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !stats ? (
        <p className="text-sm text-muted-foreground">{"Loading…"}</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              icon={UserIcon}
              label="Total Users"
              value={stats.total_users.toLocaleString()}
            />
            <StatCard
              icon={Building01Icon}
              label="Organizations"
              value={stats.total_orgs.toLocaleString()}
            />
            <StatCard
              icon={SparklesIcon}
              label="Paid Subscriptions"
              value={(
                (stats.users_by_type["Team"] ?? 0) +
                (stats.users_by_type["Growth"] ?? 0) +
                (stats.users_by_type["Enterprise"] ?? 0)
              ).toLocaleString()}
            />
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plan Distribution</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {Object.entries(PLAN_META).map(([plan, meta]) => {
                  const count = stats.users_by_type[plan] ?? 0
                  const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
                  return (
                    <div key={plan} className="grid gap-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <HugeiconsIcon icon={meta.icon} size={14} className="text-muted-foreground" />
                          <span className="font-medium">{meta.label}</span>
                        </span>
                        <span className="text-muted-foreground">
                          {count.toLocaleString()} users ({pct}%)
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: typeof UserIcon
  label: string
  value: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <HugeiconsIcon icon={icon} size={15} className="text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

export default AdminOverview
