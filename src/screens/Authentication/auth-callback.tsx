"use client"

import { useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { useAppDispatch } from "@/store/hooks"
import { setSession } from "@/store/auth/slice"
import type { AuthSession } from "@/lib/auth-types"/**
 * Landing page after OAuth redirect from the backend.
 * The backend encodes the full session as base64 JSON in ?session=
 * We decode it, hydrate the Redux store, then go to /dashboard.
 */
function AuthCallback() {
  const [params] = useSearchParams()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const error = params.get("error")
    if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true })
      return
    }

    const sessionParam = params.get("session")
    if (!sessionParam) {
      navigate("/login?error=Missing+session", { replace: true })
      return
    }

    try {
      const json = atob(sessionParam.replace(/-/g, "+").replace(/_/g, "/"))
      const session = JSON.parse(json) as AuthSession
      dispatch(setSession(session))
      navigate("/dashboard", { replace: true })
    } catch {
      navigate("/login?error=Invalid+session", { replace: true })
    }
  }, [params, dispatch, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
<div className="flex flex-col items-center gap-3 text-muted-foreground">
        <svg
          className="size-6 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-sm">Signing you in…</p>
      </div>
    </div>
  )
}

export default AuthCallback