import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Alert02Icon,
  Cancel01Icon,
  Delete02Icon,
  FloppyDiskIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"

// ── Types ─────────────────────────────────────────────────────────────────────

interface GuardrailPolicy {
  org_id:            string
  slug:              string
  block_threshold:   "medium" | "high"
  warn_threshold:    "low" | "medium" | "high"
  block_categories:  string[]
  custom_deny_list:  string[]
  custom_allow_list: string[]
  pii_ignore:        string[]
  allowed_tools:     string[]
  alert_webhook:     string | null
  alert_on:          string[]
  scan_responses:    boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_CATEGORIES: { id: string; label: string; description: string }[] = [
  { id: "prompt_injection",   label: "Prompt Injection",   description: "Override / ignore system prompt instructions" },
  { id: "jailbreak",          label: "Jailbreak",          description: "Role-play escapes, DAN, developer mode" },
  { id: "skeleton_key",       label: "Skeleton Key",       description: "Mode augmentation & directive override attacks" },
  { id: "semantic_attack",    label: "Semantic Attack",    description: "Evasive phrasing detected by embedding classifier" },
  { id: "pii_detected",       label: "PII",                description: "Personal identifiable information in the prompt" },
  { id: "secrets_detected",   label: "Secrets / Keys",     description: "API keys, passwords, private key blocks" },
  { id: "indirect_injection", label: "Indirect Injection", description: "Attack patterns in tool outputs or retrieved docs" },
  { id: "rag_poisoning",        label: "RAG Poisoning",        description: "Retrieved documents that semantically resemble attacks" },
  { id: "tool_exfiltration",    label: "Tool Exfiltration",    description: "PII / secrets sent out in tool-call arguments" },
  { id: "tool_policy_violation", label: "Tool Allowlist",      description: "A tool was called outside the configured allowlist" },
  { id: "cross_agent_injection", label: "Cross-Agent Injection", description: "Attack content arriving from another agent's output" },
]

const RISK_LEVELS = ["low", "medium", "high"]

// PII entity types the scanner detects. Each can be toggled off (ignored) per
// policy — a checked entity is tracked, unchecked means it is suppressed in warn
// mode and never surfaces in the dashboard. Mirrors PII_ENTITIES in the API.
const PII_ENTITIES: { id: string; label: string; description: string }[] = [
  { id: "US_SSN",        label: "US SSN",         description: "Social Security numbers" },
  { id: "CREDIT_CARD",   label: "Credit Card",    description: "Card numbers (all major networks)" },
  { id: "IBAN_CODE",     label: "IBAN",           description: "International bank account numbers" },
  { id: "CRYPTO",        label: "Crypto Wallet",  description: "Bitcoin / crypto wallet addresses" },
  { id: "US_PASSPORT",   label: "US Passport",    description: "Passport numbers" },
  { id: "EMAIL_ADDRESS", label: "Email",          description: "Email addresses" },
  { id: "PHONE_NUMBER",  label: "Phone",          description: "Phone numbers" },
  { id: "PERSON",        label: "Person Name",    description: "People's names (NER)" },
  { id: "LOCATION",      label: "Location",       description: "Geographic locations / addresses" },
  { id: "IP_ADDRESS",    label: "IP Address",     description: "IPv4 / IPv6 addresses" },
]

const EMPTY_DRAFT = {
  block_threshold:   "high" as const,
  warn_threshold:    "medium" as const,
  block_categories:  [] as string[],
  custom_deny_list:  [] as string[],
  custom_allow_list: [] as string[],
  pii_ignore:        [] as string[],
  allowed_tools:     [] as string[],
  alert_webhook:     null as string | null,
  alert_on:          ["high"] as string[],
  scan_responses:    false,
}

const SLUG_RE = /^[a-z0-9][a-z0-9\-_]{0,62}$/

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Guardrails() {
  const [slugs, setSlugs]         = useState<string[]>(["default"])
  const [activeSlug, setActiveSlug] = useState("default")
  const [policy, setPolicy]       = useState<GuardrailPolicy | null>(null)
  const [draft, setDraft]         = useState<Omit<GuardrailPolicy, "org_id" | "slug">>(EMPTY_DRAFT)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [saved, setSaved]         = useState(false)

  // New policy creation
  const [showNew, setShowNew]     = useState(false)
  const [newSlug, setNewSlug]     = useState("")
  const [newSlugError, setNewSlugError] = useState("")
  const newSlugRef = useRef<HTMLInputElement>(null)

  // Load slug list on mount
  useEffect(() => {
    authFetch<string[]>("/api/v1/guardrails/list")
      .then((list) => setSlugs(list.length ? list : ["default"]))
      .catch(() => {})
  }, [])

  // Load policy whenever active slug changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    authFetch<GuardrailPolicy>(`/api/v1/guardrails?slug=${activeSlug}`)
      .then((data) => {
        if (cancelled) return
        setPolicy(data)
        setDraft({
          block_threshold:   data.block_threshold,
          warn_threshold:    data.warn_threshold,
          block_categories:  data.block_categories,
          custom_deny_list:  data.custom_deny_list,
          custom_allow_list: data.custom_allow_list,
          pii_ignore:        data.pii_ignore ?? [],
          allowed_tools:     data.allowed_tools ?? [],
          alert_webhook:     data.alert_webhook,
          alert_on:          data.alert_on,
          scan_responses:    data.scan_responses ?? false,
        })
      })
      .catch((err) => { if (!cancelled) setError(err instanceof ApiError ? err.detail : "Failed to load policy") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [activeSlug])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const saved = await authFetch<GuardrailPolicy>(`/api/v1/guardrails?slug=${activeSlug}`, {
        method: "PUT",
        body: draft,
      })
      setPolicy(saved)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save policy")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (activeSlug === "default") return
    if (!confirm(`Delete the "${activeSlug}" policy? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await authFetch(`/api/v1/guardrails?slug=${activeSlug}`, { method: "DELETE" })
      const updated = slugs.filter((s) => s !== activeSlug)
      setSlugs(updated.length ? updated : ["default"])
      setActiveSlug("default")
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to delete policy")
    } finally {
      setDeleting(false)
    }
  }

  async function handleCreatePolicy() {
    const slug = newSlug.trim()
    if (!SLUG_RE.test(slug)) {
      setNewSlugError("Lowercase letters, numbers, hyphens and underscores only.")
      return
    }
    if (slugs.includes(slug)) {
      setNewSlugError("A policy with this name already exists.")
      return
    }
    try {
      await authFetch<GuardrailPolicy>(`/api/v1/guardrails?slug=${slug}`, {
        method: "PUT",
        body: EMPTY_DRAFT,
      })
      setSlugs((prev) => [...prev, slug].sort())
      setActiveSlug(slug)
      setShowNew(false)
      setNewSlug("")
      setNewSlugError("")
    } catch (err) {
      setNewSlugError(err instanceof ApiError ? err.detail : "Failed to create policy")
    }
  }

  function toggleCategory(id: string) {
    setDraft((d) => ({
      ...d,
      block_categories: d.block_categories.includes(id)
        ? d.block_categories.filter((c) => c !== id)
        : [...d.block_categories, id],
    }))
  }

  // A checked entity is tracked; toggling off adds it to pii_ignore (suppressed).
  function togglePiiEntity(id: string) {
    setDraft((d) => ({
      ...d,
      pii_ignore: d.pii_ignore.includes(id)
        ? d.pii_ignore.filter((e) => e !== id)
        : [...d.pii_ignore, id],
    }))
  }

  return (
    <>
      <DashboardPageHeader
        title="Guardrails"
        description="Named security policies for fluiq.secure(). Pass the slug to apply different rules per call site."
      />

      <div className="space-y-5 px-6 py-6">

        {/* ── Policy selector ── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {slugs.map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => { setActiveSlug(slug); setError(null) }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  slug === activeSlug
                    ? "bg-[#1860D3] text-white dark:bg-[#6FA8FF] dark:text-[#0A0A0A]"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {slug === "default" ? "default" : slug}
              </button>
            ))}
          </div>

          {showNew ? (
            <div className="flex items-center gap-1.5">
              <Input
                ref={newSlugRef}
                value={newSlug}
                onChange={(e) => { setNewSlug(e.target.value.toLowerCase()); setNewSlugError("") }}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreatePolicy(); if (e.key === "Escape") { setShowNew(false); setNewSlug(""); setNewSlugError("") } }}
                placeholder="my-policy"
                className="h-7 w-36 text-xs"
                autoFocus
              />
              <Button size="sm" className="h-7 px-2 text-xs" onClick={handleCreatePolicy}>Create</Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setShowNew(false); setNewSlug(""); setNewSlugError("") }}>
                <HugeiconsIcon icon={Cancel01Icon} size={13} />
              </Button>
              {newSlugError && <p className="text-xs text-destructive">{newSlugError}</p>}
            </div>
          ) : (
            <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs" onClick={() => { setShowNew(true); setTimeout(() => newSlugRef.current?.focus(), 50) }}>
              <HugeiconsIcon icon={Add01Icon} size={12} />
              New policy
            </Button>
          )}
        </div>

        {/* SDK usage hint */}
        <div className="rounded-md bg-muted/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
          {activeSlug === "default"
            ? `fluiq.secure(mode="block")  # uses default policy`
            : `fluiq.secure(mode="block", guardrail="${activeSlug}")`}
        </div>

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
            {/* ── Thresholds ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Blocking rules</CardTitle>
                <CardDescription>Control which risk level triggers a block vs. a warning.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Block threshold</label>
                    <Select value={draft.block_threshold} onValueChange={(v) => setDraft((d) => ({ ...d, block_threshold: v as "medium" | "high" }))}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High only (default)</SelectItem>
                        <SelectItem value="medium">Medium and above</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-1.5 text-xs text-muted-foreground">Requests at or above this level are blocked outright.</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Warn threshold</label>
                    <Select value={draft.warn_threshold} onValueChange={(v) => setDraft((d) => ({ ...d, warn_threshold: v as "low" | "medium" | "high" }))}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RISK_LEVELS.map((l) => <SelectItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="mt-1.5 text-xs text-muted-foreground">Requests at or above this level are logged with a warning flag.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Block categories ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Block categories</CardTitle>
                <CardDescription>When empty, all detected attack types trigger a block. When configured, only checked categories block — others are warn-only.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ALL_CATEGORIES.map((cat) => {
                    const checked = draft.block_categories.includes(cat.id)
                    return (
                      <label key={cat.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${checked ? "border-[#1860D3]/30 bg-[#1860D3]/5 dark:border-[#6FA8FF]/30 dark:bg-[#6FA8FF]/5" : "border-border/60 hover:bg-muted/40"}`}>
                        <Checkbox checked={checked} onCheckedChange={() => toggleCategory(cat.id)} className="mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{cat.label}</p>
                          <p className="text-xs text-muted-foreground">{cat.description}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
                {draft.block_categories.length === 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">No categories selected — all detected attack types will block (default behaviour).</p>
                )}
              </CardContent>
            </Card>

            {/* ── Response gate ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Response gate</CardTitle>
                <CardDescription>
                  Scan AI responses for PII and secrets before they reach the caller.
                  Requires <code className="rounded bg-muted px-1 font-mono text-xs text-foreground">fluiq.secure(mode="block")</code>.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${draft.scan_responses ? "border-[#1860D3]/30 bg-[#1860D3]/5 dark:border-[#6FA8FF]/30 dark:bg-[#6FA8FF]/5" : "border-border/60 hover:bg-muted/40"}`}>
                  <Checkbox checked={draft.scan_responses} onCheckedChange={(v) => setDraft((d) => ({ ...d, scan_responses: Boolean(v) }))} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Enable response scanning</p>
                    <p className="text-xs text-muted-foreground">Adds ~50–200ms per call. Responses containing PII or secrets are blocked before being returned.</p>
                  </div>
                </label>
              </CardContent>
            </Card>

            {/* ── PII entity policy ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">PII detection</CardTitle>
                <CardDescription>
                  Choose which personal-data types are tracked. Unchecked entities are ignored —
                  they never raise PII flags, are excluded from risk scoring, and are left unredacted.
                  Applies in warn mode and the response gate.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {PII_ENTITIES.map((ent) => {
                    const tracked = !draft.pii_ignore.includes(ent.id)
                    return (
                      <label key={ent.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${tracked ? "border-[#1860D3]/30 bg-[#1860D3]/5 dark:border-[#6FA8FF]/30 dark:bg-[#6FA8FF]/5" : "border-border/60 hover:bg-muted/40"}`}>
                        <Checkbox checked={tracked} onCheckedChange={() => togglePiiEntity(ent.id)} className="mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{ent.label}</p>
                          <p className="text-xs text-muted-foreground">{ent.description}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
                {draft.pii_ignore.length > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Ignoring {draft.pii_ignore.length} {draft.pii_ignore.length === 1 ? "type" : "types"} — these are suppressed everywhere.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ── Custom phrase lists ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custom phrase lists</CardTitle>
                <CardDescription>One phrase per line. Checked before any scanner runs.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <SectionHeader title="Deny list" description="Prompts containing any of these phrases are always blocked." />
                  <textarea
                    className="h-36 w-full rounded-md border border-border/60 bg-muted/30 px-3 py-2 font-mono text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring"
                    placeholder={"competitor product name\nconfidential pricing\nsocial security number"}
                    value={draft.custom_deny_list.join("\n")}
                    onChange={(e) => setDraft((d) => ({ ...d, custom_deny_list: e.target.value.split("\n") }))}
                  />
                </div>
                <div>
                  <SectionHeader title="Allow list" description="Prompts containing any of these phrases are always allowed, skipping all scans." />
                  <textarea
                    className="h-36 w-full rounded-md border border-border/60 bg-muted/30 px-3 py-2 font-mono text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring"
                    placeholder={"internal test harness\nautomated regression suite"}
                    value={draft.custom_allow_list.join("\n")}
                    onChange={(e) => setDraft((d) => ({ ...d, custom_allow_list: e.target.value.split("\n") }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Tool allowlist ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tool allowlist</CardTitle>
                <CardDescription>
                  One tool name per line. When set, any tool the agent invokes that is not on this
                  list is flagged as a <span className="font-mono">tool_policy_violation</span>. Leave
                  empty to allow all tools (no enforcement).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  className="h-36 w-full rounded-md border border-border/60 bg-muted/30 px-3 py-2 font-mono text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring"
                  placeholder={"search_web\nread_file\nget_weather"}
                  value={draft.allowed_tools.join("\n")}
                  onChange={(e) => setDraft((d) => ({ ...d, allowed_tools: e.target.value.split("\n") }))}
                />
                {draft.allowed_tools.filter((t) => t.trim()).length === 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    No allowlist configured — all tool calls are permitted.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ── Save / delete bar ── */}
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-4 py-3">
              <div className="flex items-center gap-2">
                {activeSlug !== "default" && (
                  <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:text-destructive">
                    <HugeiconsIcon icon={deleting ? Loading03Icon : Delete02Icon} size={13} className={deleting ? "animate-spin" : undefined} />
                    {deleting ? "Deleting…" : "Delete policy"}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Changes apply within ~60 seconds.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {saved && <span className="text-xs font-medium text-emerald-600">Saved</span>}
                <Button onClick={handleSave} disabled={saving}>
                  <HugeiconsIcon icon={saving ? Loading03Icon : FloppyDiskIcon} size={14} className={saving ? "animate-spin" : undefined} />
                  {saving ? "Saving…" : "Save policy"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
