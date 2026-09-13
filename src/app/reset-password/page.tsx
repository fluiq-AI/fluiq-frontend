import type { Metadata } from "next"
import Component from "@/pages/Authentication/reset-password"

export const metadata: Metadata = {
  title: { absolute: "Set a New Password | Fluiq" },
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Component />
}
