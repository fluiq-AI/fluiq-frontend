import { useEffect, useRef, useState } from "react"

/**
 * Counts up to `target` when scrolled into view.
 *
 * Pass `display` for a value that is not a number to count toward (an
 * infinity glyph, say). It renders immediately and the animation is skipped,
 * because there is nothing meaningful to count from zero to.
 */
export function AnimatedCounter({ target, suffix = "", display }: { target: number; suffix?: string; display?: string }) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStarted(true); observer.disconnect() }
    })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started || display !== undefined) return
    let frame = 0; const total = 60
    const timer = setInterval(() => {
      frame++
      const eased = 1 - Math.pow(1 - frame / total, 3)
      setCount(Math.floor(eased * target))
      if (frame >= total) { setCount(target); clearInterval(timer) }
    }, 25)
    return () => clearInterval(timer)
  }, [started, target, display])

  if (display !== undefined) return <span ref={ref}>{display}{suffix}</span>
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}
