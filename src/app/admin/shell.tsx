"use client"

import RequireAdmin from "@/components/RequireAdmin"
import AdminLayout from "@/pages/Admin/admin"
import { OutletProvider } from "@/lib/router-compat"

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdmin>
      <OutletProvider outlet={children}>
        <AdminLayout />
      </OutletProvider>
    </RequireAdmin>
  )
}
