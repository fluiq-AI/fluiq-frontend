import { useEffect, useState } from "react"

import { DashboardPageHeader } from "@/components/DashboardPageHeader"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import type {
  ApiKey,
  ApiKeyCreated,
  OrganizationModel,
} from "@/lib/auth-types"
import { setOrganization } from "@/store/auth/slice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"

import { CreateKeyModal } from "./CreateKeyModal"
import { KeyTable } from "./KeyTable"
import { RevealedKeyBanner } from "./RevealedKeyBanner"

function ApiManagement() {
  const dispatch = useAppDispatch()
  const { organization } = useAppSelector((s) => s.auth)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [revealedKey, setRevealedKey] = useState<ApiKeyCreated | null>(null)

  useEffect(() => {
    if (!copiedId) return
    const t = window.setTimeout(() => setCopiedId(null), 1500)
    return () => window.clearTimeout(t)
  }, [copiedId])

  if (!organization) return null

  // const limitReached = organization.api_key_usage >= organization.api_key_limit

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
    } catch {
      window.prompt("Copy this value:", text)
    }
  }

  function handleCreated(created: ApiKeyCreated) {
    const stored: ApiKey = {
      key_id: created.key_id,
      name: created.name,
      prefix: created.prefix,
      created_at: created.created_at,
    }
    const next: OrganizationModel = {
      ...organization!,
      api_keys: [...organization!.api_keys, stored],
      api_key_usage: organization!.api_key_usage + 1,
    }
    dispatch(setOrganization(next))
    setRevealedKey(created)
    setIsModalOpen(false)
  }

  async function handleDelete(key: ApiKey) {
    if (!window.confirm(`Delete API key "${key.name}"? This cannot be undone.`))
      return
    setDeletingId(key.key_id)
    try {
      await authFetch<void>(`/api-keys/${key.key_id}`, { method: "DELETE" })
      const next: OrganizationModel = {
        ...organization!,
        api_keys: organization!.api_keys.filter((k) => k.key_id !== key.key_id),
        api_key_usage: Math.max(organization!.api_key_usage - 1, 0),
      }
      dispatch(setOrganization(next))
      if (revealedKey?.key_id === key.key_id) setRevealedKey(null)
    } catch (err) {
      window.alert(
        err instanceof ApiError ? err.detail : "Failed to delete API key",
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <DashboardPageHeader
        title="API Management"
        description="Issue, rotate, and revoke API keys for your organization."
      />
      <div className="px-6 py-6">
      {revealedKey && (
        <RevealedKeyBanner
          revealedKey={revealedKey}
          copied={copiedId === revealedKey.key_id}
          onCopy={() => copyText(revealedKey.key_id, revealedKey.key)}
          onDismiss={() => setRevealedKey(null)}
        />
      )}

      <KeyTable
        keys={organization.api_keys}
        usage={organization.api_key_usage}
        limit={organization.api_key_limit}
        copiedId={copiedId}
        deletingId={deletingId}
        onCopyPrefix={(k) => copyText(k.key_id, k.prefix)}
        onDelete={handleDelete}
        setIsModalOpen={setIsModalOpen}
      />

      <CreateKeyModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
      />
      </div>
    </>
  )
}

export default ApiManagement
