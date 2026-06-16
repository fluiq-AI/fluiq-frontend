import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { Link } from "react-router"
import { AnimatePresence, motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useAppSelector } from "@/store/hooks"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "fluiq.onboarding"

type SdkLang = "python" | "typescript"

interface StoredState {
  sdk_lang: SdkLang | null
  sdk_copied: boolean
  trace_copied: boolean
  dismissed: boolean
}

function loadStored(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoredState
  } catch {
    console.log("Error while loading the getting started")
  }
  return { sdk_lang: null, sdk_copied: false, trace_copied: false, dismissed: false }
}

function persist(s: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

const INSTALL_CODE: Record<SdkLang, string> = {
  python: `pip install fluiq`,
  typescript: `npm install @fluiq/sdk`,
}
const TRACE_CODE: Record<SdkLang, string> = {
  python: `import fluiq\n\nfluiq.instrument(api_key="fl_...")\n# Traces appear in your dashboard`,
  typescript: `import fluiq from "@fluiq/sdk";\n\nfluiq.instrument({ apiKey: "fl_..." });\n// Traces appear in your dashboard`,
}

const LANG_LABEL: Record<SdkLang, string> = {
  python: "Python",
  typescript: "TypeScript",
}

export const VISITED_KEY = "fluiq.visited"

function GettingStarted() {
  const navigate = useNavigate()

  useEffect(() => {
    localStorage.setItem(VISITED_KEY, "true")
  }, [])

  const { organization } = useAppSelector((s) => s.auth)
  const [stored, setStored] = useState<StoredState>(loadStored)
  const [copied, setCopied] = useState<"sdk" | "trace" | null>(null)

  const hasApiKey = (organization?.api_keys.length ?? 0) > 0

  const activeLang: SdkLang = stored.sdk_lang ?? "python"

  const steps = [
    {
      id: "lang",
      label: "Choose your SDK",
      description: stored.sdk_lang
        ? `${LANG_LABEL[stored.sdk_lang]} selected — switch any time to revisit the steps in the other language.`
        : "Pick the language for your integration.",
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
      description: activeLang === "typescript" ? "Add Fluiq to your Node.js project." : "Add Fluiq to your Python environment.",
      done: stored.sdk_copied,
      code: INSTALL_CODE[activeLang],
      copyKey: "sdk" as const,
    },
    {
      id: "trace",
      label: "Instrument your first call",
      description: "One line. Traces start streaming immediately.",
      done: stored.trace_copied,
      code: TRACE_CODE[activeLang],
      copyKey: "trace" as const,
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length

  function selectLang(lang: SdkLang) {
    setStored((prev) => {
      // Switching to a different language re-opens the install + instrument
      // steps so the user can walk through them again with that language's commands.
      const switching = prev.sdk_lang !== null && prev.sdk_lang !== lang
      const next: StoredState = {
        ...prev,
        sdk_lang: lang,
        sdk_copied: switching ? false : prev.sdk_copied,
        trace_copied: switching ? false : prev.trace_copied,
      }
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

  return (
    <div className="px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Getting Started
          </h1>
          <p className="mt-2 text-muted-foreground">
            Follow these steps to get Fluiq running in your AI pipeline.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/dashboard/overview", { replace: true })}
          className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-[#1860D3] dark:hover:text-[#6FA8FF]"
        >
          Skip to Dashboard
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
        </button>
      </div>

      <AnimatePresence onExitComplete={() => {}}>
      
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
                    step.done ? "text-[#1860D3] dark:text-[#6FA8FF]" : "text-muted-foreground/30",
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

                  {/* SDK language selector — stays visible after selection so the
                      user can switch language and revisit the remaining steps. */}
                  {step.id === "lang" && (
                    <div className="mt-2.5 flex items-center gap-2">
                      {(["python", "typescript"] as const).map((l) => {
                        const active = stored.sdk_lang === l
                        return (
                          <button
                            key={l}
                            onClick={() => selectLang(l)}
                            aria-pressed={active}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors",
                              active
                                ? "border-[#1860D3] bg-[#1860D3]/5 text-[#1860D3] dark:border-[#6FA8FF] dark:bg-[#6FA8FF]/10 dark:text-[#6FA8FF]"
                                : "border-border bg-background text-foreground hover:bg-muted",
                            )}
                          >
                            <span
                              className={cn(
                                "rounded px-1 py-0.5 font-mono text-[9px] font-bold",
                                active
                                  ? "bg-[#1860D3]/10 text-[#1860D3] dark:bg-[#6FA8FF]/15 dark:text-[#6FA8FF]"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {l === "python" ? "PY" : "TS"}
                            </span>
                            {LANG_LABEL[l]}
                          </button>
                        )
                      })}
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
                            ? "text-[#1860D3] dark:text-[#6FA8FF]"
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
        </motion.div>
    </AnimatePresence>
    </div>
  )
}

export default GettingStarted
