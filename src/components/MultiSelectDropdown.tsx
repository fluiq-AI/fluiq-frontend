import { useEffect, useMemo, useRef, useState } from "react"
import { Add01Icon, ArrowDown01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * A checkbox dropdown for picking several options from a list. Keeps the menu
 * open while toggling, and can carry an "Add" action at the bottom. Used for
 * dataset run models, metrics, scorers, and the judge jury so they all read as
 * the same control instead of a mix of chips and dropdowns.
 *
 * A search box appears automatically once the list is long enough (the model
 * catalog is now dozens of entries), so the same control works whether it holds
 * three metrics or sixty models.
 */
export function MultiSelectDropdown({
  label,
  placeholder,
  emptyText,
  options,
  selected,
  onToggle,
  disabled,
  onAdd,
  addLabel,
  searchable,
}: {
  /** Singular noun for the trigger summary, e.g. "model" → "3 models selected". */
  label: string
  placeholder: string
  emptyText?: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string, on: boolean) => void
  disabled?: boolean
  onAdd?: () => void
  addLabel?: string
  /** Force the search box on/off. Defaults to on once there are >8 options. */
  searchable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const showSearch = searchable ?? options.length > 8

  // Focus the search box after radix has finished its own open-focus, so typing
  // starts filtering immediately instead of landing on a menu item.
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

  const count = selected.length
  const triggerText =
    count === 0
      ? placeholder
      : count === 1
        ? options.find((o) => o.value === selected[0])?.label ?? `1 ${label}`
        : `${count} ${label}s selected`

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setQuery("")
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="w-full justify-between font-normal">
          <span className={cn("truncate", count === 0 && "text-muted-foreground")}>{triggerText}</span>
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
              // Stop radix's menu typeahead from stealing the keystrokes.
              onKeyDown={(e) => e.stopPropagation()}
              placeholder={`Search ${label}s…`}
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        ) : null}

        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-muted-foreground">
              {options.length === 0 ? emptyText ?? "Nothing to select." : "No matches."}
            </div>
          ) : (
            filtered.map((o) => (
              <DropdownMenuCheckboxItem
                key={o.value}
                checked={selected.includes(o.value)}
                onCheckedChange={(c) => onToggle(o.value, !!c)}
                onSelect={(e) => e.preventDefault()}
              >
                {o.label}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </div>

        {onAdd ? (
          <>
            <DropdownMenuSeparator className="my-0" />
            <DropdownMenuItem onSelect={() => onAdd()} className="m-1">
              <HugeiconsIcon icon={Add01Icon} size={13} />
              {addLabel ?? "Add"}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
