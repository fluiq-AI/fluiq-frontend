"use client"

import { useCallback, useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Key01Icon, Loading03Icon, RefreshIcon, ShieldKeyIcon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"

interface Param { name: string; type: string | null; last_modified: string | null }

export function SecretsTab() {
  const [params, setParams] = useState<Param[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch<{ parameters: Param[] }>("/admin/infra/secrets")
      setParams(res.parameters)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load parameters")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading && !params) {
    return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={16} /> Loading parameters…</div>
  }
  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        <Button size="sm" variant="outline" onClick={load}><HugeiconsIcon icon={RefreshIcon} size={14} /> Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">SSM Parameter Store · <span className="font-mono">/fluiq/prod/</span> · values are never exposed.</p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <HugeiconsIcon icon={loading ? Loading03Icon : RefreshIcon} className={loading ? "animate-spin" : ""} size={14} /> Refresh
        </Button>
      </div>
      <Card className="divide-y divide-border/50">
        {params?.map((p) => (
          <div key={p.name} className="flex items-center gap-3 px-4 py-2.5">
            <HugeiconsIcon icon={p.type === "SecureString" ? ShieldKeyIcon : Key01Icon} size={16} className={p.type === "SecureString" ? "text-rose-500" : "text-muted-foreground"} />
            <span className="flex-1 truncate font-mono text-sm">{p.name}</span>
            <Badge variant="muted">{p.type}</Badge>
            {p.last_modified && <span className="hidden text-xs text-muted-foreground sm:inline">{new Date(p.last_modified).toLocaleDateString()}</span>}
          </div>
        ))}
        {params && params.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted-foreground">No parameters found.</div>}
      </Card>
    </div>
  )
}
