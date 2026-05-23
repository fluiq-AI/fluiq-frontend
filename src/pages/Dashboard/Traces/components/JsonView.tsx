import { useCallback, useMemo, useState } from "react"
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { summarize } from "../utils"

export function JsonView({ value }: { value: unknown }) {
  const text = useMemo(() => summarize(value as Record<string, unknown>), [value])
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement("textarea")
        ta.value = text
        ta.setAttribute("readonly", "")
        ta.style.position = "absolute"
        ta.style.left = "-9999px"
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore copy failure
    }
  }, [text])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy JSON to clipboard"}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={12} />
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-auto rounded-md border border-border/60 bg-muted/40 p-3 pr-20 font-mono text-xs leading-relaxed">
        {text}
      </pre>
    </div>
  )
}
