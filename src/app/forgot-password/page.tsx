import type { Metadata } from "next"
import Component from "@/pages/Authentication/forgot-password"

export const metadata: Metadata = {
  title: { absolute: "Reset your password — Fluiq" },
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Component />
}
