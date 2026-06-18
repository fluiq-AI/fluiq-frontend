"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  Github01Icon,
  GoogleIcon,
  Loading03Icon,
  LockIcon,
  Mail01Icon,
  UserIcon,
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
import { clearError, registerThunk } from "@/store/auth/slice"
import { API_BASE_URL } from "@/lib/api"
const perks = [
  "50,000 free traces every month to get started",
  "Tracing, evals, and dashboards out of the box",
  "Works with LangChain, LangGraph, CrewAI, OpenAI, Anthropic & Gemini",
]

function Signup() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { status, error, user } = useAppSelector((s) => s.auth)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true })
  }, [user, navigate])

  useEffect(() => {
    return () => { dispatch(clearError()) }
  }, [dispatch])

  const isLoading = status === "loading"

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = await dispatch(registerThunk({ name, email, password }))
    if (registerThunk.fulfilled.match(result)) {
      navigate("/dashboard", { replace: true })
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
        <div className="grid w-full max-w-5xl gap-10 md:grid-cols-2 md:items-center">
          <div className="hidden md:block">
            <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              Instrument your first pipeline in 60 seconds.
            </h1>
            <p className="mt-3 text-muted-foreground">
              Two lines of Python, any framework. Cost attribution, regression evals, and cross-pipeline benchmarks ship on day one.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {perks.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    size={18}
                    className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]"
                  />
                  <span className="text-muted-foreground">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="font-heading text-2xl">Create your account</CardTitle>
                <CardDescription>Free up to 50,000 traces a month. No credit card required.</CardDescription>
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
                    <Label htmlFor="name">
                      <HugeiconsIcon icon={UserIcon} size={14} />
                      Full name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Ada Lovelace"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

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
                    <Label htmlFor="password">
                      <HugeiconsIcon icon={LockIcon} size={14} />
                      Password
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
                        Creating account
                      </>
                    ) : (
                      <>
                        Create account
                        <HugeiconsIcon icon={ArrowRight02Icon} />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    By signing up you agree to our{" "}
                    <Link to="/terms" className="text-[#1860D3] dark:text-[#6FA8FF] hover:underline">Terms</Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-[#1860D3] dark:text-[#6FA8FF] hover:underline">Privacy Policy</Link>.
                  </p>
                </form>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-[#1860D3] dark:text-[#6FA8FF] hover:underline">
                Login
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Signup
