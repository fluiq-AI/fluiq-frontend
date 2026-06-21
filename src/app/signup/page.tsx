import type { Metadata } from "next"
import Component from "@/pages/Authentication/signup"

export const metadata: Metadata = {
  title: { absolute: "Sign Up for Fluiq — The AI Ops Stack for LLM Applications" },
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Component />
}
