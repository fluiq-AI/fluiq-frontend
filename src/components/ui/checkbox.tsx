import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-input dark:border-[#4A4A4A] shadow-xs outline-none transition-all",
        "focus-visible:border-[#1860D3] focus-visible:ring-[3px] focus-visible:ring-[#1860D3]/20",
        "dark:focus-visible:border-[#6FA8FF] dark:focus-visible:ring-[#6FA8FF]/20",
        "data-[state=checked]:bg-[#1860D3] data-[state=checked]:border-[#1860D3] data-[state=checked]:text-white",
        "dark:data-[state=checked]:bg-[#6FA8FF] dark:data-[state=checked]:border-[#6FA8FF] dark:data-[state=checked]:text-[#0A0A0A]",
        "dark:bg-input/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current transition-none">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 12 12"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="1.5,6 4.5,9.5 10.5,2.5" />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
