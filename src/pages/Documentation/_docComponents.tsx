import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PythonIcon, Typescript01Icon } from "@hugeicons/core-free-icons"
import { CodeBlock } from "@/components/code-block"
import { cn } from "@/lib/utils"
import { syntaxHighlight } from "./syntaxHighlight"
import { useDocLang, type DocLang } from "./LanguageContext"

export interface CodeTab {
  label: string
  description?: string
  code: string
}

export function Code({ children }: { children: string }) {
  const { lang } = useDocLang()
  const isTs = lang === "typescript"
  return (
    <div className="rounded-xl border border-[#1a1a1a] dark:border-[#2A2A2A] bg-[#0a0a0a] dark:bg-[#1A1A1A] overflow-hidden shadow-lg">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e1e1e] dark:border-[#2A2A2A]">
        <HugeiconsIcon icon={isTs ? Typescript01Icon : PythonIcon} size={13} className="text-[#6B6B66]" />
        <span className="text-[11px] text-[#6B6B66] font-mono">{isTs ? "TypeScript" : "Python"}</span>
      </div>
      <CodeBlock variant="dark" highlighted={syntaxHighlight(children, lang)}>{children}</CodeBlock>
    </div>
  )
}

export function IntegrationTabs({
  tabs,
}: {
  /** Tabs keyed by language. Each language supplies its own ordered tab list. */
  tabs: Record<DocLang, CodeTab[]>
}) {
  const { lang } = useDocLang()
  const list = tabs[lang]
  const [active, setActive] = useState(0)
  // Languages may expose a different number of tabs — clamp to a valid index.
  const idx = Math.min(active, list.length - 1)
  const current = list[idx]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {list.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={cn(
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
              idx === i
                ? "bg-[#1860D3] dark:bg-[#6FA8FF] text-white dark:text-[#0A0A0A]"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {current.description && (
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          {current.description}
        </p>
      )}
      <Code>{current.code}</Code>
    </div>
  )
}

export function PageHeading({
  icon,
  title,
  description,
}: {
  icon: unknown
  title: string
  description: string
}) {
  return (
    <div className="mb-8 space-y-2 border-b border-border/60 pb-6">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-[#EEF3FD] dark:bg-[#1A2A4A]/50">
          <HugeiconsIcon icon={icon as never} size={16} className="text-[#1860D3] dark:text-[#6FA8FF]" />
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{title}</h1>
      </div>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
