"use client"

import RequireAuth from "@/components/RequireAuth"
import Dashboard from "@/pages/Dashboard/dashboard"
import { OutletProvider } from "@/lib/router-compat"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <OutletProvider outlet={children}>
        <Dashboard />
      </OutletProvider>
    </RequireAuth>
  )
}
