import { Alert02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import type { RealtimeError } from "@/lib/useRealtimeStream"

interface RealtimeStatusBannerProps {
  /** When `null`, the banner is not rendered at all. */
  error: RealtimeError | null
  /** Override the bold heading. Defaults match the trace stream copy. */
  title?: string
  /**
   * Trailing copy shown after the server's `detail` for the 402 variant
   * to point users at the still-working manual fallback. Set `null` to
   * suppress when the consumer has no obvious fallback (e.g. live-only
   * tabs).
   */
  fallbackHint?: string | null
  className?: string
}

/**
 * Reusable status banner for SSE consumers. Renders an amber "soft" pause
 * for 402 (quota) and a destructive variant for any other unrecoverable
 * handshake failure surfaced by `useRealtimeStream`.
 */
export function RealtimeStatusBanner({
  error,
  title,
  fallbackHint = "The Refresh button still works for historical data.",
  className,
}: RealtimeStatusBannerProps) {
  if (!error) return null
  const isQuota = error.status === 402
  const heading =
    title ??
    (isQuota
      ? "Realtime paused \u2014 quota exceeded"
      : "Realtime stream unavailable")
  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        isQuota
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          : "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
    >
      <HugeiconsIcon icon={Alert02Icon} size={14} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <div className="font-medium">{heading}</div>
        <p className="mt-0.5 text-xs opacity-90">
          {error.detail}
          {isQuota && fallbackHint ? ` ${fallbackHint}` : null}
        </p>
      </div>
    </div>
  )
}
