import { buildMetadata } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { DOC_SEO } from "@/lib/seo-pages"
import Component from "@/pages/Documentation/OptimizationPage"

const seo = DOC_SEO.optimization
export const metadata = buildMetadata(seo)

export default function Page() {
  return (
    <>
      <JsonLd data={seo.jsonLd!} />
      <Component />
    </>
  )
}
