import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight02Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

/**
 * Island CTA — a fully-rounded "button-in-button" pill.
 *
 * The trailing arrow never sits naked next to the label; it lives inside its
 * own circular enclosure flush with the pill's right edge. On hover the whole
 * pill presses inward while the inner circle drifts diagonally and scales up,
 * creating internal kinetic tension. All motion runs on a single bespoke
 * cubic-bezier so it reads as sprung mass, not a CSS default.
 *
 * Variants:
 *   primary — ink fill (cream in dark mode); the default action.
 *   accent  — cobalt fill; for the emphasised / highlighted action.
 *   ghost   — hairline glass pill, no inner icon; the secondary action.
 *
 * Pass `fullWidth` to stretch inside cards (label left, icon hugs the edge).
 *
 * An absolute `to` (anything starting with "http") renders a plain anchor that
 * opens in a new tab, rather than a router Link — the router would otherwise
 * treat it as an in-app path. This exists because every "Start free" CTA now
 * points at the GitHub org instead of a signup page that no longer exists.
 */

const SPRING = "duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"

type Variant = "primary" | "accent" | "ghost"
type SolidVariant = Exclude<Variant, "ghost">

const SHELL: Record<SolidVariant, string> = {
  primary:
    "bg-[#0a0a0a] text-white shadow-[0_1px_2px_rgba(0,0,0,0.18),0_12px_28px_-14px_rgba(24,96,211,0.5)] hover:bg-[#161616] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_12px_30px_-14px_rgba(111,168,255,0.45)] dark:hover:bg-[#F2F0E9]",
  accent:
    "bg-[#1860D3] text-white shadow-[0_1px_2px_rgba(0,0,0,0.14),0_14px_30px_-14px_rgba(24,96,211,0.65)] hover:bg-[#1453b8] dark:bg-[#6FA8FF] dark:text-[#0A0A0A] dark:hover:bg-[#8bb9ff]",
}

const ICON: Record<SolidVariant, string> = {
  primary: "bg-white/[0.12] dark:bg-black/[0.08]",
  accent: "bg-white/[0.18] dark:bg-black/[0.10]",
}

export function IslandCta({
  to,
  children,
  variant = "primary",
  fullWidth = false,
  className,
}: {
  to: string
  children: React.ReactNode
  variant?: Variant
  fullWidth?: boolean
  className?: string
}) {
  const isExternal = /^https?:\/\//.test(to)
  const Anchor = ({ className: cls, children: kids }: { className: string; children: React.ReactNode }) =>
    isExternal ? (
      <a href={to} target="_blank" rel="noopener noreferrer" className={cls}>{kids}</a>
    ) : (
      <Link to={to} className={cls}>{kids}</Link>
    )

  if (variant === "ghost") {
    return (
      <Anchor
        className={cn(
          `group/cta inline-flex h-12 items-center justify-center rounded-full border border-[#E5E1D6] bg-[#FAF9F6]/60 px-6 text-[14px] font-medium text-[#0a0a0a] backdrop-blur-sm transition-all ${SPRING} hover:border-[#1860D3]/40 hover:bg-[#F2F0E9] active:scale-[0.98] dark:border-[#2A2A2A] dark:bg-white/[0.03] dark:text-[#FAF9F6] dark:hover:border-[#6FA8FF]/40 dark:hover:bg-[#1A1A1A]`,
          fullWidth && "w-full",
          className,
        )}
      >
        {children}
      </Anchor>
    )
  }

  return (
    <Anchor
      className={cn(
        `group/cta inline-flex h-12 items-center gap-3 rounded-full py-1 pl-6 pr-1.5 text-[14px] font-medium transition-all ${SPRING} active:scale-[0.98]`,
        SHELL[variant],
        fullWidth && "w-full justify-between",
        className,
      )}
    >
      <span>{children}</span>
      <span
        className={cn(
          `flex size-9 items-center justify-center rounded-full transition-transform ${SPRING} group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-px group-hover/cta:scale-105`,
          ICON[variant],
        )}
      >
        <HugeiconsIcon icon={ArrowRight02Icon} size={15} />
      </span>
    </Anchor>
  )
}
