import type { Metadata } from "next"
import Component from "@/pages/Authentication/login"

export const metadata: Metadata = {
  title: { absolute: "Log In to Fluiq — Your AI Ops Dashboard for LLM Apps" },
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Component />
}
