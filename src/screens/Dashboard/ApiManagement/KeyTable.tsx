import {
  ApiIcon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Delete02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Tip } from "@/components/ui/tooltip"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ApiKey } from "@/lib/auth-types"

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function KeyTable({
  keys,
  usage,
  limit,
  copiedId,
  deletingId,
  onCopyPrefix,
  onDelete,
  setIsModalOpen,
}: {
  keys: ApiKey[]
  usage: number
  limit: number
  copiedId: string | null
  deletingId: string | null
  onCopyPrefix: (key: ApiKey) => void
  onDelete: (key: ApiKey) => void
  setIsModalOpen: (open: boolean) => void
}) {
  const limitReached = usage >= limit
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={ApiIcon} size={16} />
            <CardTitle className="text-base">API keys</CardTitle>
          </div>
          <Button size="sm" onClick={() => setIsModalOpen(true)} disabled={limitReached}>
            <HugeiconsIcon icon={PlusSignIcon} />
            Create API key
          </Button>
        </div>
        <CardDescription>
          {usage} of {limit} keys in use on this plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {keys.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No API keys yet. Create your first key to start instrumenting traces.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-2 font-medium">Name</th>
                  <th className="px-6 py-2 font-medium">Key</th>
                  <th className="px-6 py-2 font-medium">Created</th>
                  <th className="px-6 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr
                    key={k.key_id}
                    className="border-b border-border/60 last:border-b-0"
                  >
                    <td className="px-6 py-3 font-medium">{k.name}</td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                      {k.prefix}
                      <span className="text-muted-foreground/60">{"\u2026"}</span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {formatDate(k.created_at)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Tip content="Copy prefix">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onCopyPrefix(k)}
                          >
                            <HugeiconsIcon
                              icon={
                                copiedId === k.key_id
                                  ? CheckmarkCircle02Icon
                                  : Copy01Icon
                              }
                            />
                          </Button>
                        </Tip>
                        <Tip content="Delete key">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onDelete(k)}
                            disabled={deletingId === k.key_id}
                            className="text-destructive hover:text-destructive"
                          >
                            <HugeiconsIcon
                              icon={
                                deletingId === k.key_id
                                  ? Loading03Icon
                                  : Delete02Icon
                              }
                              className={
                                deletingId === k.key_id ? "animate-spin" : undefined
                              }
                            />
                          </Button>
                        </Tip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
