import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, apiRequest } from "@/lib/api"
import type { OkResponse } from "@/lib/auth-types"

function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle")
  const [error, setError] = useState<string | null>(null)

  const isLoading = status === "loading"

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus("loading")
    setError(null)
    try {
      await apiRequest<OkResponse>("/auth/forgot-password", {
        method: "POST",
        body: { email },
      })
      setStatus("sent")
    } catch (err) {
      setStatus("idle")
      setError(err instanceof ApiError ? err.detail : "Could not send reset email")
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
              <CardTitle className="font-heading text-2xl">Forgot your password?</CardTitle>
              <CardDescription>
                Enter your email and we'll send you a one-time code to reset it.
              </CardDescription>
            </CardHeader>

            <CardContent className="gap-4">
              {status === "sent" ? (
                <div className="grid gap-4">
                  <div
                    role="status"
                    className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3 text-sm"
                  >
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]" />
                    <span>
                      If an account exists for <span className="font-medium">{email}</span>, we
                      sent a reset code that expires in 15 minutes.
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() =>
                      navigate(`/reset-password?email=${encodeURIComponent(email)}`)
                    }
                  >
                    I have my code
                    <HugeiconsIcon icon={ArrowRight02Icon} />
                  </Button>
                  <button
                    type="button"
                    onClick={() => setStatus("idle")}
                    className="text-center text-xs text-muted-foreground hover:text-foreground"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <form className="grid gap-4" onSubmit={onSubmit}>
                  <div className="grid gap-2">
                    <Label htmlFor="email">
                      <HugeiconsIcon icon={Mail01Icon} size={14} />
                      Work email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
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
                        Sending code
                      </>
                    ) : (
                      <>
                        Send reset code
                        <HugeiconsIcon icon={ArrowRight02Icon} />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link to="/login" className="font-medium text-[#1860D3] dark:text-[#6FA8FF] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default ForgotPassword
