"use client"

import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"

import { useAppSelector } from "@/store/hooks"
import { useMounted } from "@/lib/useMounted"
import { AuthGateLoading } from "@/components/AuthGateLoading"

function RequireAdmin({ children }: { children: ReactNode }) {
  const location = useLocation()
  const user = useAppSelector((s) => s.auth.user)
  const mounted = useMounted()

  // Auth is restored from localStorage on the client only (see RequireAuth):
  // hold a neutral loader until mounted so SSR matches the first client render.
  if (!mounted) return <AuthGateLoading />

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (user.user_type !== "Admin") {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default RequireAdmin
