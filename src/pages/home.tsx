import { useState, useEffect, useRef } from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  ArrowRight02Icon,
  PythonIcon,
  CheckmarkCircle02Icon,
  EyeIcon,
  ShieldIcon,
  ZapIcon,
  TestTube01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { CodeBlock } from "@/components/code-block"

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-visible", "true")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    )
    const els = document.querySelectorAll("[data-animate]")
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

/* ─── Animated counter ──────────────────────────────────────────────── */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStarted(true); observer.disconnect() }
    })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    let frame = 0
    const total = 60
    const timer = setInterval(() => {
      frame++
      const progress = frame / total
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (frame >= total) { setCount(target); clearInterval(timer) }
    }, 25)
    return () => clearInterval(timer)
  }, [started, target])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

/* ─── Typing animation hook ─────────────────────────────────────────── */
function useTypingAnimation(lines: string[], speed = 30) {
  const [displayed, setDisplayed] = useState<string[]>([""])
  const [lineIdx, setLineIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStarted(true); observer.disconnect() }
    })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started || lineIdx >= lines.length) return
    if (charIdx < lines[lineIdx].length) {
      const t = setTimeout(() => {
        setDisplayed(prev => {
          const next = [...prev]
          next[lineIdx] = (next[lineIdx] || "") + lines[lineIdx][charIdx]
          return next
        })
        setCharIdx(c => c + 1)
      }, speed)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => {
        setLineIdx(i => i + 1)
        setCharIdx(0)
        setDisplayed(prev => [...prev, ""])
      }, 80)
      return () => clearTimeout(t)
    }
  }, [started, lineIdx, charIdx, lines, speed])

  return { displayed, ref }
}

/* ─── Data ───────────────────────────────────────────────────────────── */
const CODE_LINES = [
  `import fluiq`,
  ``,
  `fluiq.instrument(api_key="fl_...")   # trace every call`,
  `fluiq.secure(mode="block")            # block attacks`,
  `fluiq.optimize()                      # cache repeats`,
  `fluiq.eval(thresholds={               # gate quality`,
  `    "hallucination": 0.8,`,
  `    "relevance":     0.75,`,
  `})`,
]

const PILLARS = [
  {
    icon: EyeIcon,
    label: "Observe",
    title: "Full trace visibility",
    description:
      "Every token, latency, and cost attributed to the exact agent node that spent it. Streaming traces, cost anomaly alerts, and per-model breakdowns — without changing how you write code.",
    points: ["Per-node token attribution", "p50 / p95 / p99 latency tracking", "Real-time trace streaming"],
    code: `fluiq.instrument(api_key="fl_...")`,
  },
  {
    icon: ShieldIcon,
    label: "Secure",
    title: "Block attacks before they reach your model",
    description:
      "Pre-call scanning catches jailbreaks, prompt injections, and skeleton-key attacks before the LLM call is made. Post-call scanning redacts PII and secrets from stored traces.",
    points: ["Pre-call jailbreak + injection blocking", "PII & secret redaction on traces", "No false positives — fails open on errors"],
    code: `fluiq.secure(mode="block")`,
  },
  {
    icon: ZapIcon,
    label: "Optimize",
    title: "Stop paying for duplicate LLM calls",
    description:
      "Fluiq analyses your actual trace history to find which prompts repeat, then provisions a dedicated Redis instance for your account. Repeated calls are served from cache automatically.",
    points: ["Server-side Redis, zero infra to manage", "Profile built from your real traffic patterns", "Configurable TTL and model scope"],
    code: `fluiq.optimize()   # "cache" | "observe"`,
  },
  {
    icon: TestTube01Icon,
    label: "Evaluate",
    title: "Gate responses that fail quality thresholds",
    description:
      "LLM-as-judge runs server-side after each call. Set per-metric thresholds — warn mode logs quality scores to the dashboard; block mode raises FluiqEvalError before the response reaches your app.",
    points: ["hallucination, faithfulness, relevance, toxicity", "Scores stored and visible in the dashboard", "Block mode prevents bad responses reaching users"],
    code: `fluiq.eval(thresholds={"hallucination": 0.8})`,
  },
]

