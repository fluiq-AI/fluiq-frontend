import { Link } from "react-router"

const COMPARE_LINKS = [
  { label: "vs LangSmith",  to: "/langsmith-alternative" },
  { label: "vs Langfuse",   to: "/langfuse-alternative" },
  { label: "vs Helicone",   to: "/helicone-alternative" },
  { label: "vs Braintrust", to: "/braintrust-alternative" },
  { label: "vs Portkey",    to: "/portkey-alternative" },
  { label: "vs Lakera",     to: "/lakera-alternative" },
]

const NAV_LINKS = [
  { label: "Platform",      to: "/" },
  { label: "Integrations",  to: "/integrations" },
  { label: "Pricing",       to: "/pricing" },
  { label: "Docs",          to: "/documentation" },
  { label: "Contact",       to: "/contact" },
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
              Observe, protect, optimize, evaluate.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-12 text-[13px]">
            <div className="flex flex-col gap-3">
              <span className={headingCls}>Product</span>
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
          </div>

        </div>
      </div>
    </footer>
  )
}
