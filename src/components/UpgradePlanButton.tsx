import { useState } from "react"
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
import { toast } from "sonner"

import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"

type BillableTier = Exclude<UserType, "Admin">

// Tier order matches the pricing page; index lookup gives the "next" tier.
const TIER_ORDER: BillableTier[] = ["Free", "Team", "Growth", "Enterprise"]

// Plans a Free user can trial for 5 days, no card required. Mirrors the
// backend's TRIALABLE_TIERS; keep the two in sync.
const TRIALABLE_TIERS: BillableTier[] = ["Team", "Growth"]
const TRIAL_DAYS = 5

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
  const [starting, setStarting] = useState<BillableTier | null>(null)

  if (current === "Admin") return null

  // A Free account hasn't paid or trialed yet — offer the self-serve 5-day
  // trial of each paid plan. Starting one flips the tier server-side; a full
  // reload refreshes every tier-gated surface at once. Eligibility (one trial
  // per account) is enforced by the API, which returns a reason we surface.
  if (current === "Free") {
    async function startTrial(plan: BillableTier) {
      if (starting) return
      setStarting(plan)
      try {
        await authFetch("/api/v1/billing/trial", { method: "POST", body: { plan } })
        window.location.reload()
      } catch (err) {
        setStarting(null)
        toast.error(
          err instanceof ApiError ? err.detail : "Could not start your trial. Please try again.",
        )
      }
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size={size} disabled={starting !== null}>
            {starting ? `Starting ${starting} trial…` : `Start ${TRIAL_DAYS}-day free trial`}
            <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{TRIAL_DAYS}-day free trial · no card</DropdownMenuLabel>
          {TRIALABLE_TIERS.map((plan) => (
            <DropdownMenuItem
              key={plan}
              disabled={starting !== null}
              onSelect={(e) => {
                e.preventDefault()
                void startTrial(plan)
              }}
            >
              <HugeiconsIcon icon={TIER_ICON[plan]} size={14} />
              <span>Try {plan} free for {TRIAL_DAYS} days</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate("/pricing")}>
            <span>Compare plans{"…"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

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
