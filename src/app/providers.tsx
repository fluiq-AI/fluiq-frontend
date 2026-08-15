"use client"

import { Provider } from "react-redux"

import { store } from "@/store"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { SiteHostProvider } from "@/contexts/SiteHostContext"
import { Toaster } from "@/components/ui/sonner"

/**
 * Client-side provider boundary for the whole app: Redux store, the theme
 * context and the request host (which client components need to build
 * sibling-product links). Head/SEO is handled entirely server-side via the Next
 * Metadata API.
 */
export function Providers({ host, children }: { host: string; children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SiteHostProvider host={host}>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </SiteHostProvider>
    </Provider>
  )
}
