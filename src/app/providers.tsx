"use client"

import { Provider } from "react-redux"

import { store } from "@/store"
import { ThemeProvider } from "@/contexts/ThemeContext"

/**
 * Client-side provider boundary for the whole app: Redux store and the theme
 * context. Head/SEO is handled entirely server-side via the Next Metadata API.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider>{children}</ThemeProvider>
    </Provider>
  )
}
