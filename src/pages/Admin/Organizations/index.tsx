import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { RefreshIcon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"

interface OrgAdminView {
  org_id: string
  org_name: string
  owner_email: string | null
  owner_name: string | null
  owner_type: string | null
  api_key_usage: number
  api_key_limit: number
  created_at: string
}

interface OrgListResponse {
  organizations: OrgAdminView[]
  total: number
  page: number
  limit: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function AdminOrganizations() {
  const [data, setData] = useState<OrgListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const LIMIT = 50

  async function load(p = page) {
    setError(null)
    try {
      const res = await authFetch<OrgListResponse>(
        `/admin/organizations?page=${p}&limit=${LIMIT}`,
      )
      setData(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load organizations")
    }
  }

  useEffect(() => { load(1) }, [])

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1

  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Organizations
        </h1>
        <p className="mt-2 text-muted-foreground">
          {data ? `${data.total.toLocaleString()} organizations total` : "Loading…"}
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => load()}>
          <HugeiconsIcon icon={RefreshIcon} size={14} />
          Refresh
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Organization</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">API Keys</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {!data ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : data.organizations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No organizations found.
                </td>
              </tr>
            ) : (
              data.organizations.map((org) => (
                <tr
                  key={org.org_id}
                  className="bg-background hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{org.org_name}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{org.owner_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{org.owner_email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {org.owner_type ? (
                      <Badge variant="outline">{org.owner_type}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {org.api_key_usage} / {org.api_key_limit}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(org.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => { setPage((p) => p - 1); load(page - 1) }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => { setPage((p) => p + 1); load(page + 1) }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

export default AdminOrganizations
