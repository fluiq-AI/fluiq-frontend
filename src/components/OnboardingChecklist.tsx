import { useState } from "react"
import { Link } from "react-router"
import { AnimatePresence, motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useAppSelector } from "@/store/hooks"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "fluiq.onboarding"

interface StoredState {
  sdk_lang: "python" | null
  sdk_copied: boolean
  trace_copied: boolean
  dismissed: boolean
}

function loadStored(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoredState
  } catch {}
  return { sdk_lang: null, sdk_copied: false, trace_copied: false, dismissed: false }
}

function persist(s: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

const INSTALL_CODE = `pip install fluiq`
const TRACE_CODE = `import fluiq\n\nfluiq.instrument(api_key="fl_...")\n# Traces appear in your dashboard`

export function OnboardingChecklist() {
  const { organization } = useAppSelector((s) => s.auth)
  const [stored, setStored] = useState<StoredState>(loadStored)
  const [copied, setCopied] = useState<"sdk" | "trace" | null>(null)
  const [visible, setVisible] = useState(true)

  const hasApiKey = (organization?.api_keys.length ?? 0) > 0

  const steps = [
    {
      id: "lang",
      label: "Choose your SDK",
      description: stored.sdk_lang ? "Python selected." : "Pick the language for your integration.",
      done: stored.sdk_lang !== null,
    },
    {
      id: "account",
      label: "Create your account",
      description: "Your workspace is ready.",
      done: true,
    },
    {
      id: "apikey",
      label: "Create an API key",
      description: "You need a key to authenticate SDK calls.",
      done: hasApiKey,
    },
    {
      id: "install",
      label: "Install the SDK",
      description: "Add Fluiq to your Python environment.",
      done: stored.sdk_copied,
      code: INSTALL_CODE,
      copyKey: "sdk" as const,
    },
    {
      id: "trace",
      label: "Instrument your first call",
      description: "One line. Traces start streaming immediately.",
      done: stored.trace_copied,
      code: TRACE_CODE,
      copyKey: "trace" as const,
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length

  function selectLang(lang: "python") {
    setStored((prev) => {
      const next = { ...prev, sdk_lang: lang }
      persist(next)
      return next
    })
  }

  function handleCopy(copyKey: "sdk" | "trace", code: string) {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(copyKey)
    setTimeout(() => setCopied(null), 1500)
    setStored((prev) => {
      const next = {
        ...prev,
        sdk_copied: copyKey === "sdk" ? true : prev.sdk_copied,
        trace_copied: copyKey === "trace" ? true : prev.trace_copied,
      }
      persist(next)
      return next
    })
  }

  function dismiss() {
    setVisible(false)
    setStored((prev) => {
      const next = { ...prev, dismissed: true }
      persist(next)
      return next
    })
  }

  if (stored.dismissed) return null

  return (
    <AnimatePresence onExitComplete={() => {}}>
      {visible && (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mb-8 rounded-2xl border border-border bg-card p-5"
        >
          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-[15px] font-semibold text-foreground">
                Get started with Fluiq
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {allDone ? "You're all set!" : `${completedCount} of ${steps.length} steps complete`}
              </p>
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss onboarding"
              className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground/50 transition-colors hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} />
            </button>
          </div>

          {/* Progress bar */}
          <Progress
            value={(completedCount / steps.length) * 100}
            className="mb-4 h-1"
          />

          {/* Steps */}
          <div className="grid gap-2">
            {steps.map((step, i) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                  step.done
                    ? "border-border/40 bg-muted/20"
                    : "border-border bg-background",
                )}
              >
                {/* Indicator */}
                <div
                  className={cn(
                    "mt-0.5 shrink-0",
                    step.done ? "text-foreground" : "text-muted-foreground/30",
                  )}
                >
                  {step.done ? (
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={17} />
                  ) : (
                    <span className="flex size-[17px] items-center justify-center rounded-full border-[1.5px] border-current text-[9px] font-bold leading-none">
                      {i + 1}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-[13px] font-semibold leading-tight",
                      step.done
                        ? "text-muted-foreground line-through decoration-muted-foreground/30"
                        : "text-foreground",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>

                  {/* SDK language selector */}
                  {step.id === "lang" && !step.done && (
                    <div className="mt-2.5 flex items-center gap-2">
                      {/* Python */}
                      <button
                        onClick={() => selectLang("python")}
                        className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <span className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] font-bold text-muted-foreground">
                          PY
                        </span>
                        Python
                      </button>

                      {/* TypeScript — coming soon */}
                      <div className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-1.5 opacity-50">
                        <span className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] font-bold text-muted-foreground">
                          TS
                        </span>
                        <span className="text-[12px] font-medium text-muted-foreground">
                          TypeScript
                        </span>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Coming soon
                        </span>
                      </div>
                    </div>
                  )}

                  {/* API key CTA */}
                  {step.id === "apikey" && !step.done && (
                    <Link to="/dashboard/api-management">
                      <Button size="sm" variant="outline" className="mt-2.5 h-7 gap-1.5 text-xs">
                        API Management <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
                      </Button>
                    </Link>
                  )}

                  {/* Code snippet */}
                  {!step.done && step.code && (
                    <div className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-muted px-3 py-2">
                      <code className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {step.code}
                      </code>
                      <button
                        onClick={() => handleCopy(step.copyKey!, step.code!)}
                        aria-label="Copy code"
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded transition-colors",
                          copied === step.copyKey
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <HugeiconsIcon
                          icon={copied === step.copyKey ? CheckmarkCircle02Icon : Copy01Icon}
                          size={13}
                        />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer dismiss when all done */}
          {allDone && (
            <div className="mt-4 flex justify-end">
              <Button size="sm" variant="outline" onClick={dismiss} className="h-7 text-xs">
                Dismiss
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
