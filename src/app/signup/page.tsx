import type { Metadata } from "next"
import Component from "@/pages/Authentication/signup"

export const metadata: Metadata = {
  title: { absolute: "Sign up — Fluiq" },
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Component />
}
