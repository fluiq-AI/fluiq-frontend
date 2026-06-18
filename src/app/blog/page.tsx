import type { Metadata } from "next"
import Component from "@/pages/Blog/index"

export const metadata: Metadata = {
  title: { absolute: "Blog — Fluiq" },
  description:
    "Guides, engineering notes, and product updates from the Fluiq team on LLM observability, evals, security, and optimization.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "Fluiq Blog", url: "/blog", type: "website" },
}

export default function Page() {
  return <Component />
}
