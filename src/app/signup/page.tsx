import type { Metadata } from "next"
import Component from "@/pages/Authentication/signup"

export const metadata: Metadata = {
  title: { absolute: "Sign Up for Fluiq | The Control Plane for AI Agents" },
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Component />
}
