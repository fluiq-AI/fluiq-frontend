import { useEffect, useState } from "react"

/**
 * True only after the component has mounted on the client.
 *
 * Use it to gate rendering that depends on client-only state — a
 * localStorage-backed Redux store, `matchMedia`, etc. — so the first client
 * render matches the server HTML (both see `false`) and hydration succeeds,
 * then switches to the real value after mount.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
