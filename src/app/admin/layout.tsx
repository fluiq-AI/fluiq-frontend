import type { Metadata } from "next"

import { AdminShell } from "./shell"

export const metadata: Metadata = {
  title: { absolute: "Admin Console | Fluiq" },
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
