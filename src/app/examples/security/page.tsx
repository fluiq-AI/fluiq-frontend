import { buildMetadata } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { EXAMPLE_SEO } from "@/lib/seo-pages"
import Component from "@/pages/Documentation/SecurityExamplesPage"

const seo = EXAMPLE_SEO.security
export const metadata = buildMetadata(seo)

export default function Page() {
  return (
    <>
      <JsonLd data={seo.jsonLd!} />
      <Component />
    </>
  )
}
