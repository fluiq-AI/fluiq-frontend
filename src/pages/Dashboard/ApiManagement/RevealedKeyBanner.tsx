import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ApiKeyCreated } from "@/lib/auth-types"

export function RevealedKeyBanner({
  revealedKey,
  copied,
  onCopy,
  onDismiss,
}: {
  revealedKey: ApiKeyCreated
  copied: boolean
  onCopy: () => void
  onDismiss: () => void
}) {
  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            size={16}
            className="text-primary"
          />
          <CardTitle className="text-base">New key created</CardTitle>
        </div>
        <CardDescription>
          Copy this key now &mdash; it won't be shown in full again.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-border/60 bg-background px-3 py-2 font-mono text-sm">
          {revealedKey.key}
        </code>
        <Button variant="outline" size="sm" onClick={onCopy}>
          <HugeiconsIcon icon={Copy01Icon} />
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onDismiss}>
          <HugeiconsIcon icon={Cancel01Icon} />
        </Button>
      </CardContent>
    </Card>
  )
}
