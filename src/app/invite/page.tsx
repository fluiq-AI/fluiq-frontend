import type { Metadata } from "next"
import Component from "@/pages/Authentication/invite"

export const metadata: Metadata = {
  title: { absolute: "Accept your Fluiq team invitation" },
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Component />
}
