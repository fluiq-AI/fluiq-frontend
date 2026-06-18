"use client"

import ExamplesLayout from "@/pages/Documentation/ExamplesLayout"
import { OutletProvider } from "@/lib/router-compat"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <OutletProvider outlet={children}>
      <ExamplesLayout />
    </OutletProvider>
  )
}
