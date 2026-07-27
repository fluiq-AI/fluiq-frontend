import { useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  ArrowTurnBackwardIcon,
  Cancel01Icon,
  FloppyDiskIcon,
  Loading03Icon,
  PlusSignIcon,
  RefreshIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

// {{var}} standard, with legacy $var / ${var} still accepted
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
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)

  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [showVersions, setShowVersions] = useState(false)

  async function load(selectName?: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch<{ prompts: JudgePrompt[] }>("/admin/judge-prompts")
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
    setCreating(false)
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

      <div className="grid items-start gap-6 lg:grid-cols-[18rem_1fr]">
        {/* List column — sticky + scrollable */}
        <div className="lg:sticky lg:top-6 flex max-h-[calc(100vh-6rem)] flex-col">
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex flex-1 items-center">
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
            <Button
              size="sm"
              variant={creating ? "default" : "outline"}
              onClick={() => { setCreating(true); setNotice(null); setError(null) }}
              title="Add a new judge prompt"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
              Add
            </Button>
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
                        selected === p.name && !creating ? "bg-muted/60" : "bg-background"
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
        </div>

        {/* Right column — editor or create form */}
        <div>
          {error && (
            <p className="mb-3 flex items-center gap-1.5 text-sm text-destructive">
              <HugeiconsIcon icon={AlertCircleIcon} size={15} />
              {error}
            </p>
          )}
          {notice && <p className="mb-3 text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}

          {creating ? (
            <CreatePromptForm
              existingNames={prompts.map((p) => p.name)}
              onCancel={() => setCreating(false)}
              onCreated={async (created) => {
                setCreating(false)
                setNotice(`Created "${created.name}".`)
                await load(created.name)
              }}
              onError={setError}
            />
          ) : !current ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
              Select a prompt to edit, or click Add to create one.
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

function CreatePromptForm({
  existingNames,
  onCancel,
  onCreated,
  onError,
}: {
  existingNames: string[]
  onCancel: () => void
  onCreated: (created: JudgePrompt) => void | Promise<void>
  onError: (msg: string) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [requiredRaw, setRequiredRaw] = useState("")
  const [template, setTemplate] = useState("")
  const [busy, setBusy] = useState(false)

  const requiredVars = requiredRaw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)

  const present = identifiers(template)
  const missing = requiredVars.filter((v) => !present.has(v))
  const nameValid = /^[a-z][a-z0-9_]{1,63}$/.test(name)
  const nameTaken = existingNames.includes(name)
  const canCreate =
    nameValid && !nameTaken && template.trim().length > 0 && missing.length === 0 && !busy

  async function submit() {
    if (!canCreate) return
    setBusy(true)
    try {
      const created = await authFetch<JudgePrompt>("/admin/judge-prompts", {
        method: "POST",
        body: { name, description: description || null, required_vars: requiredVars, template },
      })
      await onCreated(created)
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Failed to create prompt")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-border/60 bg-background">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <p className="text-sm font-medium">New judge prompt</p>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          <HugeiconsIcon icon={Cancel01Icon} size={14} />
          Cancel
        </Button>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Name (lowercase, e.g. <code className="font-mono">conciseness</code>)
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            placeholder="my_metric"
            className="font-mono"
          />
          {name && !nameValid ? (
            <p className="mt-1 text-xs text-destructive">
              Use lowercase letters, digits, and underscores; start with a letter.
            </p>
          ) : nameTaken ? (
            <p className="mt-1 text-xs text-destructive">That name already exists.</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this judge measures"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Required variables (comma-separated, optional)
          </label>
          <Input
            value={requiredRaw}
            onChange={(e) => setRequiredRaw(e.target.value)}
            placeholder="answer, question"
            className="font-mono"
          />
          {requiredVars.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
              {requiredVars.map((v) => {
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
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Template — use <code className="font-mono">$variable</code> placeholders
          </label>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            spellCheck={false}
            placeholder={'Evaluate the ANSWER…\nReturn JSON: {"score": float, "reason": str}.\n\nQUESTION: {{question}}\nANSWER: {{answer}}'}
            className="block min-h-[14rem] w-full resize-y rounded-md border border-border/60 bg-background px-3 py-2 font-mono text-[13px] leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {missing.length > 0 && (
            <p className="mt-1 text-xs text-destructive">
              Template is missing: {missing.map((v) => `$${v}`).join(", ")}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Stored for future use — it runs once an evaluator references it by name.
          </p>
          <Button size="sm" onClick={submit} disabled={!canCreate}>
            <HugeiconsIcon
              icon={busy ? Loading03Icon : PlusSignIcon}
              size={14}
              className={busy ? "animate-spin" : undefined}
            />
            Create prompt
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AdminJudgePrompts
