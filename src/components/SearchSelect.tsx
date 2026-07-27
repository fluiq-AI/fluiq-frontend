import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown01Icon, Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * A single-select combobox with a built-in search box. The plain <Select> is
 * fine for a handful of options, but the model catalog is now dozens of entries
 * pulled from the price table, so anything that picks one model uses this so the
 * user can type to narrow instead of scrolling.
 *
 * ``clearLabel`` renders a pinned first row (e.g. "Server default") mapping to
 * the empty-string value.
 */
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  emptyText = "No matches.",
  clearLabel,
  disabled,
  searchable,
  triggerClassName,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  emptyText?: string
  /** When set, a pinned first row for the "" value. */
  clearLabel?: string
  disabled?: boolean
  /** Force the search box on/off. Defaults to on once there are >8 options. */
  searchable?: boolean
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const showSearch = searchable ?? options.length > 8

  useEffect(() => {
    if (!open || !showSearch) return
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open, showSearch])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    )
  }, [options, query])

  const triggerText =
    value === "" && clearLabel
      ? clearLabel
      : (options.find((o) => o.value === value)?.label ?? (value || placeholder))

  function pick(v: string) {
    onChange(v)
    setOpen(false)
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setQuery("")
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn("w-full justify-between font-normal", triggerClassName)}
        >
          <span className={cn("truncate", value === "" && !clearLabel && "text-muted-foreground")}>
            {triggerText}
          </span>
          <HugeiconsIcon icon={ArrowDown01Icon} size={13} className="shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 p-0"
      >
        {showSearch ? (
          <div className="flex items-center gap-2 border-b border-border/60 px-2.5 py-2">
            <HugeiconsIcon icon={Search01Icon} size={13} className="shrink-0 text-muted-foreground/60" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search models…"
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        ) : null}

        <div className="max-h-64 overflow-y-auto py-1">
          {clearLabel ? (
            <DropdownMenuItem onSelect={() => pick("")} className="justify-between">
              <span className="text-muted-foreground">{clearLabel}</span>
              {value === "" ? <HugeiconsIcon icon={Tick02Icon} size={13} className="text-primary" /> : null}
            </DropdownMenuItem>
          ) : null}
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-muted-foreground">{emptyText}</div>
          ) : (
            filtered.map((o) => (
              <DropdownMenuItem key={o.value} onSelect={() => pick(o.value)} className="justify-between gap-2">
                <span className="truncate">{o.label}</span>
                {value === o.value ? (
                  <HugeiconsIcon icon={Tick02Icon} size={13} className="shrink-0 text-primary" />
                ) : null}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
