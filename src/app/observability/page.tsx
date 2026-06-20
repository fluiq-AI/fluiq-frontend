import { buildMetadata } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { PLATFORM_SEO } from "@/lib/seo-pages"
import Component from "@/pages/Platform/PillarPage"

const seo = PLATFORM_SEO.observability
export const metadata = buildMetadata(seo)

export default function Page() {
  return (
    <>
      <JsonLd data={seo.jsonLd!} />
      <Component slug="observability" />
    </>
  )
}
