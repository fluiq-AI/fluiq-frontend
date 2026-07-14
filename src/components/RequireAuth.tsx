"use client"

import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"

import { useAppSelector } from "@/store/hooks"
import { useMounted } from "@/lib/useMounted"
import { AuthGateLoading } from "@/components/AuthGateLoading"

interface RequireAuthProps {
  children: ReactNode
}

function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const user = useAppSelector((s) => s.auth.user)
  const mounted = useMounted()

  // Auth is restored from localStorage on the client only, so the store's
  // `user` differs between the server (always null) and the first client
  // render. Render a neutral loader until mounted so SSR and hydration match,
  // then redirect-or-render from the real auth state.
  if (!mounted) return <AuthGateLoading />

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

export default RequireAuth
