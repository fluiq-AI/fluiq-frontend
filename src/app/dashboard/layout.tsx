import type { Metadata } from "next"

import { DashboardShell } from "./shell"

export const metadata: Metadata = {
  title: { absolute: "Dashboard — Fluiq" },
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
