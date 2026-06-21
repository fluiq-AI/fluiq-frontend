import { buildMetadata } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { breadcrumbLd, faqPageLd } from "@/lib/seo-pages"
import Component from "@/pages/Tools/LlmCostCalculator"
import { LLMCostFAQS } from "@/lib/faqs"

const SITE = "https://getfluiq.com"
const PATH = "/llm-cost-calculator"

export const metadata = buildMetadata({
  title: "LLM Cost Calculator — OpenAI, Claude & Gemini Pricing",
  description:
    "Free LLM cost calculator: estimate and compare OpenAI, Claude, and Gemini API pricing by tokens and request volume, and see how much response caching saves.",
  keywords:
    "LLM cost calculator, OpenAI pricing calculator, Claude pricing, Gemini pricing, token cost calculator, LLM API cost, GPT-4o cost, LLM cost estimator",
  path: PATH,
})

const webAppLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "LLM Cost Calculator",
  url: `${SITE}${PATH}`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  description:
    "Estimate and compare the monthly cost of OpenAI, Anthropic Claude, and Google Gemini models by input/output tokens and request volume, including response-caching savings.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  isPartOf: { "@id": SITE },
  publisher: { "@type": "Organization", name: "Fluiq", url: SITE },
}

export default function Page() {
  return (
    <>
      <JsonLd data={webAppLd} />
      <JsonLd data={breadcrumbLd([["Home", "/"], ["LLM Cost Calculator", PATH]])} />
      <JsonLd data={faqPageLd(LLMCostFAQS)} />
      <Component />
    </>
  )
}
