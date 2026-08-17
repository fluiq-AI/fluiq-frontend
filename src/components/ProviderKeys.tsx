import { useCallback, useEffect, useState } from "react"
import { Loading03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Shared BYOK provider-key UI + state. Used by every run flow that gates on the
 * selected model's provider having a usable key (dataset runs, the prompt
 * playground), so the "no key → add key → run" experience is identical
 * everywhere and the provider vocabulary can't drift.
 */

// Mirrors fluiq-api/shared/providers.py. Kept in step by hand: an unlabelled
// provider falls back to its raw id, which is ugly rather than broken.
export const PROVIDER_LABEL: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google (Gemini)",
  mistral: "Mistral",
  groq: "Groq",
  together: "Together AI",
  fireworks: "Fireworks",
  perplexity: "Perplexity",
  xai: "xAI (Grok)",
  cerebras: "Cerebras",
  deepseek: "DeepSeek",
  moonshot: "Moonshot (Kimi)",
  zai: "Z.AI (GLM)",
  openrouter: "OpenRouter",
  vercel: "Vercel AI Gateway",
  baseten: "Baseten",
  deepinfra: "DeepInfra",
  sambanova: "SambaNova",
  nebius: "Nebius AI Studio",
  novita: "Novita AI",
  hyperbolic: "Hyperbolic",
  vertex: "Google Vertex AI",
  databricks: "Databricks",
  cloudflare: "Cloudflare Workers AI",
  azure_openai: "Azure OpenAI",
  bedrock: "AWS Bedrock",
}

export interface ProviderKeyState {
  /** Whether credential storage is configured on this deployment at all. */
  configured: boolean
  /** Providers with a saved BYOK key. */
  savedProviders: Set<string>
  /** Providers Fluiq holds a managed platform key for. */
  managedProviders: Set<string>
  /** Re-fetch after a key is added. */
  reload: () => Promise<void>
}

/**
 * Loads which providers have a usable key for this org. ``enabled`` gates the
 * fetch so a closed drawer doesn't hit the endpoint until it opens. Failures are
 * treated as "unknown" (empty sets) rather than blocking a run over a hint.
 */
export function useProviderKeys(enabled: boolean): ProviderKeyState {
  const [configured, setConfigured] = useState(true)
  const [savedProviders, setSavedProviders] = useState<Set<string>>(new Set())
  const [managedProviders, setManagedProviders] = useState<Set<string>>(new Set())

  const reload = useCallback(async () => {
    try {
      const res = await authFetch<{
        configured: boolean
        managed_providers: string[]
        credentials: { provider: string; status?: string }[]
      }>("/api/v1/credentials")
      setConfigured(res.configured)
      setManagedProviders(new Set(res.managed_providers ?? []))
      setSavedProviders(new Set((res.credentials ?? []).map((c) => c.provider)))
    } catch {
      setManagedProviders(new Set())
      setSavedProviders(new Set())
    }
  }, [])

  useEffect(() => {
    if (enabled) reload()
  }, [enabled, reload])

  return { configured, savedProviders, managedProviders, reload }
}

/**
 * Given the providers of the selected models, returns the ones with no usable
 * key (neither a saved BYOK key nor a managed platform key). A run should be
 * blocked while this is non-empty.
 */
export function missingKeyProviders(
  providers: string[],
  state: Pick<ProviderKeyState, "savedProviders" | "managedProviders">,
): string[] {
  return Array.from(new Set(providers)).filter(
    (p) => !state.savedProviders.has(p) && !state.managedProviders.has(p),
  )
}

/**
 * Warns when a selected model's provider has no key the run can use (no saved
 * BYOK key and no managed platform key), and offers to add one. The run button
 * is disabled by the caller while any provider here is missing.
 */
export function MissingKeysCallout({
  providers,
  configured,
  onAdd,
}: {
  providers: string[]
  configured: boolean
  onAdd: (provider: string) => void
}) {
  if (providers.length === 0) return null
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive">
      <p className="font-medium">
        No key for {providers.map((p) => PROVIDER_LABEL[p] ?? p).join(", ")}.
      </p>
      <p className="mt-0.5 text-destructive/80">
        {configured
          ? "Add a key for each to run on this provider."
          : "Credential storage isn't configured on this deployment, so a key can't be saved here. Set a managed key on the evaluator, or pick a provider that already has one."}
      </p>
      {configured ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {providers.map((p) => (
            <Button
              key={p}
              variant="outline"
              size="sm"
              className="h-6 border-destructive/40 px-2 text-[11px] text-destructive hover:text-destructive"
              onClick={() => onAdd(p)}
            >
              Add {PROVIDER_LABEL[p] ?? p} key
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Paste-and-verify dialog for a provider API key. The key is verified against
 * the provider before it's stored (encrypted, write-only) via /credentials, so
 * a bad key is rejected here rather than surfacing as a failed run later.
 */
export function ProviderKeyDialog({
  provider,
  configured,
  onClose,
  onSaved,
}: {
  provider: string | null
  configured: boolean
  onClose: () => void
  onSaved: (provider: string) => void
}) {
  const [apiKey, setApiKey] = useState("")
  const [label, setLabel] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = provider !== null

  function handleOpenChange(next: boolean) {
    if (saving) return
    if (!next) {
      setApiKey("")
      setLabel("")
      setError(null)
      onClose()
    }
  }

  async function save() {
    if (!provider || !apiKey.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      await authFetch("/api/v1/credentials", {
        method: "POST",
        body: { provider, api_key: apiKey.trim(), label: label.trim() || undefined },
      })
      toast.success(`${PROVIDER_LABEL[provider] ?? provider} key saved`)
      setApiKey("")
      setLabel("")
      onSaved(provider)
    } catch (err) {
      // The API returns 422 with the provider's own reason for a bad key.
      setError(err instanceof ApiError ? err.detail : "Couldn't save the key")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add {provider ? (PROVIDER_LABEL[provider] ?? provider) : "provider"} key
          </DialogTitle>
          <DialogDescription>
            Verified with the provider and stored encrypted. It's used to run this
            org's calls on your own account, and is never shown again.
          </DialogDescription>
        </DialogHeader>

        {!configured ? (
          <p className="text-xs text-destructive">
            Credential storage isn't configured on this deployment.
          </p>
        ) : (
          <div className="mt-1 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="provider-key" className="text-xs">API key</Label>
              <Input
                id="provider-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your key"
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && apiKey.trim() && !saving) save()
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="provider-key-label" className="text-xs">
                Label <span className="font-normal text-muted-foreground/60">(optional)</span>
              </Label>
              <Input
                id="provider-key-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. team account"
                className="h-8 text-sm"
              />
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={!configured || !apiKey.trim() || saving}>
            {saving ? (
              <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin" />
            ) : null}
            Verify &amp; save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
