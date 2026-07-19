"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Activity01Icon,
  AiSecurity02Icon,
  Alert02Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { PageHeading } from "./_docComponents"

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EEF3FD] dark:bg-[#1A2A4A]/50 text-[12px] font-semibold text-[#1860D3] dark:text-[#6FA8FF]">
        {n}
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function Field({ name, badge, children }: { name: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
      <div>
        <p className="font-mono text-sm text-foreground">
          {name}
          {badge && <Badge variant="outline" className="ml-2">{badge}</Badge>}
        </p>
        <p className="mt-1 text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}

export default function AlertsPage() {
  return (
    <div className="space-y-4">
      <PageHeading
        icon={Alert02Icon}
        title="Alerts"
        description="Push eval regressions and security events straight to Slack. Alerts are configured in the dashboard (no SDK code or redeploy required) and fire off the same evaluation and security scans already running on your traces."
      />

      <p className="text-muted-foreground leading-relaxed">
        Open <span className="font-medium text-foreground">Dashboard → Alerts</span> (right under Overview). Everything is
        keyed to a single Slack <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer" className="text-[#1860D3] underline-offset-2 hover:underline dark:text-[#6FA8FF]">Incoming Webhook</a>;
        Fluiq posts to that channel server-side, so there is no bot to install and your webhook URL never reaches the browser of anyone but you.
      </p>

      {/* ── Setup ── */}
      <h2 className="mt-6 font-heading text-xl font-semibold tracking-tight">Setup</h2>
      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-5">
        <Step n={1} title="Create a Slack Incoming Webhook">
          In Slack, go to <span className="font-mono text-foreground">Apps → Incoming Webhooks → Add to Slack</span>, choose
          a channel, and copy the <code className="font-mono text-foreground">https://hooks.slack.com/services/…</code> URL.
        </Step>
        <Step n={2} title="Paste it into Fluiq">
          On the Alerts page, paste the URL under <span className="font-medium text-foreground">Slack destination</span> and
          click <span className="font-medium text-foreground">Send test</span> to confirm a message lands in the channel.
        </Step>
        <Step n={3} title="Turn on the alerts you want">
          Toggle <span className="font-medium text-foreground">Eval alerts</span> and/or{" "}
          <span className="font-medium text-foreground">Security alerts</span>, set the thresholds below, and{" "}
          <span className="font-medium text-foreground">Save</span>. Changes apply within ~60 seconds.
        </Step>
      </div>

      {/* ── Eval alerts ── */}
      <div className="mt-6 flex items-center gap-2.5">
        <HugeiconsIcon icon={Activity01Icon} size={18} className="text-[#1860D3] dark:text-[#6FA8FF]" />
        <h2 className="font-heading text-xl font-semibold tracking-tight">Eval alerts</h2>
        <Badge variant="outline">Team+ required</Badge>
      </div>
      <p className="text-muted-foreground leading-relaxed">
        Fired from the LLM-as-judge scores produced by <code className="font-mono text-foreground">fluiq.eval()</code> and
        auto-evaluation. Two independent triggers:
      </p>
      <div className="grid gap-3 text-sm">
        <Field name="score_below">
          Alert the moment any watched metric scores below this value (0 to 1). Watched metrics:{" "}
          <code className="font-mono text-foreground">faithfulness</code>,{" "}
          <code className="font-mono text-foreground">answer_relevancy</code>,{" "}
          <code className="font-mono text-foreground">context_precision</code>,{" "}
          <code className="font-mono text-foreground">hallucination</code>,{" "}
          <code className="font-mono text-foreground">toxicity</code>. Leave the metric list empty to watch all of them.
        </Field>
        <Field name="failure_rate_above">
          Alert when the share of failing evals for a metric exceeds this percentage over a rolling window of recent
          evaluations. Debounced (at most one failure-rate alert per metric every 10 minutes) so a sustained regression
          pings you once, not on every trace.
        </Field>
      </div>

      {/* ── Security alerts ── */}
      <div className="mt-6 flex items-center gap-2.5">
        <HugeiconsIcon icon={AiSecurity02Icon} size={18} className="text-[#1860D3] dark:text-[#6FA8FF]" />
        <h2 className="font-heading text-xl font-semibold tracking-tight">Security alerts</h2>
        <Badge variant="outline">Growth+ required</Badge>
      </div>
      <p className="text-muted-foreground leading-relaxed">
        Fired from the post-call scan behind <code className="font-mono text-foreground">fluiq.secure()</code> whenever a
        prompt or response is flagged or blocked.
      </p>
      <div className="grid gap-3 text-sm">
        <Field name="alert_on">
          Which risk levels page you: any combination of <code className="font-mono text-foreground">low</code>,{" "}
          <code className="font-mono text-foreground">medium</code>, <code className="font-mono text-foreground">high</code>.
        </Field>
        <Field name="categories">
          Restrict alerts to specific attack types: <code className="font-mono text-foreground">prompt_injection</code>,{" "}
          <code className="font-mono text-foreground">jailbreak</code>, <code className="font-mono text-foreground">pii_detected</code>,{" "}
          <code className="font-mono text-foreground">secrets_detected</code>,{" "}
          <code className="font-mono text-foreground">indirect_injection</code>. Leave empty to alert on every detected category.
        </Field>
        <Field name="blocked_only">
          When on, only hard blocks page you; warn-only detections are skipped. Turn it off to be notified on every flagged event.
        </Field>
      </div>

      {/* ── Delivery ── */}
      <h2 className="mt-6 font-heading text-xl font-semibold tracking-tight">Delivery</h2>
      <div className="grid gap-3 text-sm">
        <Field name="digest">
          <code className="font-mono text-foreground">realtime</code> sends one Slack message per event (default).{" "}
          <code className="font-mono text-foreground">hourly</code> and <code className="font-mono text-foreground">daily</code>{" "}
          batch events into a single digest so a noisy window doesn&apos;t flood your channel.
        </Field>
      </div>

      {/* ── How it works / cost ── */}
      <h2 className="mt-6 font-heading text-xl font-semibold tracking-tight">How it works &amp; cost</h2>
      <p className="text-muted-foreground leading-relaxed">
        Alerts read the eval and security results Fluiq already computes for your traces; there is no extra scan and no
        added latency on your LLM calls. Delivery uses Slack Incoming Webhooks, which are free. Eval alerts are included on
        Team and above; security alerts on Growth and above. There is no per-alert or metered charge.
      </p>
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
        <HugeiconsIcon icon={Alert02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
        <p className="text-muted-foreground">
          Alert delivery fails open: a webhook outage, a malformed payload, or a plan change never interrupts trace
          processing; a missed alert is logged and dropped, never retried into a backlog.
        </p>
      </div>
    </div>
  )
}
