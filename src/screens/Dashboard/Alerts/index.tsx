import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Activity01Icon,
  AiSecurity02Icon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  FloppyDiskIcon,
  Loading03Icon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { UpgradePlanButton } from "@/components/UpgradePlanButton"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { useAppSelector } from "@/store/hooks"
import type { UserType } from "@/lib/auth-types"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface EvalAlertConfig {
  enabled:             boolean
  metrics:             string[]   // which eval metrics to watch
  score_below:         number     // 0–1, alert when avg score drops below
  failure_rate_above:  number     // 0–100, alert when % of failing evals exceeds
}

interface SecurityAlertConfig {
  enabled:        boolean
  alert_on:       string[]   // risk levels
  categories:     string[]   // attack types ([] = all)
  blocked_only:   boolean     // alert only on hard blocks vs all flagged
}

interface AlertsConfig {
  slack_webhook:  string | null
  digest:         "realtime" | "hourly" | "daily"
  eval:           EvalAlertConfig
  security:       SecurityAlertConfig
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EVAL_METRICS: { id: string; label: string }[] = [
  { id: "faithfulness",      label: "Faithfulness" },
  { id: "answer_relevancy",  label: "Answer relevancy" },
  { id: "context_precision", label: "Context precision" },
  { id: "hallucination",     label: "Hallucination" },
  { id: "toxicity",          label: "Toxicity" },
]

const SECURITY_CATEGORIES: { id: string; label: string }[] = [
  { id: "prompt_injection",       label: "Prompt injection" },
  { id: "jailbreak",              label: "Jailbreak" },
  { id: "skeleton_key",           label: "Skeleton key" },
  { id: "semantic_attack",        label: "Semantic attack" },
  { id: "pii_detected",           label: "PII" },
  { id: "secrets_detected",       label: "Secrets / keys" },
  { id: "indirect_injection",     label: "Indirect injection" },
  { id: "rag_poisoning",          label: "RAG poisoning" },
  { id: "tool_exfiltration",      label: "Tool exfiltration" },
  { id: "tool_policy_violation",  label: "Tool allowlist violation" },
  { id: "cross_agent_injection",  label: "Cross-agent injection" },
]

const RISK_LEVELS = ["low", "medium", "high"]

const DEFAULT_CONFIG: AlertsConfig = {
  slack_webhook: null,
  digest:        "realtime",
  eval: {
    enabled:            false,
    metrics:            ["faithfulness", "hallucination"],
    score_below:        0.7,
    failure_rate_above: 10,
  },
  security: {
    enabled:      false,
    alert_on:     ["high"],
    categories:   [],
    blocked_only: true,
  },
}

// Plan gating — mirrors the pricing page. Eval alerts ship on Team+,
// security alerts on Growth+ (they piggy-back on fluiq.secure()).
const TIER_RANK: Record<UserType, number> = {
  Free: 0, Team: 1, Growth: 2, Enterprise: 3, Admin: 3,
}

// ── Small switch (no shared component yet) ──────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-[#1860D3] dark:bg-[#6FA8FF]" : "bg-muted-foreground/25",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  )
}

