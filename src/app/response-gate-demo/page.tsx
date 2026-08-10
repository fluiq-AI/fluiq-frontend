import { buildMetadata } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { breadcrumbLd } from "@/lib/seo-pages"
import Component from "@/pages/Tools/ResponseGateDemo"
import { CANONICAL_ORIGIN as SITE } from "@/lib/site-url"

// SITE is the authored origin; <JsonLd> rewrites it to the request host.
const PATH = "/response-gate-demo"

export const metadata = buildMetadata({
  title: "Response Gate Demo: What an LLM Still Leaks After It Refuses",
  description:
    "Five real prompt-injection and data-exfiltration attacks against Claude Haiku 4.5. It refused all of them, and two refusals still had customer PII in them. Scan your own agent's output free.",
  keywords:
    "prompt injection demo, LLM output guardrails, response gate, PII leak detection, RAG poisoning, LLM security demo, AI agent security, output scanning, LLM data exfiltration, prompt injection test",
  path: PATH,
})

const webAppLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Fluiq Response Gate Demo",
  url: `${SITE}${PATH}`,
  applicationCategory: "SecurityApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  description:
    "An interactive demo of output-side LLM guardrails. Replays real recorded model responses to prompt-injection, RAG-poisoning and data-exfiltration attacks, scanning each one live with the fluiq.secure() gate, and scans text you paste in.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  isPartOf: { "@id": SITE },
  publisher: { "@type": "Organization", name: "Fluiq", url: SITE },
}

export default function Page() {
  return (
    <>
      <JsonLd data={webAppLd} />
      <JsonLd data={breadcrumbLd([["Home", "/"], ["Response Gate Demo", PATH]])} />
      <Component />
    </>
  )
}
