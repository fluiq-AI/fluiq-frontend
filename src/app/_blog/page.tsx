import type { Metadata } from "next"
import { JsonLd } from "@/components/JsonLd"
import { breadcrumbLd } from "@/lib/seo-pages"
import Component from "@/pages/Blog/index"

export const metadata: Metadata = {
  title: { absolute: "Fluiq Blog: LLM Observability, Evals & Security" },
  description:
    "Guides, engineering notes, and product updates from the Fluiq team on LLM security, observability, and evaluation.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "Fluiq Blog: LLM Observability, Evals & Security", url: "/blog", type: "website" },
}

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          ["Home", "/"],
          ["Blog", "/blog"],
        ])}
      />
      <Component />
    </>
  )
}
