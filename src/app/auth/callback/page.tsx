import type { Metadata } from "next"
import Component from "@/pages/Authentication/auth-callback"

export const metadata: Metadata = {
  title: { absolute: "Signing You In to Fluiq — Completing Authentication Now" },
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Component />
}
