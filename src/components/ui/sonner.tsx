"use client"

import { Toaster as Sonner } from "sonner"

import { useTheme } from "@/contexts/ThemeContext"

/** App-wide toast host. Theme follows the ThemeContext so toasts match the UI. */
export function Toaster() {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
      richColors
      closeButton
      position="bottom-right"
    />
  )
}
