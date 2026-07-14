import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"

/** Neutral full-screen loader shown by the auth guards before the client has
 * hydrated the persisted auth state (see RequireAuth / RequireAdmin). */
export function AuthGateLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <HugeiconsIcon icon={Loading03Icon} size={22} className="animate-spin text-muted-foreground" />
    </div>
  )
}
