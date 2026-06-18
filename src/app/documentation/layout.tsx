"use client"

import DocLayout from "@/pages/Documentation/DocLayout"
import { OutletProvider } from "@/lib/router-compat"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <OutletProvider outlet={children}>
      <DocLayout />
    </OutletProvider>
  )
}
