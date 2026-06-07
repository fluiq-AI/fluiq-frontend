import "@/styles/atmosphere.css"

/**
 * Shared brand background system.
 *
 * `GrainOverlay` is a page-wide fixed film-grain texture (drop once near the
 * page root). `HeroAtmosphere` is the cobalt aurora + topographic contour
 * field for a hero section (the section must be `relative overflow-hidden`).
 *
 * The aurora drifts slowly and collapses to static under reduced motion
 * (handled in atmosphere.css via the `.fx-aurora` class).
 */

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

export function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] opacity-[0.04] mix-blend-multiply dark:opacity-[0.06] dark:mix-blend-screen"
      style={{ backgroundImage: GRAIN }}
    />
  )
}

const AURORA = {
  /* Glow pooled upper-right, for the asymmetric (Home) hero. */
  offset: {
    light:
      "radial-gradient(55% 45% at 72% 22%, rgba(24,96,211,0.12), transparent 62%), radial-gradient(50% 55% at 22% 80%, rgba(24,96,211,0.07), transparent 66%), radial-gradient(85% 75% at 56% 48%, rgba(24,96,211,0.045), transparent 72%)",
    dark:
      "radial-gradient(55% 45% at 72% 22%, rgba(111,168,255,0.16), transparent 62%), radial-gradient(50% 55% at 20% 80%, rgba(63,125,221,0.12), transparent 66%), radial-gradient(90% 80% at 56% 46%, rgba(24,96,211,0.12), transparent 74%)",
  },
  /* Symmetric glow, for centered heroes (Pricing, Contact). */
  center: {
    light:
      "radial-gradient(60% 55% at 50% 28%, rgba(24,96,211,0.10), transparent 62%), radial-gradient(46% 50% at 50% 82%, rgba(24,96,211,0.05), transparent 66%)",
    dark:
      "radial-gradient(60% 55% at 50% 28%, rgba(111,168,255,0.14), transparent 62%), radial-gradient(52% 55% at 50% 84%, rgba(24,96,211,0.10), transparent 70%)",
  },
} as const

const CONTOUR = {
  light:
    "repeating-radial-gradient(circle at 26% 36%, transparent 0 17px, rgba(24,96,211,0.06) 17px 18px), repeating-radial-gradient(circle at 80% 66%, transparent 0 22px, rgba(24,96,211,0.045) 22px 23px)",
  dark:
    "repeating-radial-gradient(circle at 26% 36%, transparent 0 17px, rgba(111,168,255,0.09) 17px 18px), repeating-radial-gradient(circle at 80% 66%, transparent 0 22px, rgba(111,168,255,0.06) 22px 23px)",
}
const CONTOUR_MASK = "radial-gradient(ellipse 96% 92% at 55% 46%, black 28%, transparent 80%)"

export function HeroAtmosphere({ variant = "center" }: { variant?: "center" | "offset" }) {
  const a = AURORA[variant]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Drifting cobalt aurora, single-hue, low-chroma */}
      <div className="fx-aurora absolute inset-[-10%]">
        <div className="absolute inset-0 dark:hidden" style={{ background: a.light }} />
        <div className="absolute inset-0 hidden dark:block" style={{ background: a.dark }} />
      </div>
      {/* Topographic contour lines, layered over the aurora, edges faded */}
      <div className="absolute inset-0 dark:hidden"
        style={{ backgroundImage: CONTOUR.light, maskImage: CONTOUR_MASK, WebkitMaskImage: CONTOUR_MASK }} />
      <div className="absolute inset-0 hidden dark:block"
        style={{ backgroundImage: CONTOUR.dark, maskImage: CONTOUR_MASK, WebkitMaskImage: CONTOUR_MASK }} />
    </div>
  )
}
