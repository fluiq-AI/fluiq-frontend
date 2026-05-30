import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  KeyIcon,
  Loading03Icon,
  LockIcon,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, apiRequest } from "@/lib/api"
import type { OkResponse } from "@/lib/auth-types"

function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initialEmail = useMemo(() => params.get("email") ?? "", [params])
  const initialOtp = useMemo(() => params.get("otp") ?? "", [params])

  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState(initialOtp)
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "success") return
    const id = window.setTimeout(() => navigate("/login", { replace: true }), 1500)
    return () => window.clearTimeout(id)
  }, [status, navigate])

  const isLoading = status === "loading"

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus("loading")
    setError(null)
    try {
      await apiRequest<OkResponse>("/auth/reset-password", {
        method: "POST",
        body: { email, otp, new_password: password },
      })
      setStatus("success")
    } catch (err) {
      setStatus("idle")
      setError(err instanceof ApiError ? err.detail : "Reset failed")
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
            <Link to="/login">
              <HugeiconsIcon icon={ArrowLeft02Icon} />
              Back to login
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="font-heading text-2xl">Set a new password</CardTitle>
              <CardDescription>
                Enter the one-time code from your email and choose a new password.
              </CardDescription>
            </CardHeader>

            <CardContent className="gap-4">
              {status === "success" ? (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3 text-sm"
                >
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]" />
                  <span>Password updated. Redirecting to sign in…</span>
                </div>
              ) : (
                <form className="grid gap-4" onSubmit={onSubmit}>
                  <div className="grid gap-2">
                    <Label htmlFor="email">
                      <HugeiconsIcon icon={Mail01Icon} size={14} />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="otp">
                      <HugeiconsIcon icon={KeyIcon} size={14} />
                      One-time code
                    </Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.trim())}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">
                      <HugeiconsIcon icon={LockIcon} size={14} />
                      New password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder={"\u2022".repeat(8)}
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      At least 8 characters, with one letter and one digit.
                    </p>
                  </div>

                  {error ? (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                    >
                      <HugeiconsIcon icon={Alert02Icon} size={16} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  ) : null}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
                        Updating
                      </>
                    ) : (
                      <>
                        Reset password
                        <HugeiconsIcon icon={ArrowRight02Icon} />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Didn't get a code?{" "}
            <Link to="/forgot-password" className="font-medium text-[#1860D3] dark:text-[#6FA8FF] hover:underline">
              Request another
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default ResetPassword
