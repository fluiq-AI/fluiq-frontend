import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight02Icon } from "@hugeicons/core-free-icons"

const NAV_INTEGRATIONS = [
  {
    category: "LLM Providers",
    items: [
      { name: "OpenAI",           slug: "openai" },
      { name: "Anthropic",        slug: "anthropic" },
      { name: "Google Gemini",    slug: "gemini" },
      { name: "Google Vertex AI", slug: "vertex-ai" },
    ],
  },
  {
    category: "Agent Frameworks",
    items: [
      { name: "LangChain",  slug: "langchain" },
      { name: "LangGraph",  slug: "langgraph" },
      { name: "CrewAI",     slug: "crewai" },
      { name: "Google ADK", slug: "google-adk" },
      { name: "MCP",        slug: "mcp" },
    ],
  },
  {
    category: "Vector Databases",
    items: [
      { name: "Pinecone", slug: "pinecone" },
      { name: "Chroma",   slug: "chroma" },
      { name: "Weaviate", slug: "weaviate" },
      { name: "FAISS",    slug: "faiss" },
      { name: "Qdrant",   slug: "qdrant" },
    ],
  },
]

interface Props {
  /** Class names applied to the trigger button. Default matches the marketing-page nav style. */
  triggerClassName?: string
}

export function NavIntegrationsDropdown({
  triggerClassName = "hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors",
}: Props) {
  return (
    <div className="relative group">
      <button
        type="button"
        aria-haspopup="true"
        className={`flex items-center gap-1 ${triggerClassName}`}
      >
        Integrations
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
        <div className="w-[500px] rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A]
                        bg-[#FAF9F6] dark:bg-[#111111] p-5"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)" }}>

          <div className="grid grid-cols-3 gap-5">
            {NAV_INTEGRATIONS.map((group) => (
              <div key={group.category}>
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#9A9A92]">
                  {group.category}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.slug}>
                      <Link
                        to={`/integrations/${item.slug}`}
                        className="block rounded-lg px-2 py-1.5 text-[13px]
                                   text-[#6B6B66] dark:text-[#9A9A92]
                                   hover:bg-[#F2F0E9] dark:hover:bg-[#1A1A1A]
                                   hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6]
                                   transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#E5E1D6] dark:border-[#2A2A2A] pt-3">
            <span className="text-[11px] text-[#9A9A92]">14 integrations · zero wrappers</span>
            <Link
              to="/integrations"
              className="flex items-center gap-1 text-[12px] font-semibold
                         text-[#1860D3] dark:text-[#6FA8FF] hover:underline"
            >
              View all <HugeiconsIcon icon={ArrowRight02Icon} size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
