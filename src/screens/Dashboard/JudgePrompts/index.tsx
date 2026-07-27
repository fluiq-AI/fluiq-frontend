import { useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  ArrowTurnBackwardIcon,
  Cancel01Icon,
  FloppyDiskIcon,
  Loading03Icon,
  RefreshIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"

interface OrgJudgePrompt {
  name: string
  description: string | null
  required_vars: string[]
  template: string           // what this org's evaluations effectively use
  platform_template: string  // what Reset reverts to
  is_overridden: boolean
  version: number
  updated_at: string
}

interface PromptVersion {
  version_id: string
  name: string
  version: number
  template: string
  updated_by: string | null
  created_at: string
}

// {{ var }} is the product-wide standard; $var / ${var} are legacy forms that
// prompts saved before the switch still contain. All three count as present,
// mirroring the worker's _IDENT_RE in jobs/helper/judge_prompts.py.
const PLACEHOLDER_RE = /\{\{\s*(\w+)\s*\}\}|\$\{(\w+)\}|\$(\w+)/g

function identifiers(template: string): Set<string> {
  const out = new Set<string>()
  for (const m of template.matchAll(PLACEHOLDER_RE)) out.add(m[1] || m[2] || m[3])
  return out
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

function JudgePrompts() {
  const [prompts, setPrompts] = useState<OrgJudgePrompt[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [showVersions, setShowVersions] = useState(false)

  async function load(selectName?: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch<{ prompts: OrgJudgePrompt[] }>("/api/v1/eval/judge-prompts")
      setPrompts(res.prompts)
      const pick = selectName ?? selected
      if (pick && res.prompts.some((p) => p.name === pick)) {
        const p = res.prompts.find((x) => x.name === pick)!
        setSelected(p.name)
        setDraft(p.template)
      } else if (res.prompts.length > 0 && selected === null) {
        setSelected(res.prompts[0].name)
        setDraft(res.prompts[0].template)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load judge prompts")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const current = useMemo(
    () => prompts.find((p) => p.name === selected) ?? null,
    [prompts, selected],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return prompts
    return prompts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
    )
  }, [prompts, search])

  function selectPrompt(name: string) {
    const p = prompts.find((x) => x.name === name)
    setSelected(name)
    setDraft(p?.template ?? "")
    setNotice(null)
    setError(null)
    setShowVersions(false)
    setVersions([])
  }

  const present = identifiers(draft)
  const missingVars = current ? current.required_vars.filter((v) => !present.has(v)) : []
  const dirty = current ? draft !== current.template : false

  function applyUpdated(updated: OrgJudgePrompt) {
    setPrompts((prev) => prev.map((p) => (p.name === updated.name ? updated : p)))
    setDraft(updated.template)
  }

  async function save() {
    if (!current || missingVars.length > 0) return
    setSaving(true); setError(null); setNotice(null)
    try {
      const updated = await authFetch<OrgJudgePrompt>(
        `/api/v1/eval/judge-prompts/${current.name}`,
        { method: "PUT", body: { template: draft } },
      )
      applyUpdated(updated)
      setNotice(
        `Saved. Your evaluations now use your v${updated.version} of this prompt (applies within ~a minute).`,
      )
      if (showVersions) loadVersions(current.name)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function resetToPlatform() {
    if (!current) return
    setSaving(true); setError(null); setNotice(null)
    try {
      const updated = await authFetch<OrgJudgePrompt>(
        `/api/v1/eval/judge-prompts/${current.name}/reset`,
        { method: "POST" },
      )
      applyUpdated(updated)
      setNotice("Reverted to the platform prompt. Your saved versions are kept in History.")
      if (showVersions) loadVersions(current.name)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to reset")
    } finally {
      setSaving(false)
    }
  }

  async function loadVersions(name: string) {
    try {
      const res = await authFetch<{ versions: PromptVersion[] }>(
        `/api/v1/eval/judge-prompts/${name}/versions`,
      )
      setVersions(res.versions)
    } catch {
      setVersions([])
    }
  }

  function toggleVersions() {
    const next = !showVersions
    setShowVersions(next)
    if (next && current) loadVersions(current.name)
  }

  async function restore(version: number) {
    if (!current) return
    setSaving(true); setError(null); setNotice(null)
    try {
      const updated = await authFetch<OrgJudgePrompt>(
        `/api/v1/eval/judge-prompts/${current.name}/restore/${version}`,
        { method: "POST" },
      )
      applyUpdated(updated)
      setNotice(`Restored v${version} (saved as v${updated.version}).`)
      loadVersions(current.name)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to restore")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DashboardPageHeader
        title="Judge Prompts"
        description="The exact LLM-as-Judge prompts that score your traces — customize them for your organization."
      />

      <div className="px-6 py-6">
      <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
        Edit a prompt to change how a metric is graded. The change applies only to your
        organization, within ~a minute, and every score records which prompt version
        produced it. Use{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{{variable}}"}</code>{" "}
        placeholders; required ones must stay present.
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[18rem_1fr]">
        {/* List column */}
        <div className="lg:sticky lg:top-6 flex max-h-[calc(100vh-6rem)] flex-col">
          <div className="relative mb-3 flex items-center">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              className="pointer-events-none absolute left-3 text-muted-foreground"
            />
            <Input
              placeholder="Search prompts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 text-muted-foreground hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={13} />
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/60">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                {search ? "No prompts match." : "No prompts yet."}
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {filtered.map((p) => (
                  <li key={p.name}>
                    <button
                      type="button"
                      onClick={() => selectPrompt(p.name)}
                      className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
                        selected === p.name ? "bg-muted/60" : "bg-background"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="font-mono text-xs font-medium">{p.name}</span>
                        {p.is_overridden ? (
                          <Badge variant="outline" className="text-[10px]">customized</Badge>
                        ) : null}
                      </div>
                      {p.description ? (
                        <span className="text-xs text-muted-foreground">{p.description}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Editor column */}
        <div>
          {error && (
            <p className="mb-3 flex items-center gap-1.5 text-sm text-destructive">
              <HugeiconsIcon icon={AlertCircleIcon} size={15} />
              {error}
            </p>
          )}
          {notice && <p className="mb-3 text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}

          {!current ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
              Select a prompt to view or customize it.
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-background">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
                <div>
                  <p className="font-mono text-sm font-medium">{current.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {current.is_overridden
                      ? `your v${current.version} · updated ${fmtDate(current.updated_at)}`
                      : "using the platform prompt"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={toggleVersions}>
                    <HugeiconsIcon icon={RefreshIcon} size={14} />
                    {showVersions ? "Hide history" : "History"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToPlatform}
                    disabled={saving || !current.is_overridden}
                  >
                    <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={14} />
                    Reset to platform
                  </Button>
                  <Button size="sm" onClick={save} disabled={saving || !dirty || missingVars.length > 0}>
                    <HugeiconsIcon
                      icon={saving ? Loading03Icon : FloppyDiskIcon}
                      size={14}
                      className={saving ? "animate-spin" : undefined}
                    />
                    Save
                  </Button>
                </div>
              </div>

              {current.required_vars.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 px-4 py-2.5 text-xs">
                  <span className="text-muted-foreground">Required:</span>
                  {current.required_vars.map((v) => {
                    const ok = present.has(v)
                    return (
                      <span
                        key={v}
                        className={`rounded px-1.5 py-0.5 font-mono ${
                          ok
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {`{{${v}}}`}
                      </span>
                    )
                  })}
                </div>
              )}

              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
                className="block min-h-[20rem] w-full resize-y bg-background px-4 py-3 font-mono text-[13px] leading-relaxed focus-visible:outline-none"
              />

              {missingVars.length > 0 && (
                <p className="border-t border-border/60 px-4 py-2 text-xs text-destructive">
                  Missing required placeholder(s): {missingVars.map((v) => `{{${v}}}`).join(", ")} — add them to save.
                </p>
              )}

              <p className="border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
                Heads-up: changing a judge prompt changes what its scores mean. Results
                record the prompt version that graded them, so score trends across a
                prompt change should be compared with that in mind.
              </p>

              {showVersions && (
                <div className="border-t border-border/60">
                  <p className="px-4 py-2 text-xs font-medium text-muted-foreground">Your version history</p>
                  {versions.length === 0 ? (
                    <p className="px-4 pb-3 text-xs text-muted-foreground">
                      No saved versions yet — you're on the platform prompt.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/40">
                      {versions.map((v) => (
                        <li key={v.version_id} className="flex items-center justify-between gap-3 px-4 py-2">
                          <div className="min-w-0">
                            <span className="font-mono text-xs">v{v.version}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{fmtDate(v.created_at)}</span>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {v.template.slice(0, 80)}…
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={saving || (current.is_overridden && v.version === current.version)}
                            onClick={() => restore(v.version)}
                          >
                            <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={13} />
                            Restore
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  )
}

export default JudgePrompts
