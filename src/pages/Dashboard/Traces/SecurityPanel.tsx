import { cn } from "@/lib/utils"
import type { TraceRecord } from "./types"

type RiskLevel = "clean" | "low" | "medium" | "high"

function getRiskLevel(event: Record<string, unknown>): RiskLevel {
  const v = event["security_risk_level"]
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
  const level = getRiskLevel(ev)
  const { pill, label } = RISK_CONFIG[level]
  const score = typeof ev["security_risk_score"] === "number"
    ? (ev["security_risk_score"] as number).toFixed(2)
    : null

  const piiPrompt    = (ev["pii_entities_prompt"]   as string[] | null) ?? []
  const piiResponse  = (ev["pii_entities_response"] as string[] | null) ?? []
  const injDetected  = Boolean(ev["injection_detected"])
  const injPatterns  = (ev["injection_patterns"]    as string[] | null) ?? []
  const secDetected  = Boolean(ev["secrets_detected"])
  const secretTypes  = (ev["secret_types"]          as string[] | null) ?? []
  const promptRedact = ev["prompt_redacted"]   as string | null | undefined
  const respRedact   = ev["response_redacted"] as string | null | undefined

  const nothingFound =
    level === "clean" &&
    !piiPrompt.length &&
    !piiResponse.length &&
    !injDetected &&
    !secDetected

  return (
    <div className="space-y-6 p-4">
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