import { useCallback, useState } from "react"
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

export function CodeBlock({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(children)
      } else {
        const ta = document.createElement("textarea")
        ta.value = children
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
  }, [children])

  return (
    <div className={cn("group relative", className)}>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy code to clipboard"}
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[11px] font-medium text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover:opacity-100"
      >
        <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={12} />
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto rounded-xl border border-border bg-muted/60 p-4 pr-20 font-mono text-sm leading-relaxed text-foreground">
        <code>{children}</code>
      </pre>
    </div>
  )
}
