import { useCallback, useState } from "react"
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

export function CodeBlock({
  children,
  className,
  preClassName,
  variant = "light",
}: {
  children: string
  className?: string
  preClassName?: string
  variant?: "light" | "dark"
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

  const isDark = variant === "dark"

  return (
    <div className={cn("group relative", className)}>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy code to clipboard"}
        className={cn(
          "absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium opacity-0 backdrop-blur transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 group-hover:opacity-100",
          isDark
            ? "border border-[#2a2a2a] bg-[#1a1a1a]/80 text-[#6b7280] hover:bg-[#2a2a2a] hover:text-[#c0c0c0] focus-visible:ring-[#4b4b4b]"
            : "border border-border/60 bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring"
        )}
      >
        <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={12} />
        {copied ? "Copied" : "Copy"}
      </button>
      <pre
        className={cn(
          "overflow-x-auto p-5 pr-20 font-mono text-[13px] leading-[1.8]",
          isDark
            ? "bg-transparent text-[#d4d4d4]"
            : "rounded-xl border border-border bg-muted/60 text-foreground",
          preClassName
        )}
      >
        <code>{children}</code>
      </pre>
    </div>
  )
}
