import "@/styles/contact.css";
import { Helmet } from "react-helmet-async"
import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
  Mail01Icon,
  MessageQuestionIcon,
  Alert02Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { API_BASE_URL, ApiError } from "@/lib/api"
import { useScrollReveal } from "@/pages/Home/hooks/useScrollReveal"
import { SiteFooter } from "@/components/SiteFooter"
import { NavIntegrationsDropdown } from "@/components/NavIntegrationsDropdown"

const EASE_OUT = [0.22, 1, 0.36, 1] as const

export default function Contact() {
  useScrollReveal()
  const [navScrolled, setNavScrolled] = useState(false)

  const [name,    setName]    = useState("")
  const [email,   setEmail]   = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new ApiError(res.status, (data as { detail?: string }).detail ?? "Something went wrong")
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to send message. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="contact-page min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">
      <Helmet>
        <title>Contact — Fluiq</title>
        <meta name="description" content="Get in touch with the Fluiq team for sales enquiries, integration support, feature requests, and partnerships. We reply within one business day." />
        <meta name="keywords" content="contact Fluiq, Fluiq support, Fluiq sales, LLM observability support, Fluiq integrations, Fluiq partnerships" />
        <link rel="canonical" href="https://getfluiq.com/contact" />
        <meta property="og:url" content="https://getfluiq.com/contact" />
        <meta property="og:title" content="Contact — Fluiq" />
        <meta property="og:description" content="Get in touch with the Fluiq team for sales enquiries, integration support, feature requests, and partnerships. We reply within one business day." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "name": "Contact Fluiq",
          "description": "Contact the Fluiq team for sales enquiries, integration support, feature requests, and partnership discussions. Replies within one business day.",
          "url": "https://getfluiq.com/contact",
          "isPartOf": { "@id": "https://getfluiq.com" },
        })}</script>
      </Helmet>
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        navScrolled
          ? "bg-[#FAF9F6]/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#E5E1D6] dark:border-[#2A2A2A]"
          : "bg-[#FAF9F6] dark:bg-[#0A0A0A] border-b border-transparent"
      }`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Fluiq" className="size-7" />
            <span className="font-heading text-[15px] font-semibold tracking-tight">Fluiq</span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] text-[#6B6B66] dark:text-[#9A9A92] md:flex">
            <Link to="/" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Platform</Link>
            <NavIntegrationsDropdown />
            <Link to="/pricing" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Pricing</Link>
            <Link to="/documentation" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Docs</Link>
            <Link to="/contact" className="text-[#0a0a0a] dark:text-[#FAF9F6] font-medium">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="text-[#6B6B66] dark:text-[#9A9A92] hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6]" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button size="sm" className="cta-btn bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9]" asChild>
              <Link to="/signup">Get started <HugeiconsIcon icon={ArrowRight02Icon} size={14} /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative border-b border-[#D4CFC1] dark:border-[#1A1A1A] overflow-hidden py-24">

        {/* Background: dot grid + blue glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%)",
          }} />
          <div className="dark:block hidden absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%)",
          }} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vw] h-[55vw] max-w-[640px] max-h-[640px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(24,96,211,0.06) 0%, transparent 65%)" }} />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
          <motion.div className="mb-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9]/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1860D3] dark:text-[#6FA8FF]">
              <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
              We'd love to hear from you
            </span>
          </motion.div>

          <motion.h1
            className="font-heading mx-auto max-w-2xl text-5xl font-bold tracking-[-0.03em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.08] md:text-6xl"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE_OUT }}>
            Get in <span className="text-[#1860D3] dark:text-[#6FA8FF]">touch.</span>
          </motion.h1>

          <motion.p
            className="mt-5 mx-auto max-w-lg text-[17px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: EASE_OUT }}>
            Questions about pricing, integrations, or enterprise deployments? Drop us a message and we'll get back to you promptly.
          </motion.p>
        </div>
      </section>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-16 lg:grid-cols-[1fr_2fr]">

            {/* ── Contact info ── */}
            <div data-animate className="space-y-10">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1860D3] dark:text-[#6FA8FF] mb-6">
                  Reach out about
                </p>
                <ul className="space-y-5">
                  {[
                    { icon: MessageQuestionIcon,  label: "Sales & pricing",      desc: "Custom plans, volume discounts, and Enterprise quotes." },
                    { icon: Mail01Icon,            label: "Integration support",  desc: "Help connecting Fluiq to your existing stack or frameworks." },
                    { icon: CheckmarkCircle02Icon, label: "Feature requests",     desc: "Tell us what's missing and help shape the roadmap." },
                    { icon: ArrowRight02Icon,      label: "Partnerships",         desc: "Reseller, technology, and agency partnership enquiries." },
                  ].map(({ icon, label, desc }) => (
                    <li key={label} className="flex items-start gap-3">
                      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[#E8F0FD] dark:bg-[#1860D3]/10 text-[#1860D3] dark:text-[#6FA8FF]">
                        <HugeiconsIcon icon={icon} size={15} />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[#0a0a0a] dark:text-[#FAF9F6]">{label}</p>
                        <p className="text-[13px] text-[#6B6B66] dark:text-[#9A9A92] leading-snug">{desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9] dark:bg-[#1A1A1A] px-6 py-5">
                <p className="text-[13px] font-semibold text-[#0a0a0a] dark:text-[#FAF9F6] mb-1">Typical response time</p>
                <p className="text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">We reply to all messages within one business day.</p>
              </div>
            </div>

            {/* ── Form ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: EASE_OUT }}>
              {success ? (
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#FAF9F6] dark:bg-[#1A1A1A] px-8 py-16 text-center">
                  <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-[#E8F0FD] dark:bg-[#1860D3]/10">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={28} className="text-[#1860D3] dark:text-[#6FA8FF]" />
                  </div>
                  <h2 className="font-heading text-2xl font-bold text-[#0a0a0a] dark:text-[#FAF9F6] mb-2">Message sent!</h2>
                  <p className="mx-auto max-w-xs text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
                    Thanks for reaching out. We'll get back to you within one business day.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-8 border-[#E5E1D6] dark:border-[#2A2A2A] dark:text-[#FAF9F6] dark:hover:bg-[#1A1A1A]"
                    onClick={() => {
                      setSuccess(false)
                      setName(""); setEmail(""); setSubject(""); setMessage("")
                    }}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#FAF9F6] dark:bg-[#1A1A1A] px-8 py-10 space-y-5"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-[13px] font-medium text-[#1A1A1A] dark:text-[#9A9A92]">
                        Name <span className="text-[#ef4444]">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        required
                        className="h-10 border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9] dark:bg-[#1A1A1A] text-[14px] focus:border-[#1860D3] dark:focus:border-[#6FA8FF] focus:bg-[#FAF9F6] dark:focus:bg-[#0A0A0A]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-[13px] font-medium text-[#1A1A1A] dark:text-[#9A9A92]">
                        Email <span className="text-[#ef4444]">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        required
                        className="h-10 border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9] dark:bg-[#1A1A1A] text-[14px] focus:border-[#1860D3] dark:focus:border-[#6FA8FF] focus:bg-[#FAF9F6] dark:focus:bg-[#0A0A0A]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="subject" className="text-[13px] font-medium text-[#1A1A1A] dark:text-[#9A9A92]">
                      Subject <span className="text-[#ef4444]">*</span>
                    </Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="What's this about?"
                      required
                      className="h-10 border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9] dark:bg-[#1A1A1A] text-[14px] focus:border-[#1860D3] dark:focus:border-[#6FA8FF] focus:bg-[#FAF9F6] dark:focus:bg-[#0A0A0A]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="message" className="text-[13px] font-medium text-[#1A1A1A] dark:text-[#9A9A92]">
                      Message <span className="text-[#ef4444]">*</span>
                    </Label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us more…"
                      required
                      rows={7}
                      className="w-full resize-y rounded-md border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9] dark:bg-[#1A1A1A] px-3 py-2.5 text-[14px] leading-relaxed placeholder:text-[#9A9A92] dark:placeholder:text-[#555E6E] dark:text-[#FAF9F6] focus:border-[#1860D3] dark:focus:border-[#6FA8FF] focus:bg-[#FAF9F6] dark:focus:bg-[#0A0A0A] focus:outline-none transition-colors"
                    />
                  </div>

                  {error ? (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-[13px] text-red-600 dark:text-red-400">
                      <HugeiconsIcon icon={Alert02Icon} size={14} className="shrink-0" />
                      {error}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading || !name.trim() || !email.trim() || !subject.trim() || !message.trim()}
                    className="cta-btn w-full bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9] h-11 text-[14px] font-medium"
                  >
                    {loading ? (
                      <>
                        <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        Send message
                        <HugeiconsIcon icon={ArrowRight02Icon} size={16} />
                      </>
                    )}
                  </Button>
                  <p className="text-center text-[12px] text-[#9A9A92]">
                    We'll reply to your email address within one business day.
                  </p>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
