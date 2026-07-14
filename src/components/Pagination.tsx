import type { ReactNode } from "react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Windowed Previous/Next pagination — one page in memory at a time, no infinite
 * append. `page` is 0-indexed. `hasMore` is true when the current page came back
 * full (a further page likely exists); the APIs don't return a total count, so
 * we page rather than show "N of M". Renders nothing on a lone first page.
 */
export function Pagination({
  page,
  hasMore,
  loading = false,
  onPrev,
  onNext,
  label,
  className,
  compact = false,
}: {
  page: number
  hasMore: boolean
  loading?: boolean
  onPrev: () => void
  onNext: () => void
  label?: ReactNode
  className?: string
  /** Tight layout for narrow containers (sidebars): icon-only buttons. */
  compact?: boolean
}) {
  if (page === 0 && !hasMore) return null

  if (compact) {
    return (
      <div className={cn("flex items-center justify-between gap-2 px-2 py-1.5", className)}>
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={onPrev}
          disabled={page === 0 || loading}
          aria-label="Previous page"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={13} />
        </Button>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {label ?? `Page ${page + 1}`}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={onNext}
          disabled={!hasMore || loading}
          aria-label="Next page"
        >
          <HugeiconsIcon
            icon={loading ? Loading03Icon : ArrowRight01Icon}
            size={13}
            className={loading ? "animate-spin" : undefined}
          />
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-border/60 px-6 py-3",
        className,
      )}
    >
      <span className="text-xs text-muted-foreground">
        {label ?? `Page ${page + 1}`}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={page === 0 || loading}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!hasMore || loading}
        >
          Next
          <HugeiconsIcon
            icon={loading ? Loading03Icon : ArrowRight01Icon}
            className={loading ? "animate-spin" : undefined}
          />
        </Button>
      </div>
    </div>
  )
}
