"use client"

import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Building01Icon,
  Loading03Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ApiError, apiRequest } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import type { AuthSession, InvitePreview } from "@/lib/auth-types"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { logoutThunk, setSession } from "@/store/auth/slice"

function AcceptInvite() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get("token") ?? ""
  const { user } = useAppSelector((s) => s.auth)

  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const returnTo = `/invite?token=${encodeURIComponent(token)}`

  useEffect(() => {
    if (!token) {
      setPreview({ valid: false, reason: "This invitation link is missing its token." })
      setLoading(false)
      return
    }
    let alive = true
    apiRequest<InvitePreview>(`/api/v1/organizations/invitations/${encodeURIComponent(token)}`)
      .then((res) => { if (alive) setPreview(res) })
      .catch((err) => {
        if (alive) {
          setPreview({
            valid: false,
            reason: err instanceof ApiError ? err.detail : "Could not load this invitation.",
          })
        }
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [token])

  const emailMismatch =
    !!user && !!preview?.email && user.email.toLowerCase() !== preview.email.toLowerCase()

  async function accept() {
    setAccepting(true)
    setError(null)
    try {
      const session = await authFetch<AuthSession>(
        `/api/v1/organizations/invitations/${encodeURIComponent(token)}/accept`,
        { method: "POST" },
      )
      dispatch(setSession(session))
      navigate("/dashboard/overview", { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not accept the invitation.")
      setAccepting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b border-border/60 bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Fluiq" className="size-7" />
            <span className="font-heading text-lg font-semibold tracking-tight">Fluiq</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <HugeiconsIcon icon={ArrowLeft02Icon} />
              Back to home
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-xl bg-muted">
                <HugeiconsIcon icon={Building01Icon} size={20} />
              </div>
              <CardTitle className="font-heading text-2xl">Team invitation</CardTitle>
              {loading ? (
                <CardDescription>Loading invitation…</CardDescription>
              ) : preview?.valid ? (
                <CardDescription>
                  {preview.inviter_name ? `${preview.inviter_name} invited you` : "You've been invited"} to
                  join <strong>{preview.org_name}</strong> as{" "}
                  <Badge variant="outline" className="capitalize">{preview.role}</Badge>
                </CardDescription>
              ) : (
                <CardDescription>This invitation can&apos;t be used.</CardDescription>
              )}
            </CardHeader>

            <CardContent className="gap-4">
              {loading ? (
                <div className="flex justify-center py-6">
                  <HugeiconsIcon icon={Loading03Icon} size={22} className="animate-spin text-muted-foreground" />
                </div>
              ) : !preview?.valid ? (
                <Alert>{preview?.reason ?? "This invitation is no longer valid."}</Alert>
              ) : !user ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Sign in or create an account with <strong>{preview.email}</strong> to accept.
                  </p>
                  <div className="grid gap-2">
                    <Button asChild className="w-full">
                      <Link to="/login" state={{ from: returnTo }}>
                        Sign in to accept
                        <HugeiconsIcon icon={ArrowRight02Icon} />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                      <Link to="/signup" state={{ from: returnTo }}>
                        Create an account
                      </Link>
                    </Button>
                  </div>
                </>
              ) : emailMismatch ? (
                <>
                  <Alert>
                    This invitation was sent to <strong>{preview.email}</strong>, but you&apos;re
                    signed in as <strong>{user.email}</strong>. Sign in with the invited email to
                    accept.
                  </Alert>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      await dispatch(logoutThunk())
                      navigate("/login", { state: { from: returnTo }, replace: true })
                    }}
                  >
                    Switch account
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
                    <HugeiconsIcon icon={Mail01Icon} size={14} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Joining as</span>
                    <span className="font-medium">{user.email}</span>
                  </div>
                  {error && <Alert>{error}</Alert>}
                  <Button className="w-full" onClick={accept} disabled={accepting}>
                    {accepting ? (
                      <>
                        <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
                        Joining…
                      </>
                    ) : (
                      <>
                        Accept invitation
                        <HugeiconsIcon icon={ArrowRight02Icon} />
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <HugeiconsIcon icon={Alert02Icon} size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

export default AcceptInvite
