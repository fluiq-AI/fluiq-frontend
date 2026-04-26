import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"

import { useAppSelector } from "@/store/hooks"

interface RequireAuthProps {
  children: ReactNode
}

function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const user = useAppSelector((s) => s.auth.user)

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

export default RequireAuth
