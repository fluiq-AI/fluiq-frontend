"use client"

import { Link } from "react-router"

import { useSiteHost } from "@/contexts/SiteHostContext"
import { siblingOrigin } from "@/lib/site-host"

const COMPARE_LINKS = [
  { label: "vs LangSmith",  to: "/langsmith-alternative" },
  { label: "vs Langfuse",   to: "/langfuse-alternative" },
  { label: "vs Helicone",   to: "/helicone-alternative" },
  { label: "vs Braintrust", to: "/braintrust-alternative" },
  { label: "vs Portkey",    to: "/portkey-alternative" },
  { label: "vs Lakera",     to: "/lakera-alternative" },
]

const PLATFORM_LINKS = [
  { label: "Security",          to: "/security" },
  { label: "Observability",     to: "/observability" },
  { label: "Evaluation",        to: "/evaluation" },
  { label: "Datasets",          to: "/datasets" },
  { label: "Prompt Management", to: "/prompts" },
  { label: "Alerts",            to: "/alerts" },
]

const NAV_LINKS = [
  { label: "Integrations",  to: "/integrations" },
  // Commented out with the hosted service, not removed. There is nothing to
  // price; the blog and the contact form were both served by the API, which no
  // longer exists. Uncomment these (and rename src/app/_pricing, _blog and
  // _contact back) to bring them back.
  // { label: "Pricing",       to: "/pricing" },
  { label: "Docs",          to: "/documentation" },
  { label: "Response Gate Demo", to: "/response-gate-demo" },
  { label: "Cost Calculator", to: "/llm-cost-calculator" },
  // { label: "Blog",          to: "/blog" },
  // { label: "Contact",       to: "/contact" },
]

// `sibling` links resolve against the domain the visitor is on (see
// useSiblingOrigin), so the footer stays on-domain across all of the site's hosts.
type ExternalLink = { label: string } & (
  | { href: string; sibling?: never }
  | { sibling: string; href?: never }
)

// The `sibling` entries resolve to polygate.getfluiq.com and infrager.getfluiq.com.
// Both moved to Vercel on the same subdomains, so they stay live.
const OPEN_SOURCE_LINKS: ExternalLink[] = [
  { label: "polygate",        sibling: "polygate" },
  { label: "Infrager",        sibling: "infrager" },
  { label: "Fluiq (all repos)", href: "https://github.com/fluiq-AI" },
  { label: "Python SDK",        href: "https://github.com/fluiq-AI/fluiq-sdk" },
  { label: "TypeScript SDK",    href: "https://github.com/fluiq-AI/fluiq-sdk-typescript" },
  { label: "guardrail-bench",   href: "https://github.com/SaurabhKumbhar24/guardrail-bench" },
  { label: "polygate GitHub",   href: "https://github.com/SaurabhKumbhar24/Polygate" },
  { label: "Infrager GitHub",   href: "https://github.com/SaurabhKumbhar24/Infrager" },
]

const INTEGRATION_LINKS = [
  { label: "OpenAI",     to: "/integrations/openai" },
  { label: "Anthropic",  to: "/integrations/anthropic" },
  { label: "LangChain",  to: "/integrations/langchain" },
  { label: "CrewAI",     to: "/integrations/crewai" },
  { label: "Pinecone",   to: "/integrations/pinecone" },
  { label: "View all →", to: "/integrations" },
]

const linkCls = "text-[#9A9A92] hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors"
const headingCls = "text-[11px] font-semibold uppercase tracking-widest text-[#D4CFC1] dark:text-[#333333]"

export function SiteFooter() {
  const host = useSiteHost()
  return (
    <footer className="border-t border-[#E5E1D6] dark:border-[#2A2A2A] py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">

          {/* Brand */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="Fluiq" className="size-6" />
              <span className="font-heading font-semibold text-[#0a0a0a] dark:text-[#FAF9F6] text-[14px]">Fluiq</span>
            </div>
            <p className="text-[13px] text-[#9A9A92] max-w-50 leading-relaxed">
              Secure, observe, evaluate.
              <br />
              Archived and open source.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-12 text-[13px]">
            <div className="flex flex-col gap-3">
              <span className={headingCls}>Platform</span>
              {PLATFORM_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className={linkCls}>{l.label}</Link>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <span className={headingCls}>Company</span>
              {NAV_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className={linkCls}>{l.label}</Link>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <span className={headingCls}>Compare</span>
              {COMPARE_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className={linkCls}>{l.label}</Link>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <span className={headingCls}>Integrations</span>
              {INTEGRATION_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className={linkCls}>{l.label}</Link>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <span className={headingCls}>Open Source</span>
              {OPEN_SOURCE_LINKS.map((l) => (
                <a key={l.label} href={l.sibling ? siblingOrigin(l.sibling, host) : l.href} target="_blank" rel="noopener noreferrer" className={linkCls}>{l.label}</a>
              ))}
            </div>
          </div>

        </div>
      </div>
    </footer>
  )
}
