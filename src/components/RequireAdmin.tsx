import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"

import { useAppSelector } from "@/store/hooks"

function RequireAdmin({ children }: { children: ReactNode }) {
  const location = useLocation()
  const user = useAppSelector((s) => s.auth.user)

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (user.user_type !== "Admin") {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default RequireAdmin
