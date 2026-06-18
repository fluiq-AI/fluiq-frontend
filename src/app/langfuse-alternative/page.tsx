import { buildMetadata } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { comparisonSeo } from "@/lib/seo-pages"
import Component, { data } from "@/pages/Comparisons/langfuse-alternative"

const seo = comparisonSeo(data)
export const metadata = buildMetadata(seo)

export default function Page() {
  return (
    <>
      <JsonLd data={seo.jsonLd!} />
      <Component />
    </>
  )
}
