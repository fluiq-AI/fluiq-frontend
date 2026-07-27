import { buildMetadata } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { SEO, faqPageLd } from "@/lib/seo-pages"
import Component from "@/pages/faq"
import { ALL_FAQS } from "@/lib/faq-groups"

const seo = SEO.faq
export const metadata = buildMetadata(seo)

export default function Page() {
  return (
    <>
      {/* Every question on the page, flattened, so the structured data and the
          rendered content cannot drift apart. */}
      <JsonLd data={faqPageLd(ALL_FAQS)} />
      <Component />
    </>
  )
}
