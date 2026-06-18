/**
 * Renders a JSON-LD structured-data block. Server component (no hooks) so the
 * script lands in the initial SSR HTML for crawlers.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
