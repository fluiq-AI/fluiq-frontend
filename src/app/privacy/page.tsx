import { buildMetadata } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { SEO } from "@/lib/seo-pages"
import Component from "@/pages/Legal/privacy"

const seo = SEO.privacy
export const metadata = buildMetadata(seo)

export default function Page() {
  return (
    <>
      <JsonLd data={seo.jsonLd!} />
      <Component />
    </>
  )
}
