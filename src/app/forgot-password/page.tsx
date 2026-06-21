import type { Metadata } from "next"
import Component from "@/pages/Authentication/forgot-password"

export const metadata: Metadata = {
  title: { absolute: "Reset Your Password — Recover Your Fluiq Account Access" },
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Component />
}
