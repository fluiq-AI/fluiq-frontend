import type { Metadata } from "next"
import Component from "@/pages/Authentication/auth-callback"

export const metadata: Metadata = {
  title: { absolute: "Signing you in… — Fluiq" },
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Component />
}
