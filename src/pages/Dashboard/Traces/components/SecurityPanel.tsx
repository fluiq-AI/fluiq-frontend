import { Link } from "react-router"
import { cn } from "@/lib/utils"
import type { TraceRecord } from "../utils/types"

type RiskLevel = "clean" | "low" | "medium" | "high"

function hasSecurityData(event: Record<string, unknown>): boolean {
  return "security_risk_level" in event || event["status"] === "blocked"
}

function getRiskLevel(event: Record<string, unknown>): RiskLevel {
  const v = event["security_risk_level"] ?? event["risk_level"]
  if (v === "low" || v === "medium" || v === "high") return v
  return "clean"
}

const RISK_CONFIG: Record<
  RiskLevel,
  { dot: string; pill: string; label: string }
> = {
  clean:  { dot: "bg-muted-foreground/30", pill: "bg-muted text-muted-foreground",           label: "Clean"  },
  low:    { dot: "bg-green-500",            pill: "bg-green-500/10 text-green-700",            label: "Low"    },
  medium: { dot: "bg-yellow-500",           pill: "bg-yellow-500/10 text-yellow-700",          label: "Medium" },
  high:   { dot: "bg-red-500",              pill: "bg-red-500/10 text-red-600",                label: "High"   },
}

export function SecurityBadge({
  event,
  className,
}: {
  event: Record<string, unknown>
  className?: string
}) {
  const level = getRiskLevel(event)
  const { dot, pill, label } = RISK_CONFIG[level]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5",
        "text-[10px] font-medium uppercase tracking-wide",
        pill,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </span>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  )
}

function TagList({ tags }: { tags: string[] }) {
  if (!tags.length)
    return <span className="text-xs text-muted-foreground/60">None</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
        >
          {t}
        </span>
      ))}
    </div>
  )
}

function RedactedBlock({
  label,
  text,
}: {
  label: string
  text: string | null | undefined
}) {
  if (!text) return null
  return (
    <div className="space-y-1">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/60 p-3 text-xs leading-relaxed">
        {text}
      </pre>
    </div>
  )
}

export function SecurityPanel({ trace }: { trace: TraceRecord }) {
  const ev = trace.event

  if (!hasSecurityData(ev)) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="size-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Security scanning not enabled</p>
          <p className="text-xs text-muted-foreground">
            Add{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
              fluiq.secure()
            </code>{" "}
            to your setup to scan this trace for PII, prompt injections, and leaked secrets.
          </p>
        </div>
        <Link
          to="/documentation#security"
          className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
        >
          Learn about fluiq.secure() →
        </Link>
        <div className="w-full rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-left text-xs text-muted-foreground">
          <p className="mb-1.5 font-medium text-foreground">Quick setup</p>
          <pre className="font-mono leading-relaxed">{`from fluiq import instrument, secure

instrument(api_key="fl_...")
secure()  # Team plan required`}</pre>
        </div>
      </div>
    )
  }

  const level = getRiskLevel(ev)
  const { pill, label } = RISK_CONFIG[level]
  const score = typeof ev["security_risk_score"] === "number"
    ? (ev["security_risk_score"] as number).toFixed(2)
    : null

  const isBlocked   = ev["status"] === "blocked"
  const blockReason = ev["block_reason"] as string | null | undefined

  const attackTypes  = (ev["attack_types"]           as string[] | null) ?? []
  const piiPrompt    = (ev["pii_entities_prompt"]   as string[] | null) ?? []
  const piiResponse  = (ev["pii_entities_response"] as string[] | null) ?? []
  const injDetected  = Boolean(ev["injection_detected"])
  const injPatterns  = (ev["injection_patterns"]    as string[] | null) ?? []
  const jbDetected   = Boolean(ev["jailbreak_detected"])
  const jbPatterns   = (ev["jailbreak_patterns"]    as string[] | null) ?? []
  const skDetected   = Boolean(ev["skeleton_key_detected"])
  const skPatterns   = (ev["skeleton_key_patterns"] as string[] | null) ?? []
  const secDetected  = Boolean(ev["secrets_detected"])
  const secretTypes  = (ev["secret_types"]          as string[] | null) ?? []
  const promptRedact = ev["prompt_redacted"]   as string | null | undefined
  const respRedact   = ev["response_redacted"] as string | null | undefined

  const nothingFound =
    level === "clean" &&
    !attackTypes.length &&
    !piiPrompt.length &&
    !piiResponse.length &&
    !injDetected &&
    !jbDetected &&
    !skDetected &&
    !secDetected

  return (
    <div className="space-y-6 p-4">
      {/* ── Blocked banner ── */}
      {isBlocked && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[13px] font-semibold text-red-700 mb-0.5">
            LLM call blocked by fluiq.secure()
          </p>
          {blockReason && (
            <p className="text-[12px] text-red-600/80 font-mono break-all">{blockReason}</p>
          )}
        </div>
      )}

      {/* ── Summary ── */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wide",
            pill,
          )}
        >
          {label}
        </span>
        {score !== null && (
          <span className="text-xs text-muted-foreground">
            Risk score: <span className="font-mono font-medium">{score}</span>
          </span>
        )}
      </div>

      {attackTypes.length > 0 && (
        <Section title="Attack Types Detected">
          <TagList tags={attackTypes} />
        </Section>
      )}

      {nothingFound && (
        <p className="text-sm text-muted-foreground">
          No PII, injection patterns, or secrets detected in this trace.
        </p>
      )}

      {(piiPrompt.length > 0 || piiResponse.length > 0) && (
        <Section title="PII Detected">
          <div className="space-y-3">
            {piiPrompt.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] text-muted-foreground">In prompt</div>
                <TagList tags={piiPrompt} />
              </div>
            )}
            {piiResponse.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] text-muted-foreground">In response</div>
                <TagList tags={piiResponse} />
              </div>
            )}
          </div>
        </Section>
      )}

      {injDetected && (
        <Section title="Injection Patterns Found">
          <TagList tags={injPatterns} />
        </Section>
      )}

      {jbDetected && (
        <Section title="Jailbreak Patterns Found">
          <TagList tags={jbPatterns} />
        </Section>
      )}

      {skDetected && (
        <Section title="Skeleton Key Patterns Found">
          <TagList tags={skPatterns} />
        </Section>
      )}

      {secDetected && (
        <Section title="Secrets / Credentials Detected">
          <TagList tags={secretTypes.length ? secretTypes : ["high-entropy string"]} />
        </Section>
      )}

      {(promptRedact || respRedact) && (
        <Section title="Redacted Content">
          <div className="space-y-3">
            <RedactedBlock label="Prompt (redacted)" text={promptRedact} />
            <RedactedBlock label="Response (redacted)" text={respRedact} />
          </div>
        </Section>
      )}
    </div>
  )
}