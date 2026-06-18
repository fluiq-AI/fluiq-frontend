"use client"

import { Provider } from "react-redux"
import { HelmetProvider } from "react-helmet-async"

import { store } from "@/store"
import { ThemeProvider } from "@/contexts/ThemeContext"

/**
 * Client-side provider boundary for the whole app: Redux store, react-helmet
 * (per-route <Helmet> head tags still work as before) and the theme context.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HelmetProvider>
      <Provider store={store}>
        <ThemeProvider>{children}</ThemeProvider>
      </Provider>
    </HelmetProvider>
  )
}
