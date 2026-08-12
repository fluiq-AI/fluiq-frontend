import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight02Icon,
  EyeIcon,
  ShieldIcon,
  TestTube01Icon,
  AiContentGenerator01Icon,
  Notification01Icon,
  Database01Icon,
} from "@hugeicons/core-free-icons"

// The three pillars lead the menu; datasets and prompts are grouped beneath
// them because they are part of evaluation, not products of their own.
const NAV_PLATFORM = [
  {
    section: "Pillars",
    items: [
      { name: "Security",      to: "/security",      description: "Block attacks, redact PII and secrets", icon: ShieldIcon },
      { name: "Observability", to: "/observability", description: "Trace every call, cost, and latency", icon: EyeIcon },
      { name: "Evaluation",    to: "/evaluation",    description: "Score responses and whole agent runs", icon: TestTube01Icon },
    ],
  },
  {
    section: "Part of Evaluation",
    items: [
      { name: "Datasets",          to: "/datasets", description: "Golden sets that capture whole agent runs", icon: Database01Icon },
      { name: "Prompt Management", to: "/prompts",  description: "Version and deploy prompt templates", icon: AiContentGenerator01Icon },
    ],
  },
  {
    section: "Across the platform",
    items: [
      { name: "Alerts", to: "/alerts", description: "Push eval and security events to Slack", icon: Notification01Icon },
    ],
  },
]

interface Props {
  /** Class names applied to the trigger button. Default matches the marketing-page nav style. */
  triggerClassName?: string
}

export function NavPlatformDropdown({
  triggerClassName = "hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors",
}: Props) {
  return (
    <div className="relative group">
      <button
        type="button"
        aria-haspopup="true"
        className={`flex items-center gap-1 ${triggerClassName}`}
      >
        Platform
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"
          className="transition-transform duration-200 group-hover:rotate-180">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown panel: opens on hover or keyboard focus-within */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50
                      invisible opacity-0 pointer-events-none
                      group-hover:visible group-hover:opacity-100 group-hover:pointer-events-auto
                      group-focus-within:visible group-focus-within:opacity-100 group-focus-within:pointer-events-auto
                      transition-all duration-150">
        <div className="w-[340px] rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A]
                        bg-[#FAF9F6] dark:bg-[#111111] p-3"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)" }}>

          {NAV_PLATFORM.map((group) => (
            <div key={group.section} className="mb-1 last:mb-0">
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em]
                            text-[#9A9A92] dark:text-[#6B6B66]">
                {group.section}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="flex items-start gap-3 rounded-xl px-3 py-2.5
                                 hover:bg-[#F2F0E9] dark:hover:bg-[#1A1A1A]
                                 transition-colors group/item"
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg
                                       border border-[#E5E1D6] dark:border-[#2A2A2A]
                                       bg-white dark:bg-[#0A0A0A]
                                       text-[#1860D3] dark:text-[#6FA8FF]">
                        <HugeiconsIcon icon={item.icon} size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium
                                         text-[#0a0a0a] dark:text-[#FAF9F6]">
                          {item.name}
                        </span>
                        <span className="block text-[12px] text-[#6B6B66] dark:text-[#9A9A92]">
                          {item.description}
                        </span>
                      </span>
                      <HugeiconsIcon
                        icon={ArrowRight02Icon}
                        size={13}
                        className="ml-auto mt-1.5 shrink-0 text-[#9A9A92]
                                   opacity-0 -translate-x-1
                                   group-hover/item:opacity-100 group-hover/item:translate-x-0
                                   transition-all"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
