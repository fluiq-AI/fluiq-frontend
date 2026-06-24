import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Loading03Icon,
  MinusSignIcon,
  PlusSignIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
}

interface EvalAccount {
  user_id: string
  email: string
  name: string
  user_type: string
  org_id: string
  org_name: string | null
  tier: string
  eval_used: number
  eval_bonus: number
  base_eval_quota: number | null
  eval_limit: number | null
}

const QUICK_STEPS = [1_000, 10_000, 100_000] as const

function fmt(n: number) {
  return n.toLocaleString()
}

function AdminEvaluations() {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<UserAdminView[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [account, setAccount] = useState<EvalAccount | null>(null)
  const [loadingAccount, setLoadingAccount] = useState(false)
  const [amount, setAmount] = useState<string>("1000")
  const [applying, setApplying] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // Debounced user search.
  useEffect(() => {
    const q = search.trim()
    if (!q) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await authFetch<UserListResponse>(
          `/admin/users?page=1&limit=10&search=${encodeURIComponent(q)}`,
        )
        if (!cancelled) setResults(res.users)
      } catch (err) {
        if (!cancelled)
          setError(err instanceof ApiError ? err.detail : "Search failed")
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [search])

  async function loadAccount(userId: string) {
    setSelectedId(userId)
    setNotice(null)
    setError(null)
    setLoadingAccount(true)
    try {
      const res = await authFetch<EvalAccount>(`/admin/users/${userId}/evaluations`)
      setAccount(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load evaluations")
      setAccount(null)
    } finally {
      setLoadingAccount(false)
    }
  }

  async function adjust(delta: number) {
    if (!selectedId || delta === 0) return
    setApplying(true)
    setNotice(null)
    setError(null)
    try {
      const res = await authFetch<EvalAccount>(`/admin/users/${selectedId}/evaluations`, {
        method: "POST",
        body: { delta },
      })
      setAccount(res)
      setNotice(
        `${delta > 0 ? "Added" : "Removed"} ${fmt(Math.abs(delta))} evaluations. ` +
          `Bonus is now ${fmt(res.eval_bonus)}.`,
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to adjust evaluations")
    } finally {
      setApplying(false)
    }
  }

  const parsedAmount = Number.parseInt(amount, 10)
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0

  const unlimited = account?.eval_limit === null
  const usePct =
    account && account.eval_limit && account.eval_limit > 0
      ? Math.min(100, Math.round((account.eval_used / account.eval_limit) * 100))
      : 0

  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Evaluations
        </h1>
        <p className="mt-2 text-muted-foreground">
          Grant or deduct monthly evaluation allowance for any user's organization.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* Search column */}
        <div>
          <div className="relative mb-3 flex items-center">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              className="pointer-events-none absolute left-3 text-muted-foreground"
            />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-border/60">
            {searching ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                {search.trim() ? "No users found." : "Type to find a user."}
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {results.map((u) => (
                  <li key={u.user_id}>
                    <button
                      type="button"
                      onClick={() => loadAccount(u.user_id)}
                      className={`flex w-full flex-col items-start px-4 py-2.5 text-left transition-colors hover:bg-muted/40 ${
                        selectedId === u.user_id ? "bg-muted/60" : "bg-background"
                      }`}
                    >
                      <span className="text-sm font-medium">{u.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{u.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Detail column */}
        <div>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

          {!selectedId ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
              Select a user to view and adjust their evaluations.
            </div>
          ) : loadingAccount ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-border/60">
              <HugeiconsIcon icon={Loading03Icon} className="animate-spin text-muted-foreground" />
            </div>
          ) : account ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{account.name}</CardTitle>
                    <CardDescription>
                      {account.email}
                      {account.org_name ? ` · ${account.org_name}` : ""}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{account.tier}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Usage */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Evaluations this month</span>
                    <span className="font-medium">
                      {fmt(account.eval_used)}
                      {" / "}
                      {unlimited ? "Unlimited" : fmt(account.eval_limit ?? 0)}
                    </span>
                  </div>
                  {!unlimited && <Progress value={usePct} className="h-1.5" />}
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <Stat
                    label="Base quota"
                    value={account.base_eval_quota === null ? "Unlimited" : fmt(account.base_eval_quota)}
                  />
                  <Stat
                    label="Admin bonus"
                    value={`${account.eval_bonus > 0 ? "+" : ""}${fmt(account.eval_bonus)}`}
                    accent={
                      account.eval_bonus > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : account.eval_bonus < 0
                          ? "text-destructive"
                          : undefined
                    }
                  />
                  <Stat
                    label="Effective limit"
                    value={unlimited ? "Unlimited" : fmt(account.eval_limit ?? 0)}
                  />
                </div>

                {unlimited ? (
                  <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    This tier already has unlimited evaluations. The bonus is stored but has no
                    effect until the org moves to a metered tier.
                  </p>
                ) : null}

                {/* Adjust controls */}
                <div className="border-t border-border/60 pt-4">
                  <p className="mb-2 text-sm font-medium">Adjust allowance</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-32"
                      disabled={applying}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={applying || !amountValid}
                      onClick={() => adjust(parsedAmount)}
                    >
                      <HugeiconsIcon icon={applying ? Loading03Icon : PlusSignIcon} className={applying ? "animate-spin" : undefined} size={14} />
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={applying || !amountValid}
                      onClick={() => adjust(-parsedAmount)}
                    >
                      <HugeiconsIcon icon={MinusSignIcon} size={14} />
                      Subtract
                    </Button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {QUICK_STEPS.map((step) => (
                      <Button
                        key={step}
                        variant="ghost"
                        size="sm"
                        disabled={applying}
                        onClick={() => adjust(step)}
                        className="text-xs"
                      >
                        +{fmt(step)}
                      </Button>
                    ))}
                    {QUICK_STEPS.map((step) => (
                      <Button
                        key={`m${step}`}
                        variant="ghost"
                        size="sm"
                        disabled={applying}
                        onClick={() => adjust(-step)}
                        className="text-xs text-muted-foreground"
                      >
                        −{fmt(step)}
                      </Button>
                    ))}
                  </div>

                  {notice && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-semibold ${accent ?? ""}`}>{value}</p>
    </div>
  )
}

export default AdminEvaluations
