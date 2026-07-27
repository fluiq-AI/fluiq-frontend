import { HugeiconsIcon } from "@hugeicons/react"
import { JusticeScale01Icon, UserGroupIcon } from "@hugeicons/core-free-icons"

import { Label } from "@/components/ui/label"
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown"
import { SearchSelect } from "@/components/SearchSelect"
import { useModels, toSpecs } from "@/lib/useModels"
import { cn } from "@/lib/utils"

/**
 * Picks which model judges an evaluation, and which models sit on the jury.
 *
 * Shared across the dataset batch runs, the agentic run trigger, and single
 * runs so the three cannot drift into three different vocabularies for the
 * same thing. Values are `"provider:model"` strings, which is exactly what the
 * API and the evaluator exchange, so there is no translation layer to keep in sync.
 *
 * This is a cost control as much as a quality one: with BYOK the org pays for
 * whichever provider it picks, and a jury multiplies that by its size.
 */

export interface JudgeSelection {
  /** `"provider:model"`, or "" for the server default. */
  judge: string
  /** Jury members, only meaningful at depth `deep`. */
  jury: string[]
  depth: "fast" | "standard" | "deep"
}

export const DEFAULT_JUDGE_SELECTION: JudgeSelection = {
  judge: "",
  jury: [],
  depth: "standard",
}

/**
 * Providers Fluiq holds no managed key for, so picking one without a saved
 * credential fails the run rather than quietly falling back.
 */
const BYOK_ONLY = new Set(["moonshot"])

function requiresOwnKey(spec: string): boolean {
  return BYOK_ONLY.has(spec.split(":")[0])
}

const DEPTHS: { id: JudgeSelection["depth"]; label: string; hint: string }[] = [
  { id: "fast", label: "Fast", hint: "Deterministic checks + tool selection" },
  { id: "standard", label: "Standard", hint: "Adds trajectory and coordination" },
  { id: "deep", label: "Deep", hint: "Adds a multi-model jury" },
]

export function JudgePicker({
  value,
  onChange,
  showDepth = true,
  showModel = true,
  disabled = false,
  className,
}: {
  value: JudgeSelection
  onChange: (next: JudgeSelection) => void
  showDepth?: boolean
  /** Hide the single judge-model select (when the caller picks models itself). */
  showModel?: boolean
  disabled?: boolean
  className?: string
}) {
  const juryOpen = value.depth === "deep"
  const specs = toSpecs(useModels())
  const specOptions = specs.map((s) => ({ value: s.spec, label: s.label }))

  function toggleJuror(spec: string, on: boolean) {
    onChange({
      ...value,
      jury: on
        ? [...value.jury.filter((s) => s !== spec), spec]
        : value.jury.filter((s) => s !== spec),
    })
  }

  return (
    <div className={cn("grid gap-3", className)}>
      {showDepth ? (
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Depth</Label>
          <div className="flex flex-wrap gap-1.5">
            {DEPTHS.map((d) => (
              <button
                key={d.id}
                type="button"
                disabled={disabled}
                title={d.hint}
                onClick={() => onChange({ ...value, depth: d.id })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] transition-colors disabled:opacity-50",
                  value.depth === d.id
                    ? "border-primary/40 bg-primary/10 font-medium text-foreground"
                    : "border-border/60 text-muted-foreground hover:bg-muted/40",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showModel ? (
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <HugeiconsIcon icon={JusticeScale01Icon} size={12} />
            Judge model
          </Label>
          <SearchSelect
            value={value.judge}
            onChange={(v) => onChange({ ...value, judge: v })}
            options={specOptions}
            clearLabel="Server default"
            disabled={disabled}
            triggerClassName="h-8 text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            {requiresOwnKey(value.judge)
              ? "Needs a saved key for this provider. Fluiq has no managed account to fall back to."
              : "Runs on your own key when you have one saved for that provider, otherwise on Fluiq's."}
          </p>
        </div>
      ) : null}

      {juryOpen ? (
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <HugeiconsIcon icon={UserGroupIcon} size={12} />
            Jury — panel that votes within each run
          </Label>
          <MultiSelectDropdown
            label="juror"
            placeholder="Default jury"
            options={specOptions}
            selected={value.jury}
            onToggle={toggleJuror}
            disabled={disabled}
          />
          <p className="text-[11px] text-muted-foreground">
            {value.jury.length === 0
              ? "None selected, so the configured default jury is used."
              : `${value.jury.length} juror${value.jury.length === 1 ? "" : "s"} · each one is a separate judge call per metric.${
                  value.jury.some(requiresOwnKey)
                    ? " One of them needs a saved key for its provider."
                    : ""
                }`}
          </p>
        </div>
      ) : null}
    </div>
  )
}
