import { buildMetadata } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { breadcrumbLd } from "@/lib/seo-pages"
import Component from "@/pages/Tools/Benchmark"

const SITE = "https://getfluiq.com"
const PATH = "/benchmark"

export const metadata = buildMetadata({
  title: "Output Guardrail Benchmark: 9 Guardrails, 949 Cases",
  description:
    "An open benchmark of LLM output guardrails and prompt-injection detectors. Fluiq, LLM Guard, Presidio, NeMo, AWS Comprehend, Lakera and Nightfall measured on public datasets. Harness, corpora and results published.",
  keywords:
    "LLM guardrail benchmark, prompt injection benchmark, output guardrails comparison, PII detection benchmark, Lakera vs, LLM Guard vs Presidio, jailbreak detection benchmark, AI security benchmark, guardrail false positive rate",
  path: PATH,
})

const datasetLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Fluiq Output Guardrail Benchmark",
  url: `${SITE}${PATH}`,
  description:
    "A reproducible benchmark of LLM output guardrails and prompt-injection detectors across four corpora, including public datasets from ai4privacy, deepset and jackhhao. Measures recall and false-alarm rate for each product.",
  license: "https://opensource.org/licenses/MIT",
  creator: { "@type": "Organization", name: "Fluiq", url: SITE },
  isAccessibleForFree: true,
  keywords: [
    "LLM guardrails",
    "prompt injection",
    "jailbreak detection",
    "PII detection",
    "AI security benchmark",
  ],
}

export default function Page() {
  return (
    <>
      <JsonLd data={datasetLd} />
      <JsonLd data={breadcrumbLd([["Home", "/"], ["Benchmark", PATH]])} />
      <Component />
    </>
  )
}
