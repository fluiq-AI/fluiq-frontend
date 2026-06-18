"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Github01Icon,
  GoogleIcon,
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
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { clearError, loginThunk } from "@/store/auth/slice"
import { API_BASE_URL } from "@/lib/api"
function Login() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { status, error, user } = useAppSelector((s) => s.auth)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const redirectTo =
    typeof (location.state as { from?: unknown } | null)?.from === "string"
      ? (location.state as { from: string }).from
      : "/dashboard"

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true })
  }, [user, navigate, redirectTo])

  useEffect(() => {
    return () => { dispatch(clearError()) }
  }, [dispatch])

  const isLoading = status === "loading"

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = await dispatch(loginThunk({ email, password }))
    if (loginThunk.fulfilled.match(result)) {
      navigate(redirectTo, { replace: true })
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
              <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to view your pipelines, traces, and benchmarks.
              </CardDescription>
            </CardHeader>

            <CardContent className="gap-4">
              <div className="grid gap-2">
                <Button variant="outline" className="w-full" asChild>
                  <a href={`${API_BASE_URL}/auth/oauth/github`}>
                    <HugeiconsIcon icon={Github01Icon} />
                    Continue with GitHub
                  </a>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <a href={`${API_BASE_URL}/auth/oauth/google`}>
                    <HugeiconsIcon icon={GoogleIcon} />
                    Continue with Google
                  </a>
                </Button>
              </div>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or with email</span>
                </div>
              </div>

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

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">
                      <HugeiconsIcon icon={LockIcon} size={14} />
                      Password
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-[#1860D3] dark:text-[#6FA8FF] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder={"\u2022".repeat(8)}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                      Signing in
                    </>
                  ) : (
                    <>
                      Sign in
                      <HugeiconsIcon icon={ArrowRight02Icon} />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-[#1860D3] dark:text-[#6FA8FF] hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default Login
