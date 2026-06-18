import { useEffect, useRef, useState } from "react"

export function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
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
    if (!started) return
    let frame = 0; const total = 60
    const timer = setInterval(() => {
      frame++
      const eased = 1 - Math.pow(1 - frame / total, 3)
      setCount(Math.floor(eased * target))
      if (frame >= total) { setCount(target); clearInterval(timer) }
    }, 25)
    return () => clearInterval(timer)
  }, [started, target])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}
