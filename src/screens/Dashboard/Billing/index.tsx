import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  CreditCardIcon,
  InvoiceIcon,
  JusticeScale01Icon,
  Loading03Icon,
  ShieldKeyIcon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { UpgradePlanButton } from "@/components/UpgradePlanButton"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { useAppSelector } from "@/store/hooks"

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuotaCounter {
  used: number
  /** null means the tier is unlimited on this axis. */
  limit: number | null
}

interface QuotaResponse {
  tier: string
  traces: QuotaCounter
  evaluations: QuotaCounter
  security_scans: QuotaCounter
  retention_days: number | null
  trial_ends_at: string | null
}

interface JudgeUsageResponse {
  window_days: number
  input_tokens: number
  output_tokens: number
  judge_calls: number
  eval_runs: number
  by_evaluator: {
    evaluator: string
    input_tokens: number
    output_tokens: number
    judge_calls: number
    eval_runs: number
  }[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Monthly subscription per plan, mirroring the public pricing page. Kept here
 * as a display value only. Nothing charges against it, because there is no
 * payment processor wired up yet.
 */
const PLAN_PRICE: Record<string, string> = {
  Free: "$0",
  Starter: "$29",
  Team: "$149",
  Growth: "$499",
  Enterprise: "Custom",
}

const PLAN_BLURB: Record<string, string> = {
  Free: "Unlimited tracing, 14-day retention.",
  Starter: "Unlimited retention, bring your own provider keys.",
  Team: "SSO, larger allowances, dataset batch runs.",
  Growth: "High-volume allowances and priority support.",
  Enterprise: "VPC, SAML/SCIM, custom SLA.",
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`
  return n.toLocaleString()
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}

// ── Meter ─────────────────────────────────────────────────────────────────────

function Meter({
  icon,
  label,
  counter,
  hint,
}: {
  icon: typeof ShieldKeyIcon
  label: string
  counter: QuotaCounter
  hint?: string
}) {
  const limit = counter.limit
  const unlimited = limit === null
  const pct =
    limit === null || limit === 0
      ? 0
      : Math.min(100, Math.round((counter.used / limit) * 100))
  // Surfaced before the wall, not at it: hitting an allowance mid-month is a
  // thing you want warning about, not a thing you want to discover.
  const nearLimit = !unlimited && pct >= 80

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <HugeiconsIcon icon={icon} size={14} />
          {label}
        </span>
        <span className="font-mono text-xs text-foreground">
          {formatNumber(counter.used)}
          <span className="text-muted-foreground">
            {limit === null ? " / Unlimited" : ` / ${formatNumber(limit)}`}
          </span>
        </span>
      </div>
      {!unlimited && <Progress value={pct} />}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {nearLimit && (
        <p className="flex items-center gap-1.5 text-[11px] text-destructive">
          <HugeiconsIcon icon={Alert02Icon} size={11} />
          {pct >= 100
            ? "Allowance used for this month."
            : `${100 - pct}% of this month's allowance left.`}
        </p>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Billing() {
  const { user } = useAppSelector((s) => s.auth)
  const [quota, setQuota] = useState<QuotaResponse | null>(null)
  const [usage, setUsage] = useState<JudgeUsageResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [q, u] = await Promise.all([
          authFetch<QuotaResponse>("/api/v1/quota"),
          authFetch<JudgeUsageResponse>("/api/v1/quota/judge-usage?days=30"),
        ])
        if (!cancelled) {
          setQuota(q)
          setUsage(u)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load billing details")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const tier = quota?.tier ?? user?.user_type ?? "Free"
  const trialDays = daysLeft(quota?.trial_ends_at ?? null)
  const judgeTokens = usage ? usage.input_tokens + usage.output_tokens : 0

  return (
    <>
      <DashboardPageHeader
        title="Billing & Payments"
        description="Your plan, and what you have used against it this month."
      />

      <div className="space-y-5 px-6 py-6">
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <HugeiconsIcon icon={Alert02Icon} size={14} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
            {"Loading…"}
          </div>
        ) : (
          <>
            {/* ── Current plan ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <HugeiconsIcon icon={InvoiceIcon} size={16} />
                    Current plan
                  </CardTitle>
                  {trialDays !== null && (
                    <Badge
                      variant="outline"
                      className="border-primary/40 bg-primary/10 text-foreground"
                    >
                      Trial · {trialDays} day{trialDays === 1 ? "" : "s"} left
                    </Badge>
                  )}
                </div>
                <CardDescription>{PLAN_BLURB[tier] ?? ""}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-2xl font-semibold text-foreground">{tier}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {PLAN_PRICE[tier] ?? "—"}
                      {PLAN_PRICE[tier] && PLAN_PRICE[tier] !== "Custom" ? " / month" : ""}
                      {quota?.retention_days === null
                        ? " · unlimited retention"
                        : quota?.retention_days
                          ? ` · ${quota.retention_days}-day retention`
                          : ""}
                    </p>
                  </div>
                  {user && <UpgradePlanButton current={user.user_type} />}
                </div>
              </CardContent>
            </Card>

            {/* ── Usage this month ── */}
            <Card>
              <CardHeader>
                <CardTitle>This month</CardTitle>
                <CardDescription>
                  Allowances reset on the first of each calendar month.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {quota && (
                  <>
                    <Meter
                      icon={JusticeScale01Icon}
                      label="Evaluations"
                      counter={quota.evaluations}
                    />
                    <Meter
                      icon={ShieldKeyIcon}
                      label="Security scans"
                      counter={quota.security_scans}
                      hint="Pattern and NER based, so it spends no judge tokens and is metered separately from evaluations."
                    />
                    <Meter
                      icon={InvoiceIcon}
                      label="Traces"
                      counter={quota.traces}
                      hint="Tracing is unlimited on every plan. Retention is what changes."
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Judge spend ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>Judge tokens</CardTitle>
                  {usage && <Badge variant="outline">{usage.window_days}d</Badge>}
                </div>
                <CardDescription>
                  What your evaluations actually spent. Cost scales with trace
                  size, jury size, and the model you picked as judge. A count of
                  evaluations shows you none of that.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!usage || judgeTokens === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No judge activity in the last {usage?.window_days ?? 30} days.
                    Evaluation is opt-in, so call{" "}
                    <code className="font-mono text-foreground">fluiq.eval()</code>{" "}
                    to start reporting.
                  </p>
                ) : (
                  <div className="grid gap-2.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Total tokens</span>
                      <span className="font-mono text-xs text-foreground">
                        {formatNumber(judgeTokens)}
                        <span className="text-muted-foreground">
                          {" "}({formatNumber(usage.input_tokens)} in /{" "}
                          {formatNumber(usage.output_tokens)} out)
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Evaluations run</span>
                      <span className="font-mono text-xs text-foreground">
                        {formatNumber(usage.eval_runs)}
                        <span className="text-muted-foreground">
                          {" "}({formatNumber(usage.judge_calls)} judge calls)
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Average per evaluation</span>
                      <span className="font-mono text-xs text-foreground">
                        {formatNumber(
                          usage.eval_runs > 0
                            ? Math.round(judgeTokens / usage.eval_runs)
                            : 0,
                        )}{" "}
                        tokens
                      </span>
                    </div>

                    {usage.by_evaluator.length > 1 && (
                      <div className="mt-1 grid gap-1.5 border-t border-border/60 pt-3">
                        {usage.by_evaluator.slice(0, 5).map((row) => (
                          <div
                            key={row.evaluator}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="truncate text-muted-foreground">
                              {row.evaluator || "—"}
                            </span>
                            <span className="shrink-0 font-mono text-foreground">
                              {formatNumber(row.input_tokens + row.output_tokens)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Payment method ── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HugeiconsIcon icon={CreditCardIcon} size={16} />
                  Payment method
                </CardTitle>
                <CardDescription>
                  Self-serve card payment is not live yet. Plans and trials are
                  activated on your account directly, and invoices are issued by
                  arrangement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border/60 bg-muted/20 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    No payment method on file.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/contact">Talk to us about billing</a>
                  </Button>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Want to reduce what evaluations cost? Save your own provider
                  key under Provider Keys and judge tokens bill to your provider
                  account instead of ours.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  )
}
