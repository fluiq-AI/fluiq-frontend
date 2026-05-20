import { useNavigate } from "react-router"
import {
  ArrowUpRight01Icon,
  RocketIcon,
  ChartLineData01Icon,
  Building01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { UserType } from "@/lib/auth-types"

type BillableTier = Exclude<UserType, "Admin">

// Tier order matches the pricing page; index lookup gives the "next" tier.
const TIER_ORDER: BillableTier[] = ["Free", "Team", "Growth", "Enterprise"]

const TIER_ICON: Record<BillableTier, typeof RocketIcon> = {
  Free: RocketIcon,
  Team: RocketIcon,
  Growth: ChartLineData01Icon,
  Enterprise: Building01Icon,
}

function nextTier(current: BillableTier): BillableTier | null {
  const i = TIER_ORDER.indexOf(current)
  if (i < 0 || i >= TIER_ORDER.length - 1) return null
  return TIER_ORDER[i + 1]
}

export function UpgradePlanButton({
  current,
  size = "sm",
}: {
  current: UserType
  size?: "sm" | "default"
}) {
  const navigate = useNavigate()

  if (current === "Admin") return null

  const next = nextTier(current)

  // Enterprise has no upgrade target \u2014 collapse to a single "Contact sales"
  // shortcut that drops the user on the pricing page's CTA anchor.
  if (next === null) {
    return (
      <Button
        variant="outline"
        size={size}
        // onClick={() => navigate("/pricing#contact")}
      >
        Contact sales
        <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size}>
          Upgrade
          <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Upgrade plan</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => navigate(`/pricing#${next.toLowerCase()}`)}>
          <HugeiconsIcon icon={TIER_ICON[next]} size={14} />
          <span>Upgrade to {next}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/pricing")}>
          <span>Choose another plan{"\u2026"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
