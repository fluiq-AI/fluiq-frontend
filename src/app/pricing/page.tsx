import { buildMetadata } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { SEO, faqPageLd } from "@/lib/seo-pages"
import Component from "@/pages/pricing"
import { PricingFaqs } from "@/lib/faqs"

const seo = SEO.pricing
export const metadata = buildMetadata(seo)

export default function Page() {
  return (
    <>
      <JsonLd data={seo.jsonLd!} />
      <JsonLd data={faqPageLd(PricingFaqs)} />
      <Component />
    </>
  )
}