const INTEGRATIONS = [
  "OpenAI", "Anthropic", "Google Gemini", "LangChain", "LangGraph",
  "LlamaIndex", "CrewAI", "Pinecone", "Chroma", "Weaviate", "FAISS",
  "Google ADK", "Qdrant",
]

const STATS = [
  { value: 4, suffix: "", label: "SDK functions to cover your full AI stack" },
  { value: 6, suffix: "", label: "Evaluation metrics scored server-side" },
  { value: 5, suffix: "M", label: "Traces on the free tier, no card required" },
  { value: 2, suffix: "", label: "Lines of Python to instrument any pipeline" },
]

/* ─── Component ──────────────────────────────────────────────────────── */
export default function Home() {
  useScrollReveal()
  const [navScrolled, setNavScrolled] = useState(false)
  const { displayed, ref: codeRef } = useTypingAnimation(CODE_LINES, 18)

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">

      {/* ── Keyframe styles ─────────────────────────────────────────── */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes marqueeLeft {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .hero-badge  { animation: fadeIn  0.5s ease both; }
        .hero-h1     { animation: fadeUp  0.7s ease 0.1s both; }
        .hero-sub    { animation: fadeUp  0.7s ease 0.2s both; }
        .hero-cta    { animation: fadeUp  0.7s ease 0.3s both; }
        .hero-code   { animation: fadeUp  0.8s ease 0.4s both; }
        .marquee-track { animation: marqueeLeft 28s linear infinite; }
        .cursor { animation: blink 1s step-end infinite; }

        [data-animate] {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.65s cubic-bezier(0.16,1,0.3,1),
                      transform 0.65s cubic-bezier(0.16,1,0.3,1);
        }
        [data-animate][data-visible="true"] {
          opacity: 1;
          transform: translateY(0);
        }
        [data-delay="1"] { transition-delay: 0.08s; }
        [data-delay="2"] { transition-delay: 0.16s; }
        [data-delay="3"] { transition-delay: 0.24s; }
        [data-delay="4"] { transition-delay: 0.32s; }

        .pillar-card {
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        .pillar-card:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }
        .cta-btn {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .cta-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .cta-btn:active { transform: translateY(0); }

        @media (prefers-reduced-motion: reduce) {
          *, [data-animate], .marquee-track,
          .hero-badge, .hero-h1, .hero-sub, .hero-cta, .hero-code {
            animation: none !important;
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          navScrolled
            ? "bg-[#FAF9F6]/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#E5E1D6] dark:border-[#2A2A2A]"
            : "bg-[#FAF9F6] dark:bg-[#0A0A0A] border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/logo.svg" alt="Fluiq" className="size-7" />
            <span className="font-heading text-[15px] font-semibold tracking-tight">Fluiq</span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] text-[#6B6B66] dark:text-[#9A9A92] md:flex">
            <a href="#pillars" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Platform</a>
            <a href="#how-it-works" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">How it works</a>
            <Link to="/pricing" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Pricing</Link>
            <Link to="/documentation" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Docs</Link>
            <Link to="/contact" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="text-[#6B6B66] dark:text-[#9A9A92] hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6]" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button size="sm" className="cta-btn bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9]" asChild>
              <Link to="/signup">
                Get started
                <HugeiconsIcon icon={ArrowRight02Icon} size={14} />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative border-b border-[#D4CFC1] dark:border-[#1A1A1A] overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-20 md:pt-32 md:pb-28">
          <div className="flex flex-col items-center text-center">

            <div className="hero-badge mb-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9] dark:bg-[#1A1A1A] px-4 py-1.5 text-[12px] font-medium text-[#6B6B66] dark:text-[#9A9A92] tracking-wide">
                <span className="size-1.5 rounded-full bg-[#0a0a0a] dark:bg-[#F5F5F5] inline-block" />
                Observe · Secure · Optimize · Evaluate
              </span>
            </div>

            <h1 className="hero-h1 font-heading max-w-3xl text-5xl font-bold tracking-[-0.03em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.08] md:text-7xl">
              Replace four AI tools<br className="hidden md:block" /> with one SDK.
            </h1>

            <p className="hero-sub mt-6 max-w-xl text-[17px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
              Fluiq gives every LLM call observability, security scanning, response caching,
              and quality evaluation — wired in before your first production incident.
            </p>

            <div className="hero-cta mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Button size="lg" className="cta-btn bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9] px-6 h-11" asChild>
                <Link to="/documentation">
                  Read the docs
                  <HugeiconsIcon icon={ArrowRight02Icon} size={16} />
                </Link>
              </Button>
            </div>

            {/* Code block — typing animation */}
            <div ref={codeRef} className="hero-code mt-14 w-full max-w-2xl text-left">
              <div className="rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden shadow-2xl">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#1e1e1e]">
                  <span className="size-2.5 rounded-full bg-[#2a2a2a]" />
                  <span className="size-2.5 rounded-full bg-[#2a2a2a]" />
                  <span className="size-2.5 rounded-full bg-[#2a2a2a]" />
                  <div className="ml-auto flex items-center gap-1.5 text-[11px] text-[#6B6B66]">
                    <HugeiconsIcon icon={PythonIcon} size={12} />
                    <span>main.py</span>
                  </div>
                </div>
                <div className="p-5 font-mono text-[13px] leading-[1.8]">
                  {displayed.map((line, i) => (
                    <div key={i} className="flex">
                      <span className="select-none w-7 text-right text-[#3a3a3a] mr-4 text-[11px] leading-[1.8]">
                        {line !== "" || i < displayed.length - 1 ? i + 1 : ""}
                      </span>
                      <span>
                        {line.startsWith("import") && (
                          <span className="text-[#a0a0a0]">{line}</span>
                        )}
                        {line.startsWith("fluiq.") && (
                          <>
                            <span className="text-[#e0e0e0]">fluiq.</span>
                            <span className="text-[#ffffff]">{line.slice(6).split("(")[0]}</span>
                            <span className="text-[#e0e0e0]">({line.slice(6).split("(").slice(1).join("(")}</span>
                          </>
                        )}
                        {line.startsWith("    ") && (
                          <span className="text-[#a0a0a0]">{line}</span>
                        )}
                        {line === "}" && (
                          <span className="text-[#e0e0e0]">{"}"}</span>
                        )}
                        {line === "" && " "}
                        {i === displayed.length - 1 && (
                          <span className="cursor text-[#ffffff]">|</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Integration marquee ──────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-6 overflow-hidden">
        <div className="flex">
          <div className="marquee-track flex shrink-0 gap-8 pr-8">
            {[...INTEGRATIONS, ...INTEGRATIONS].map((name, i) => (
              <span key={i} className="shrink-0 text-[13px] font-medium text-[#9A9A92] dark:text-[#9A9A92] tracking-wide whitespace-nowrap px-2">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem statement ────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20" id="pillars">
        <div className="mx-auto max-w-6xl px-6">
          <div
            data-animate
            className="mx-auto max-w-3xl text-center"
          >
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9A9A92] dark:text-[#9A9A92] mb-4">
              The full picture
            </p>
            <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-[1.15] md:text-5xl">
              Observability tools tell you what broke.<br />
              <span className="text-[#6B6B66] dark:text-[#9A9A92]">Fluiq helps you prevent it.</span>
            </h2>
            <p className="mt-5 text-[16px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">
              Most platforms stop at tracing. Fluiq adds a security layer, a caching layer,
              and a quality gate — so you catch problems before your users do.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pillars ──────────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-2">
            {PILLARS.map((p, i) => (
              <div
                key={p.label}
                data-animate
                data-delay={String(i % 2 + 1)}
                className="pillar-card rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#FAF9F6] dark:bg-[#1A1A1A] p-8"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="grid size-9 place-items-center rounded-xl bg-[#F2F0E9] dark:bg-[#252525] text-[#0a0a0a] dark:text-[#FAF9F6]">
                    <HugeiconsIcon icon={p.icon} size={18} />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9A9A92] dark:text-[#9A9A92]">
                    {p.label}
                  </span>
                </div>
                <h3 className="font-heading text-[22px] font-bold text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug tracking-tight mb-3">
                  {p.title}
                </h3>
                <p className="text-[14px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-5">
                  {p.description}
                </p>
                <ul className="space-y-2 mb-6">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        size={14}
                        className="mt-0.5 shrink-0 text-[#0a0a0a] dark:text-[#FAF9F6]"
                      />
                      {pt}
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg bg-[#F2F0E9] dark:bg-[#1A1A1A] border border-[#E5E1D6] dark:border-[#2A2A2A] px-3 py-2 font-mono text-[12px] text-[#6B6B66] dark:text-[#9A9A92]">
                  {p.code}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20 bg-[#F2F0E9] dark:bg-[#0A0A0A]" id="how-it-works">
        <div className="mx-auto max-w-6xl px-6">
          <div data-animate className="mb-14 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9A9A92] dark:text-[#9A9A92] mb-4">
              How it works
            </p>
            <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug">
              Four functions. Production-ready in minutes.
            </h2>
          </div>

          <div className="grid gap-px bg-[#D4CFC1] dark:bg-[#2A2A2A] rounded-2xl overflow-hidden md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                fn: "instrument()",
                description: "Patches every LLM call automatically. Traces, costs, and latency start flowing to your dashboard.",
              },
              {
                step: "02",
                fn: "secure()",
                description: "Pre-call attack detection blocks bad prompts. Post-call scanning redacts PII from stored traces.",
              },
              {
                step: "03",
                fn: "optimize()",
                description: "Fluiq analyses your trace history, provisions Redis, and serves duplicate calls from cache.",
              },
              {
                step: "04",
                fn: "eval()",
                description: "LLM-as-judge scores every response. Warn or block based on your quality thresholds.",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                data-animate
                data-delay={String(i + 1)}
                className="bg-[#FAF9F6] dark:bg-[#1A1A1A] p-7"
              >
                <p className="text-[11px] font-semibold text-[#9A9A92] dark:text-[#9A9A92] tracking-widest mb-4">{item.step}</p>
                <p className="font-mono text-[15px] font-bold mb-3 text-[#0a0a0a] dark:text-[#FAF9F6]">
                  fluiq.{item.fn}
                </p>
                <p className="text-[13px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Full code example */}
          <div data-animate className="mt-10 rounded-2xl border border-[#1a1a1a] dark:border-[#2A2A2A] bg-[#0a0a0a] dark:bg-[#1A1A1A] overflow-hidden shadow-xl">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[#1e1e1e] dark:border-[#2A2A2A]">
              <HugeiconsIcon icon={PythonIcon} size={13} className="text-[#6B6B66]" />
              <span className="text-[11px] text-[#6B6B66] font-mono">Complete setup</span>
            </div>
            <CodeBlock variant="dark">{`import fluiq, openai

# 1. Wire instrumentation once at startup
fluiq.instrument(api_key="fl_...")

# 2. Block attacks before they reach the model (Team+)
fluiq.secure(mode="block")

# 3. Redis-cache repeated prompts (Team+)
fluiq.optimize()

# 4. Score and gate every response (all tiers)
fluiq.eval(
    thresholds={"hallucination": 0.8, "relevance": 0.75},
    mode="warn",          # "block" raises FluiqEvalError
)

# Your code is unchanged from here
client = openai.OpenAI()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "..."}],
)
# ↑ Traced, scanned, cached, and evaluated automatically`}</CodeBlock>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-px bg-[#D4CFC1] dark:bg-[#2A2A2A] rounded-2xl overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                data-animate
                data-delay={String(i + 1)}
                className="bg-[#FAF9F6] dark:bg-[#1A1A1A] px-8 py-10 text-center"
              >
                <p className="font-heading text-5xl font-bold text-[#0a0a0a] dark:text-[#FAF9F6] tracking-tight tabular-nums">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-[13px] text-[#6B6B66] dark:text-[#9A9A92] leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Frameworks ───────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div data-animate>
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9A9A92] dark:text-[#9A9A92] mb-4">
                Framework-agnostic
              </p>
              <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] leading-snug mb-4">
                Works with the stack you already use.
              </h2>
              <p className="text-[15px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed mb-6">
                Fluiq patches at the function-call level, not the framework level. Any Python function
                that hits an LLM or vector database becomes a traced span with one decorator.
              </p>
              <div className="flex flex-wrap gap-2">
                {INTEGRATIONS.map((f) => (
                  <span
                    key={f}
                    className="rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9] dark:bg-[#1A1A1A] px-3 py-1 text-[12px] font-medium text-[#6B6B66] dark:text-[#9A9A92]"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div data-animate data-delay="2" className="rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#FAF9F6] dark:bg-[#1A1A1A] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#D4CFC1] dark:border-[#2A2A2A]">
                <HugeiconsIcon icon={PythonIcon} size={13} className="text-[#9A9A92] dark:text-[#9A9A92]" />
                <span className="text-[12px] text-[#9A9A92] dark:text-[#9A9A92]">any_pipeline.py</span>
              </div>
              <CodeBlock preClassName="rounded-none border-0 bg-[#F2F0E9] dark:bg-[#1A1A1A]">{`from fluiq import instrument, trace

instrument(api_key="fl_...")

@trace
def answer_question(question: str) -> str:
    docs = vector_store.search(question, k=5)
    return llm.invoke(prompt(question, docs))

# Every call is now:
# → Traced with cost + latency
# → Security-scanned
# → Cached if repeated
# → Evaluated for quality`}</CodeBlock>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div data-animate>
            <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-[#0a0a0a] dark:bg-[#FAF9F6] text-white dark:text-[#0A0A0A] mb-6">
              <HugeiconsIcon icon={SparklesIcon} size={22} />
            </div>
            <h2 className="font-heading text-4xl font-bold tracking-[-0.025em] text-[#0a0a0a] dark:text-[#FAF9F6] md:text-5xl">
              Free up to 5M traces.
            </h2>
            <p className="mt-4 text-[16px] text-[#6B6B66] dark:text-[#9A9A92] leading-relaxed max-w-xl mx-auto">
              Start with observability on the free tier. Add security, optimization, and
              evaluation as your pipeline grows — no code changes required.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="cta-btn bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9] px-8 h-12 text-[15px]" asChild>
                <Link to="/signup">
                  Start for free
                  <HugeiconsIcon icon={ArrowRight02Icon} size={16} />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="cta-btn border-[#E5E1D6] dark:border-[#333333] text-[#0a0a0a] dark:text-[#FAF9F6] hover:bg-[#F2F0E9] dark:hover:bg-[#1A1A1A] px-8 h-12 text-[15px]" asChild>
                <Link to="/documentation">Read the docs</Link>
              </Button>
            </div>
            <p className="mt-5 text-[12px] text-[#9A9A92] dark:text-[#9A9A92]">
              No credit card required · pip install fluiq · instrument in 60 seconds
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-[#E5E1D6] dark:border-[#2A2A2A] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-6 text-[13px] text-[#9A9A92] dark:text-[#9A9A92] md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Fluiq" className="size-6 opacity-60" />
            <span className="font-heading font-semibold text-[#0a0a0a] dark:text-[#FAF9F6] text-[14px]">Fluiq</span>
            <span className="text-[#D4CFC1] dark:text-[#333333]">·</span>
            <span>Observe, protect, optimize, evaluate.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#pillars" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Platform</a>
            <Link to="/pricing" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Pricing</Link>
            <Link to="/documentation" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Docs</Link>
            <Link to="/contact" className="hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6] transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}