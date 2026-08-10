import type { Metadata } from "next"
import { JsonLd } from "@/components/JsonLd"
import { breadcrumbLd } from "@/lib/seo-pages"
import { CANONICAL_ORIGIN } from "@/lib/site-url"
import Component from "@/pages/Integrations/index"

export const metadata: Metadata = {
  title: {
    absolute: "Fluiq Integrations: LLM Monitoring for 14 Frameworks & DBs",
  },
  description:
    "Fluiq auto-instruments 14 LLM providers, agent frameworks, and vector databases, including OpenAI, Anthropic, LangChain, CrewAI, and Pinecone. Two lines of Python.",
  keywords:
    "Fluiq integrations, LLM integrations, OpenAI integration, LangChain integration, vector database monitoring, agent framework monitoring, CrewAI integration",
  alternates: { canonical: "/integrations" },
  openGraph: {
    title: "Fluiq Integrations: LLM Monitoring for 14 Frameworks",
    description:
      "Auto-instrument OpenAI, Anthropic, Gemini, LangChain, CrewAI, Pinecone, and more with two lines of Python.",
    url: "/integrations",
    type: "website",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Fluiq Integrations",
  description:
    "Fluiq auto-instruments 14 LLM providers, agent frameworks, and vector databases, including OpenAI, Anthropic, LangChain, CrewAI, and Pinecone. Two lines of Python.",
  url: `${CANONICAL_ORIGIN}/integrations`,
  isPartOf: { "@id": CANONICAL_ORIGIN },
}

export default function Page() {
  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd
        data={breadcrumbLd([
          ["Home", "/"],
          ["Integrations", "/integrations"],
        ])}
      />
      <Component />
    </>
  )
}
