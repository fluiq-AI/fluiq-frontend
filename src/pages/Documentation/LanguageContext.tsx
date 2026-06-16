import { createContext, useContext, useState, type ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PythonIcon, Typescript01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

export type DocLang = "python" | "typescript"

const STORAGE_KEY = "fluiq.docLang"

function loadLang(): DocLang {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === "python" || raw === "typescript") return raw
  } catch {
    /* ignore */
  }
  return "python"
}

interface LanguageContextValue {
  lang: DocLang
  setLang: (lang: DocLang) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<DocLang>(loadLang)

  const setLang = (next: DocLang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

/** Read the selected docs language. Falls back to "python" outside a provider. */
export function useDocLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) return { lang: "python", setLang: () => {} }
  return ctx
}

/** Pick the value for the active language. */
export function byLang<T>(lang: DocLang, python: T, typescript: T): T {
  return lang === "typescript" ? typescript : python
}

const LANGS: { id: DocLang; label: string; short: string; icon: typeof PythonIcon }[] = [
  { id: "python", label: "Python", short: "PY", icon: PythonIcon },
  { id: "typescript", label: "TypeScript", short: "TS", icon: Typescript01Icon },
]

/** Python / TypeScript switch shown in the docs and examples sidebars. */
export function LanguageToggle() {
  const { lang, setLang } = useDocLang()
  return (
    <div className="mb-5">
      <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
        Language
      </p>
      <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/40 p-1">
        {LANGS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLang(l.id)}
            aria-pressed={lang === l.id}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors",
              lang === l.id
                ? "bg-background text-[#1860D3] shadow-sm dark:text-[#6FA8FF]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <HugeiconsIcon icon={l.icon} size={13} />
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}