function LockedBanner({ feature, required, current }: { feature: string; required: string; current: UserType }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <div className="flex items-start gap-2.5">
        <HugeiconsIcon icon={Alert02Icon} size={16} className="mt-0.5 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-medium text-foreground">{feature} is a {required} feature</p>
          <p className="text-xs text-muted-foreground">Upgrade your plan to configure and receive these alerts.</p>
        </div>
      </div>
      <UpgradePlanButton current={current} />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Alerts() {
  const { user } = useAppSelector((s) => s.auth)
  const [config, setConfig]   = useState<AlertsConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [testing, setTesting] = useState(false)
  const [testOk, setTestOk]   = useState<null | boolean>(null)
  const [error, setError]     = useState<string | null>(null)
  const [saved, setSaved]     = useState(false)

  const tier = user?.user_type ?? "Free"
  const evalUnlocked     = TIER_RANK[tier] >= TIER_RANK.Team
  const securityUnlocked = TIER_RANK[tier] >= TIER_RANK.Growth

  // Load saved config on mount. Falls back to defaults if the endpoint is
  // not wired yet, so the page is always usable.
  useEffect(() => {
    let cancelled = false
    authFetch<AlertsConfig>("/api/v1/alerts")
      .then((data) => { if (!cancelled) setConfig({ ...DEFAULT_CONFIG, ...data, eval: { ...DEFAULT_CONFIG.eval, ...data.eval }, security: { ...DEFAULT_CONFIG.security, ...data.security } }) })
      .catch(() => { /* no config yet — keep defaults */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  function patchEval(p: Partial<EvalAlertConfig>) {
    setConfig((c) => ({ ...c, eval: { ...c.eval, ...p } }))
  }
  function patchSecurity(p: Partial<SecurityAlertConfig>) {
    setConfig((c) => ({ ...c, security: { ...c.security, ...p } }))
  }
  function toggleIn(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const result = await authFetch<AlertsConfig>("/api/v1/alerts", { method: "PUT", body: config })
      setConfig((c) => ({ ...c, ...result }))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save alert settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleTestSlack() {
    if (!config.slack_webhook) return
    setTesting(true)
    setTestOk(null)
    try {
      await authFetch("/api/v1/alerts/test", { method: "POST", body: { slack_webhook: config.slack_webhook } })
      setTestOk(true)
    } catch {
      setTestOk(false)
    } finally {
      setTesting(false)
      setTimeout(() => setTestOk(null), 4000)
    }
  }

  return (
    <>
      <DashboardPageHeader
        title="Alerts"
        description="Send eval regressions and security events to Slack."
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
            Loading…
          </div>
        ) : (
          <>
            {/* ── Slack destination ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Slack destination</CardTitle>
                <CardDescription>
                  Paste an{" "}
                  <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer" className="text-[#1860D3] underline-offset-2 hover:underline dark:text-[#6FA8FF]">
                    Incoming Webhook URL
                  </a>{" "}
                  from your Slack workspace. Fluiq posts alerts straight to that channel — no bot install required.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
                    value={config.slack_webhook ?? ""}
                    onChange={(e) => setConfig((c) => ({ ...c, slack_webhook: e.target.value || null }))}
                    className="flex-1 rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring"
                  />
                  <Button variant="outline" size="sm" onClick={handleTestSlack} disabled={!config.slack_webhook || testing}>
                    <HugeiconsIcon icon={testing ? Loading03Icon : TestTube01Icon} size={13} className={testing ? "animate-spin" : undefined} />
                    Send test
                  </Button>
                </div>
                {testOk === true && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} /> Test message sent — check your channel.
                  </p>
                )}
                {testOk === false && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <HugeiconsIcon icon={Alert02Icon} size={13} /> Couldn’t deliver. Double-check the webhook URL.
                  </p>
                )}
                <div className="grid gap-3 sm:max-w-xs">
                  <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Delivery</label>
                  <Select value={config.digest} onValueChange={(v) => setConfig((c) => ({ ...c, digest: v as AlertsConfig["digest"] }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time — one message per event</SelectItem>
                      <SelectItem value="hourly">Hourly digest — batched summary</SelectItem>
                      <SelectItem value="daily">Daily digest — once a day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* ── Eval alerts ── */}
            <Card className={!evalUnlocked ? "opacity-95" : undefined}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <HugeiconsIcon icon={Activity01Icon} size={18} className="mt-0.5 text-[#1860D3] dark:text-[#6FA8FF]" />
                    <div>
                      <CardTitle className="text-base">Eval alerts</CardTitle>
                      <CardDescription>Get pinged when evaluation quality regresses on your live traces.</CardDescription>
                    </div>
                  </div>
                  {evalUnlocked && (
                    <Toggle checked={config.eval.enabled} onChange={(v) => patchEval({ enabled: v })} />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {!evalUnlocked ? (
                  <LockedBanner feature="Eval alerts" required="Team" current={tier} />
                ) : (
                  <fieldset disabled={!config.eval.enabled} className={cn("space-y-5 transition-opacity", !config.eval.enabled && "opacity-50")}>
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Watch these metrics</label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {EVAL_METRICS.map((m) => {
                          const checked = config.eval.metrics.includes(m.id)
                          return (
                            <label key={m.id} className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm transition-colors", checked ? "border-[#1860D3]/30 bg-[#1860D3]/5 dark:border-[#6FA8FF]/30 dark:bg-[#6FA8FF]/5" : "border-border/60 hover:bg-muted/40")}>
                              <Checkbox checked={checked} onCheckedChange={() => patchEval({ metrics: toggleIn(config.eval.metrics, m.id) })} />
                              {m.label}
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Alert when avg score drops below
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range" min={0} max={1} step={0.05}
                            value={config.eval.score_below}
                            onChange={(e) => patchEval({ score_below: Number(e.target.value) })}
                            className="flex-1 accent-[#1860D3] dark:accent-[#6FA8FF]"
                          />
                          <span className="w-10 text-right font-mono text-sm tabular-nums text-foreground">{config.eval.score_below.toFixed(2)}</span>
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Alert when failure rate exceeds
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range" min={0} max={100} step={5}
                            value={config.eval.failure_rate_above}
                            onChange={(e) => patchEval({ failure_rate_above: Number(e.target.value) })}
                            className="flex-1 accent-[#1860D3] dark:accent-[#6FA8FF]"
                          />
                          <span className="w-10 text-right font-mono text-sm tabular-nums text-foreground">{config.eval.failure_rate_above}%</span>
                        </div>
                      </div>
                    </div>
                  </fieldset>
                )}
              </CardContent>
            </Card>

            {/* ── Security alerts ── */}
            <Card className={!securityUnlocked ? "opacity-95" : undefined}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <HugeiconsIcon icon={AiSecurity02Icon} size={18} className="mt-0.5 text-[#1860D3] dark:text-[#6FA8FF]" />
                    <div>
                      <CardTitle className="text-base">Security alerts</CardTitle>
                      <CardDescription>Get notified when fluiq.secure() flags or blocks a prompt or response.</CardDescription>
                    </div>
                  </div>
                  {securityUnlocked && (
                    <Toggle checked={config.security.enabled} onChange={(v) => patchSecurity({ enabled: v })} />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {!securityUnlocked ? (
                  <LockedBanner feature="Security alerts" required="Growth" current={tier} />
                ) : (
                  <fieldset disabled={!config.security.enabled} className={cn("space-y-5 transition-opacity", !config.security.enabled && "opacity-50")}>
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Alert on risk levels</label>
                      <div className="flex gap-3">
                        {RISK_LEVELS.map((level) => (
                          <label key={level} className="flex cursor-pointer items-center gap-1.5 text-sm">
                            <Checkbox checked={config.security.alert_on.includes(level)} onCheckedChange={() => patchSecurity({ alert_on: toggleIn(config.security.alert_on, level) })} />
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Attack categories</label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {SECURITY_CATEGORIES.map((cat) => {
                          const checked = config.security.categories.includes(cat.id)
                          return (
                            <label key={cat.id} className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm transition-colors", checked ? "border-[#1860D3]/30 bg-[#1860D3]/5 dark:border-[#6FA8FF]/30 dark:bg-[#6FA8FF]/5" : "border-border/60 hover:bg-muted/40")}>
                              <Checkbox checked={checked} onCheckedChange={() => patchSecurity({ categories: toggleIn(config.security.categories, cat.id) })} />
                              {cat.label}
                            </label>
                          )
                        })}
                      </div>
                      {config.security.categories.length === 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">None selected — alert on every detected attack type.</p>
                      )}
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40">
                      <Checkbox checked={config.security.blocked_only} onCheckedChange={(v) => patchSecurity({ blocked_only: Boolean(v) })} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Blocked events only</p>
                        <p className="text-xs text-muted-foreground">Skip warn-only detections; alert just when a request is actually blocked.</p>
                      </div>
                    </label>
                  </fieldset>
                )}
              </CardContent>
            </Card>

            {/* ── Save bar ── */}
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-4 py-3">
              <p className="text-xs text-muted-foreground">Changes apply within ~60 seconds.</p>
              <div className="flex items-center gap-2">
                {saved && <span className="text-xs font-medium text-emerald-600">Saved</span>}
                <Button onClick={handleSave} disabled={saving}>
                  <HugeiconsIcon icon={saving ? Loading03Icon : FloppyDiskIcon} size={14} className={saving ? "animate-spin" : undefined} />
                  {saving ? "Saving…" : "Save alerts"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
