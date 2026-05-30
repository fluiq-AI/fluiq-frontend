import { Alert02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

export function DrawerTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-2 text-xs font-medium transition-colors",
        active
          ? "border-b-2 border-[#1860D3] dark:border-[#6FA8FF] text-[#1860D3] dark:text-[#6FA8FF]"
          : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
  
}

export function DrawerSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

export function EmptyBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      {children}
    </div>
  )
}

export function ErrorSection({
  message,
  traceback,
}: {
  message: string | null
  traceback: string | null
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-destructive">
        <HugeiconsIcon icon={Alert02Icon} size={12} />
        Error
      </h3>
      <div className="space-y-2">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <div className="whitespace-pre-wrap wrap-break-word text-xs text-destructive">
            {message ?? "(no error message)"}
          </div>
        </div>
        {traceback ? (
          <div className="rounded-md border border-border/60 bg-muted/40 p-3">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Traceback
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap wrap-break-word font-mono text-[11px] leading-relaxed">
              {traceback}
            </pre>
          </div>
        ) : null}
      </div>
    </section>
  )
}
