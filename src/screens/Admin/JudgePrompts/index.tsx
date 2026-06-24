import { useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  ArrowTurnBackwardIcon,
  FloppyDiskIcon,
  Loading03Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"

interface JudgePrompt {
  name: string
  template: string
  default_template: string
  description: string | null
  required_vars: string[]
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

// $var or ${var}
const PLACEHOLDER_RE = /\$(?:\{(\w+)\}|(\w+))/g

function identifiers(template: string): Set<string> {
  const out = new Set<string>()
  for (const m of template.matchAll(PLACEHOLDER_RE)) out.add(m[1] || m[2])
  return out
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

function AdminJudgePrompts() {
  const [prompts, setPrompts] = useState<JudgePrompt[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [showVersions, setShowVersions] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch<{ prompts: JudgePrompt[] }>("/admin/judge-prompts")
      setPrompts(res.prompts)
      if (res.prompts.length > 0 && selected === null) {
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

  function applyUpdated(updated: JudgePrompt) {
    setPrompts((prev) => prev.map((p) => (p.name === updated.name ? updated : p)))
    setDraft(updated.template)
  }

  async function save() {
    if (!current || missingVars.length > 0) return
    setSaving(true); setError(null); setNotice(null)
    try {
      const updated = await authFetch<JudgePrompt>(`/admin/judge-prompts/${current.name}`, {
        method: "PUT",
        body: { template: draft },
      })
      applyUpdated(updated)
      setNotice(`Saved. Now at version ${updated.version}.`)
      if (showVersions) loadVersions(current.name)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function resetToDefault() {
    if (!current) return
    setSaving(true); setError(null); setNotice(null)
    try {
      const updated = await authFetch<JudgePrompt>(`/admin/judge-prompts/${current.name}/reset`, {
        method: "POST",
      })
      applyUpdated(updated)
      setNotice("Reset to the built-in default.")
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
        `/admin/judge-prompts/${name}/versions`,
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
      const updated = await authFetch<JudgePrompt>(
        `/admin/judge-prompts/${current.name}/restore/${version}`,
        { method: "POST" },
      )
      applyUpdated(updated)
      setNotice(`Restored version ${version} (saved as v${updated.version}).`)
      loadVersions(current.name)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to restore")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Judge Prompts
        </h1>
        <p className="mt-2 text-muted-foreground">
          The LLM-as-Judge prompts your evaluation workers use. Edits apply within ~a minute, with
          no worker redeploy. Use <code className="rounded bg-muted px-1 py-0.5 text-xs">$variable</code>{" "}
          placeholders; required ones must stay present.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        {/* List */}
        <div className="overflow-hidden rounded-lg border border-border/60">
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <ul className="divide-y divide-border/40">
              {prompts.map((p) => (
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
                        <Badge variant="outline" className="text-[10px]">edited</Badge>
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

        {/* Editor */}
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
              Select a prompt to edit.
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-background">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
                <div>
                  <p className="font-mono text-sm font-medium">{current.name}</p>
                  <p className="text-xs text-muted-foreground">
                    v{current.version} · updated {fmtDate(current.updated_at)}
                    {current.is_overridden ? "" : " · using default"}
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
                    onClick={resetToDefault}
                    disabled={saving || !current.is_overridden}
                  >
                    <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={14} />
                    Reset to default
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

              {/* Required vars */}
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
                        ${v}
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
                  Missing required placeholder(s): {missingVars.map((v) => `$${v}`).join(", ")} — add them to save.
                </p>
              )}

              {/* Version history */}
              {showVersions && (
                <div className="border-t border-border/60">
                  <p className="px-4 py-2 text-xs font-medium text-muted-foreground">Version history</p>
                  {versions.length === 0 ? (
                    <p className="px-4 pb-3 text-xs text-muted-foreground">No saved versions yet.</p>
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
                            disabled={saving || v.version === current.version}
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
    </>
  )
}

export default AdminJudgePrompts
