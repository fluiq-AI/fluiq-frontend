import { useEffect, useState } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  Key01Icon,
  Loading03Icon,
  PlusSignIcon,
  RefreshIcon,
  SquareLock01Icon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Credential {
  credential_id:    string
  provider:         string
  label:            string | null
  /** Display-only suffix, e.g. "…a1B2". The key itself is never returned. */
  key_preview:      string
  fingerprint:      string
  status:           "active" | "invalid" | "revoked"
  last_verified_at: string | null
  last_error:       string | null
  created_at:       string | null
}

interface CredentialsResponse {
  configured:  boolean
  providers:   string[]
  credentials: Credential[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  openai:       "OpenAI",
  anthropic:    "Anthropic",
  gemini:       "Google Gemini",
  moonshot:     "Moonshot (Kimi)",
  azure_openai: "Azure OpenAI",
  bedrock:      "AWS Bedrock",
}

/** Providers we can authenticate against directly at paste time. */
const VERIFIABLE = new Set(["openai", "anthropic", "gemini", "moonshot"])

// Temporarily hidden from the "add a key" select. Azure OpenAI and AWS Bedrock
// can be stored, but the evaluator's judge has no execution path for them yet
// (Bedrock is SigV4 with multi-field creds; Azure needs endpoint + deployment +
// api-version — neither fits the single-key form or LLMJudge today), so a saved
// key would show Active and then fail at eval time. Their labels stay in
// PROVIDER_LABELS so any already-stored credential still renders. Re-enable by
// removing entries here once the adapters land.
const HIDDEN_PROVIDERS = new Set(["azure_openai", "bedrock"])

function providerLabel(id: string) {
  return PROVIDER_LABELS[id] ?? id
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Credentials() {
  const [configured, setConfigured] = useState(true)
  const [providers, setProviders]   = useState<string[]>([])
  const [creds, setCreds]           = useState<Credential[]>([])
  const [loading, setLoading]       = useState(true)

  const [provider, setProvider] = useState("openai")
  const [apiKey, setApiKey]     = useState("")
  const [label, setLabel]       = useState("")
  const [adding, setAdding]     = useState(false)

  const [verifying, setVerifying]     = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Credential | null>(null)
  const [deleting, setDeleting]       = useState(false)

  async function load() {
    try {
      const data = await authFetch<CredentialsResponse>("/api/v1/credentials")
      setConfigured(data.configured)
      setProviders(data.providers ?? [])
      setCreds(data.credentials ?? [])
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to load provider keys")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleAdd() {
    if (!apiKey.trim()) return
    setAdding(true)
    try {
      await authFetch("/api/v1/credentials", {
        method: "POST",
        body: { provider, api_key: apiKey.trim(), label: label.trim() || null },
      })
      // Clear immediately. The key is not recoverable and must not linger in
      // component state or in the DOM after it has been stored.
      setApiKey("")
      setLabel("")
      toast.success(`${providerLabel(provider)} key saved`)
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Could not save the key")
    } finally {
      setAdding(false)
    }
  }

  async function handleVerify(cred: Credential) {
    setVerifying(cred.credential_id)
    try {
      const res = await authFetch<{ status: string; error: string | null }>(
        `/api/v1/credentials/${cred.credential_id}/verify`,
        { method: "POST" },
      )
      if (res.status === "active") toast.success("Key verified")
      else toast.error(res.error ?? "Key is no longer valid")
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Verification failed")
    } finally {
      setVerifying(null)
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await authFetch(`/api/v1/credentials/${pendingDelete.credential_id}`, { method: "DELETE" })
      toast.success("Key deleted")
      setPendingDelete(null)
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Could not delete the key")
    } finally {
      setDeleting(false)
    }
  }

  const providerOptions = (providers.length ? providers : Object.keys(PROVIDER_LABELS))
    .filter((p) => !HIDDEN_PROVIDERS.has(p))

  return (
    <>
      <DashboardPageHeader
        title="Provider Keys"
        description="Run your evaluations on your own provider account, so judge tokens bill to you."
      />

      <div className="space-y-5 px-6 py-6">

        {!configured && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <HugeiconsIcon icon={Alert02Icon} size={14} className="mt-0.5 shrink-0" />
            <span>
              Credential storage is not configured on this deployment, so keys cannot be
              saved. Contact your administrator.
            </span>
          </div>
        )}

        {/* ── Add a key ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Key01Icon} size={16} />
              Add a provider key
            </CardTitle>
            <CardDescription>
              Keys are encrypted before they are stored and are never shown again.
              Only the last four characters are displayed. To change a key, add the
              new one and delete the old.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="cred-provider">Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger id="cred-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providerOptions.map((p) => (
                      <SelectItem key={p} value={p}>{providerLabel(p)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cred-key">API key</Label>
                <Input
                  id="cred-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-…"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={!configured}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cred-label">Label (optional)</Label>
              <Input
                id="cred-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Production account"
                maxLength={120}
                disabled={!configured}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] text-muted-foreground">
                {VERIFIABLE.has(provider)
                  ? "We make one free, token-less call to confirm the key works before saving it."
                  : `${providerLabel(provider)} keys cannot be checked automatically and are saved unverified.`}
              </p>
              <Button onClick={handleAdd} disabled={!configured || adding || !apiKey.trim()}>
                {adding
                  ? <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
                  : <HugeiconsIcon icon={PlusSignIcon} size={14} />}
                {adding ? "Checking…" : "Add key"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Stored keys ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={SquareLock01Icon} size={16} />
              Stored keys
            </CardTitle>
            <CardDescription>
              When a key stops working, evaluations for that provider stop rather than
              falling back to Fluiq&apos;s own account, so a broken key is visible here
              instead of quietly changing who pays.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
                Loading…
              </div>
            ) : creds.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No provider keys yet. Evaluations run on Fluiq&apos;s managed account.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {creds.map((c) => (
                  <div key={c.credential_id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{providerLabel(c.provider)}</span>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-muted-foreground">
                          {c.key_preview}
                        </code>
                        {c.status === "active" ? (
                          <Badge variant="muted" className="gap-1">
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} />
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="gap-1 border-destructive/30 bg-destructive/10 text-destructive"
                          >
                            <HugeiconsIcon icon={Alert02Icon} size={11} />
                            {c.status === "invalid" ? "Invalid" : "Revoked"}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                        {c.label ? `${c.label} · ` : ""}
                        added {formatDate(c.created_at)}
                        {c.last_verified_at ? ` · last verified ${formatDate(c.last_verified_at)}` : ""}
                      </p>
                      {c.last_error && (
                        <p className="mt-0.5 text-[12px] text-destructive">{c.last_error}</p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVerify(c)}
                      disabled={verifying === c.credential_id}
                    >
                      <HugeiconsIcon
                        icon={verifying === c.credential_id ? Loading03Icon : RefreshIcon}
                        size={14}
                        className={verifying === c.credential_id ? "animate-spin" : undefined}
                      />
                      Verify
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setPendingDelete(c)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={14} />
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => { if (!v) setPendingDelete(null) }}
        title="Delete this provider key?"
        description={
          <>
            The {providerLabel(pendingDelete?.provider ?? "")} key ending{" "}
            <code className="rounded bg-muted px-1 py-0.5">{pendingDelete?.key_preview}</code>{" "}
            will be permanently deleted. Evaluations using it will stop until you add a
            replacement. This cannot be undone.
          </>
        }
        // Typing the last four forces a look at *which* key is being removed.
        // an org with several keys per provider can otherwise delete the wrong one.
        confirmWord={(pendingDelete?.key_preview ?? "").replace(/^…/, "")}
        confirmLabel="Delete key"
        destructive
        busy={deleting}
        onConfirm={handleDelete}
      />
    </>
  )
}
