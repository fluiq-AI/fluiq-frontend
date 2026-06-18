import type { Metadata } from "next"
import { JsonLd } from "@/components/JsonLd"
import { INTEGRATIONS } from "@/pages/Integrations/data"
import Component from "@/pages/Integrations/IntegrationRoute"

export function generateStaticParams() {
  return INTEGRATIONS.map((i) => ({ slug: i.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const data = INTEGRATIONS.find((i) => i.slug === slug)
  if (!data) return {}
  const url = `/integrations/${data.slug}`
  return {
    title: { absolute: data.metaTitle },
    description: data.metaDescription,
    keywords: `${data.name} monitoring, ${data.name} tracing, ${data.name} observability, ${data.name} cost tracking, LLM ${data.category.toLowerCase()} integration, Fluiq ${data.name}`,
    alternates: { canonical: url },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url,
      type: "website",
    },
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = INTEGRATIONS.find((i) => i.slug === slug)
  return (
    <>
      {data && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: data.metaTitle,
            description: data.metaDescription,
            url: `https://getfluiq.com/integrations/${data.slug}`,
            isPartOf: { "@id": "https://getfluiq.com" },
          }}
        />
      )}
      <Component />
    </>
  )
}
