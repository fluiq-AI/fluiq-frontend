import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Building01Icon,
  ChartLineData01Icon,
  RocketIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"

interface PlatformStats {
  total_users: number
  total_orgs: number
  users_by_type: Record<string, number>
}

const PLAN_META = [
  {
    plan: "Free",
    icon: RocketIcon,
    description: "Unlimited traces (14-day) · 1K evals · 1 API key",
  },
  {
    plan: "Team",
    icon: RocketIcon,
    description: "Unlimited traces · 10K evals · 5 API keys",
  },
  {
    plan: "Growth",
    icon: ChartLineData01Icon,
    description: "Unlimited traces · 100K evals · 15 API keys",
  },
  {
    plan: "Enterprise",
    icon: Building01Icon,
    description: "Unlimited traces · Unlimited evals · 50 API keys",
  },
] as const

function AdminPlans() {
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
          setError(err instanceof ApiError ? err.detail : "Failed to load plan data")
      }
    })()
    return () => { cancelled = true }
  }, [])

  const totalUsers = stats?.total_users ?? 0
  const paidUsers =
    (stats?.users_by_type["Team"] ?? 0) +
    (stats?.users_by_type["Growth"] ?? 0) +
    (stats?.users_by_type["Enterprise"] ?? 0)

  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Plans
        </h1>
        <p className="mt-2 text-muted-foreground">
          User distribution across billing tiers.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !stats ? (
        <p className="text-sm text-muted-foreground">{"Loading…"}</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-3">
            <SummaryBadge
              label="Total users"
              value={totalUsers.toLocaleString()}
              icon={SparklesIcon}
            />
            <SummaryBadge
              label="Paid"
              value={paidUsers.toLocaleString()}
              icon={ChartLineData01Icon}
            />
            <SummaryBadge
              label="Free"
              value={(stats.users_by_type["Free"] ?? 0).toLocaleString()}
              icon={RocketIcon}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {PLAN_META.map(({ plan, icon, description }) => {
              const count = stats.users_by_type[plan] ?? 0
              const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
              return (
                <Card key={plan}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={icon} size={16} className="text-muted-foreground" />
                        <CardTitle className="text-base">{plan}</CardTitle>
                      </div>
                      <Badge variant="outline">{count.toLocaleString()} users</Badge>
                    </div>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span>{pct}% of all users</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

function SummaryBadge({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: typeof RocketIcon
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-4 py-2 text-sm">
      <HugeiconsIcon icon={icon} size={14} className="text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

export default AdminPlans
