import { HugeiconsIcon } from "@hugeicons/react"
import { Moon01Icon, Sun01Icon } from "@hugeicons/core-free-icons"
import { useTheme } from "@/contexts/ThemeContext"

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { toggle } = useTheme()

  // Both icons are ALWAYS rendered; which one is visible is decided purely by
  // CSS via the `html.dark` class that the pre-hydration script in layout.tsx
  // sets before React runs. Because the markup is identical on the server and
  // on the client's first render, there's no hydration mismatch — and no
  // motion/AnimatePresence injecting divergent inline styles. The rotate/fade
  // is a plain CSS transition that fires when `dark` is toggled.
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={`grid size-8 place-items-center rounded-lg text-[#6b7280] transition-colors hover:text-[#0a0a0a] dark:text-[#9A9A92] dark:hover:text-[#FAF9F6] ${className}`}
    >
      {/* Moon — shown in light mode (click → switch to dark) */}
      <span className="col-start-1 row-start-1 flex items-center justify-center transition-all duration-200 dark:rotate-90 dark:scale-0 dark:opacity-0">
        <HugeiconsIcon icon={Moon01Icon} size={16} />
      </span>
      {/* Sun — shown in dark mode (click → switch to light) */}
      <span className="col-start-1 row-start-1 flex items-center justify-center rotate-90 scale-0 opacity-0 transition-all duration-200 dark:rotate-0 dark:scale-100 dark:opacity-100">
        <HugeiconsIcon icon={Sun01Icon} size={16} />
      </span>
    </button>
  )
}
