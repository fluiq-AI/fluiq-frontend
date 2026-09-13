"use client"

import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Book02Icon, SourceCodeIcon, Calculator01Icon, GithubIcon, CloudServerIcon, HelpCircleIcon, ShieldKeyIcon /*, News01Icon */ } from "@hugeicons/core-free-icons"

import { useSiteHost } from "@/contexts/SiteHostContext"
import { siblingOrigin } from "@/lib/site-host"

type NavItem = {
  name: string
  slug: string
  description: string
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
} & ({ to: string; href?: never } | { to?: never; href: string })

/** Three columns: what to read, what to build against, what to play with.
 *
 * The flat list this replaced put a hosted marketing page, the SDK reference and
 * four standalone tools in one run of eight rows, so the only way to find
 * anything was to read all of it. Grouping costs the width of a wider panel,
 * which is affordable because this nav is desktop-only.
 *
 * Takes the request host because polygate is served as a subdomain of whichever
 * domain the visitor is on, not of one hardcoded domain.
 */
const navGroups = (host: string): { heading: string; items: NavItem[] }[] => [
  {
    heading: "Learn",
    items: [
      // The blog was served from the API, which is gone. Uncomment this entry
      // and News01Icon in the import above to restore it.
      // {
      //   name: "Blogs",
      //   slug: "blog",
      //   to: "/blog",
      //   description: "Writing on evals, security & cost",
      //   icon: News01Icon,
      // },
      {
        name: "FAQ",
        slug: "faq",
        to: "/faq",
        description: "Pricing, evals, security & data",
        icon: HelpCircleIcon,
      },
    ],
  },
  {
    heading: "Build",
    items: [
      {
        name: "Fluiq Docs",
        slug: "documentation",
        to: "/documentation",
        description: "Guides, concepts & SDK reference",
        icon: Book02Icon,
      },
      {
        name: "Code Samples",
        slug: "examples",
        to: "/examples",
        description: "Copy-paste integration snippets",
        icon: SourceCodeIcon,
      },
    ],
  },
  {
    heading: "Tools",
    items: [
      {
        name: "Response Gate Demo",
        slug: "response-gate-demo",
        to: "/response-gate-demo",
        description: "What an LLM leaks while refusing",
        icon: ShieldKeyIcon,
      },
      {
        name: "LLM Cost Calculator",
        slug: "llm-cost-calculator",
        to: "/llm-cost-calculator",
        description: "Compare OpenAI, Claude & Gemini",
        icon: Calculator01Icon,
      },
      {
        name: "polygate",
        slug: "polygate",
        href: siblingOrigin("polygate", host),
        description: "Open-source unified LLM client",
        icon: GithubIcon,
      },
      {
        name: "Infrager",
        slug: "infrager",
        to: "/infrager",
        description: "Diagrams to secure Terraform",
        icon: CloudServerIcon,
      },
    ],
  },
]

interface Props {
  /** Class names applied to the trigger button. Default matches the marketing-page nav style. */
  triggerClassName?: string
}

const ITEM_CLASS = `flex items-start gap-2.5 rounded-xl px-2.5 py-2
                    hover:bg-[#F2F0E9] dark:hover:bg-[#1A1A1A]
                    transition-colors`

function ItemBody({ item }: { item: NavItem }) {
  return (
    <>
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
        <span className="block text-[12px] leading-snug text-[#6B6B66] dark:text-[#9A9A92]">
          {item.description}
        </span>
      </span>
    </>
  )
}

export function NavDeveloperDropdown({
  triggerClassName = "hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors",
}: Props) {
  const NAV_GROUPS = navGroups(useSiteHost())
  return (
    <div className="relative group">
      <button
        type="button"
        aria-haspopup="true"
        className={`flex items-center gap-1 ${triggerClassName}`}
      >
        Resources
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"
          className="transition-transform duration-200 group-hover:rotate-180">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown panel — opens on hover or keyboard focus-within */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50
                      invisible opacity-0 pointer-events-none
                      group-hover:visible group-hover:opacity-100 group-hover:pointer-events-auto
                      group-focus-within:visible group-focus-within:opacity-100 group-focus-within:pointer-events-auto
                      transition-all duration-150">
        {/* Wide enough that the descriptions sit on one line each. At 720px
            every one of them wrapped, which doubled the row height and made
            three short columns read as one tall block. */}
        <div className="w-[880px] max-w-[calc(100vw-2rem)]
                        rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A]
                        bg-[#FAF9F6] dark:bg-[#111111] p-4"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)" }}>

          <div className="grid grid-cols-3 gap-x-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.heading}>
                <p className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wide
                              text-[#9A9A92] dark:text-[#6B6B66]">
                  {group.heading}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.slug}>
                      {item.href ? (
                        <a href={item.href} target="_blank" rel="noopener noreferrer" className={ITEM_CLASS}>
                          <ItemBody item={item} />
                        </a>
                      ) : (
                        <Link to={item.to} className={ITEM_CLASS}>
                          <ItemBody item={item} />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
