import { useEffect, useState } from "react"
import { useReducedMotion } from "motion/react"

/**
 * SSR-safe reduced-motion.
 *
 * `motion`'s `useReducedMotion()` reads `matchMedia('(prefers-reduced-motion)')`,
 * which is client-only — on the server it resolves to `false`, but on a client
 * where the user prefers reduced motion it resolves to `true` on the very first
 * render. When that value decides *what gets rendered* (motion `variants`,
 * conditional elements), the first client render diverges from the server HTML
 * and React throws a hydration mismatch.
 *
 * This hook returns `false` on the server AND the first client render (so both
 * match), then the real value after mount. Use it instead of `useReducedMotion`
 * anywhere the result affects rendered markup rather than just an animation
 * target.
 */
export function useReducedMotionSafe(): boolean {
  const reduced = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? reduced === true : false
}
