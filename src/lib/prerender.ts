/**
 * Signals the prerender crawler (see vite.config.ts `renderAfterDocumentEvent`)
 * that the page's content is ready to be snapshotted. Data-driven pages (e.g.
 * blog posts) must call this *after* their fetch resolves so the static HTML
 * contains the real content — App.tsx skips its automatic signal for /blog.
 */
export function signalPrerenderReady() {
  document.dispatchEvent(new Event("app-prerender-ready"))
}
