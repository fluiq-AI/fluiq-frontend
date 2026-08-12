"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FlashIcon,
  SparklesIcon,
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  Add01Icon,
  Cancel01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { IslandCta } from "@/components/IslandCta"
import { SiteFooter } from "@/components/SiteFooter"
import { SiteNavbar } from "@/components/SiteNavbar"
import { GrainOverlay, HeroAtmosphere } from "@/components/SiteBackdrop"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchModels, requestModel, reportPrice, type PricedModel } from "@/lib/models"
import { LLMCostFAQS as FAQS } from "@/lib/faqs"

const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** Last review of the bundled fallback prices (used only if the API is unreachable). */
export const PRICES_UPDATED = "June 2026"

type Model = { id: string; name: string; provider: string; in: number; out: number; cached: number | null }

/** Bundled fallback so the page is useful even if the pricing API is down. */
const FALLBACK_MODELS: Model[] = [
  { id: "f-gpt-4o", name: "GPT-4o", provider: "OpenAI", in: 2.5, out: 10, cached: 1.25 },
  { id: "f-gpt-4o-mini", name: "GPT-4o mini", provider: "OpenAI", in: 0.15, out: 0.6, cached: 0.075 },
  { id: "f-gpt-4.1", name: "GPT-4.1", provider: "OpenAI", in: 2.0, out: 8.0, cached: 0.5 },
  { id: "f-gpt-4.1-mini", name: "GPT-4.1 mini", provider: "OpenAI", in: 0.4, out: 1.6, cached: 0.1 },
  { id: "f-o3", name: "o3", provider: "OpenAI", in: 2.0, out: 8.0, cached: 0.5 },
  { id: "f-o4-mini", name: "o4-mini", provider: "OpenAI", in: 1.1, out: 4.4, cached: 0.275 },
  { id: "f-opus-4", name: "Claude Opus 4", provider: "Anthropic", in: 15, out: 75, cached: 1.5 },
  { id: "f-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic", in: 3, out: 15, cached: 0.3 },
  { id: "f-haiku-3-5", name: "Claude 3.5 Haiku", provider: "Anthropic", in: 0.8, out: 4, cached: 0.08 },
  { id: "f-gemini-2-5-pro", name: "Gemini 2.5 Pro", provider: "Google", in: 1.25, out: 10, cached: 0.31 },
  { id: "f-gemini-2-5-flash", name: "Gemini 2.5 Flash", provider: "Google", in: 0.3, out: 2.5, cached: 0.075 },
  { id: "f-gemini-2-0-flash", name: "Gemini 2.0 Flash", provider: "Google", in: 0.1, out: 0.4, cached: 0.025 },
  { id: "f-gemini-1-5-flash", name: "Gemini 1.5 Flash", provider: "Google", in: 0.075, out: 0.3, cached: 0.019 },
]

function mapApi(m: PricedModel): Model {
  return {
    id: String(m.id),
    name: m.model,
    provider: m.provider,
    in: m.input_per_million,
    out: m.output_per_million,
    cached: m.cached_input_per_million,
  }
}

function pickDefault(ms: Model[]): string {
  const pref = ms.find((m) => /^gpt-4o$/i.test(m.name)) ?? ms.find((m) => /gpt-4o/i.test(m.name)) ?? ms[0]
  return pref ? pref.id : ""
}

type Preset = { label: string; input: number; output: number; requests: number; hint: string }

const PRESETS: Preset[] = [
  { label: "Chatbot", input: 1500, output: 500, requests: 100_000, hint: "Short prompts, conversational replies" },
  { label: "RAG app", input: 6000, output: 800, requests: 50_000, hint: "Large retrieved context, concise answers" },
  { label: "Agent", input: 4000, output: 1200, requests: 200_000, hint: "Multi-step runs, many calls per task" },
]

function fmt(n: number, dp: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })
}
const usd = (n: number) => fmt(n, 2)
function usdPer(n: number) {
  if (n > 0 && n < 0.01) return fmt(n, 5)
  if (n < 1) return fmt(n, 4)
  return fmt(n, 2)
}
const reqCost = (m: Model, input: number, output: number) =>
  (input / 1_000_000) * m.in + (output / 1_000_000) * m.out

/* ── shared field styling ──────────────────────────────────────────────────── */

const inputCls =
  "w-full rounded-xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-white dark:bg-[#0F0F0F] px-4 py-2.5 text-[15px] text-[#0a0a0a] dark:text-[#FAF9F6] outline-none transition-colors placeholder:text-[#B5B0A4] dark:placeholder:text-[#5A5A52] focus:border-[#1860D3] dark:focus:border-[#6FA8FF]"
const numCls = inputCls + " font-mono tabular-nums"
const labelCls = "mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6B6B66] dark:text-[#9A9A92]"

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  suffix?: string
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className={numCls}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-[#9A9A92]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  )
}

/* ── request-a-model ───────────────────────────────────────────────────────── */

function RequestModelForm({ onClose }: { onClose: () => void }) {
  const [model, setModel] = useState("")
  const [provider, setProvider] = useState("")
  const [email, setEmail] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle")

  const submit = async () => {
    if (!model.trim()) return
    setState("sending")
    try {
      await requestModel({ model: model.trim(), provider: provider.trim() || undefined, email: email.trim() || undefined })
      setState("done")
    } catch {
      setState("error")
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-[#1860D3]/30 dark:border-[#6FA8FF]/25 bg-[#E8F0FD]/50 dark:bg-[#1860D3]/10 p-5 text-center">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={22} className="mx-auto mb-2 text-[#1860D3] dark:text-[#6FA8FF]" />
        <p className="text-[14px] font-medium text-[#0a0a0a] dark:text-[#FAF9F6]">Request received.</p>
        <p className="mt-1 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">We will add {model} to the calculator soon.</p>
        <button onClick={onClose} className="mt-3 text-[13px] font-medium text-[#1860D3] dark:text-[#6FA8FF] hover:underline">
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-white/60 dark:bg-[#0F0F0F]/60 p-5">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold text-[#0a0a0a] dark:text-[#FAF9F6]">Request a model</p>
        <button onClick={onClose} aria-label="Close" className="text-[#9A9A92] hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6]">
          <HugeiconsIcon icon={Cancel01Icon} size={16} />
        </button>
      </div>
      <TextField label="Model name" value={model} onChange={setModel} placeholder="e.g. Mistral Large 2" />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Provider" value={provider} onChange={setProvider} placeholder="Mistral" />
        <TextField label="Email (optional)" value={email} onChange={setEmail} placeholder="you@work.com" type="email" />
      </div>
      {state === "error" && (
        <p className="text-[13px] text-[#C0392B] dark:text-[#FF8A7A]">Something went wrong. Please try again.</p>
      )}
      <button
        onClick={submit}
        disabled={!model.trim() || state === "sending"}
        className="w-full rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#161616] disabled:opacity-50 dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9]"
      >
        {state === "sending" ? "Sending..." : "Send request"}
      </button>
    </div>
  )
}

/* ── report-a-price ────────────────────────────────────────────────────────── */

function ReportPriceForm({ model, onClose }: { model: Model; onClose: () => void }) {
  const [input, setInput] = useState(String(model.in))
  const [output, setOutput] = useState(String(model.out))
  const [source, setSource] = useState("")
  const [email, setEmail] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle")

  const submit = async () => {
    setState("sending")
    try {
      await reportPrice({
        model_price_id: /^\d+$/.test(model.id) ? Number(model.id) : null,
        provider: model.provider,
        model: model.name,
        reported_input: input.trim() ? Number(input) : null,
        reported_output: output.trim() ? Number(output) : null,
        source_url: source.trim() || undefined,
        email: email.trim() || undefined,
      })
      setState("done")
    } catch {
      setState("error")
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-[#1860D3]/30 dark:border-[#6FA8FF]/25 bg-[#E8F0FD]/50 dark:bg-[#1860D3]/10 p-5 text-center">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={22} className="mx-auto mb-2 text-[#1860D3] dark:text-[#6FA8FF]" />
        <p className="text-[14px] font-medium text-[#0a0a0a] dark:text-[#FAF9F6]">Thanks for the heads up.</p>
        <p className="mt-1 text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">We will verify and update {model.name}.</p>
        <button onClick={onClose} className="mt-3 text-[13px] font-medium text-[#1860D3] dark:text-[#6FA8FF] hover:underline">
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-white/60 dark:bg-[#0F0F0F]/60 p-5">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold text-[#0a0a0a] dark:text-[#FAF9F6]">
          Report a price change for {model.name}
        </p>
        <button onClick={onClose} aria-label="Close" className="text-[#9A9A92] hover:text-[#0a0a0a] dark:hover:text-[#FAF9F6]">
          <HugeiconsIcon icon={Cancel01Icon} size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Input / 1M</label>
          <input value={input} onChange={(e) => setInput(e.target.value)} inputMode="decimal" className={numCls} />
        </div>
        <div>
          <label className={labelCls}>Output / 1M</label>
          <input value={output} onChange={(e) => setOutput(e.target.value)} inputMode="decimal" className={numCls} />
        </div>
      </div>
      <TextField label="Source URL" value={source} onChange={setSource} placeholder="Link to the provider's pricing page" />
      <TextField label="Email (optional)" value={email} onChange={setEmail} placeholder="you@work.com" type="email" />
      {state === "error" && (
        <p className="text-[13px] text-[#C0392B] dark:text-[#FF8A7A]">Something went wrong. Please try again.</p>
      )}
      <button
        onClick={submit}
        disabled={state === "sending"}
        className="w-full rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#161616] disabled:opacity-50 dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#F2F0E9]"
      >
        {state === "sending" ? "Sending..." : "Submit report"}
      </button>
    </div>
  )
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#EDE9DE] dark:bg-[#222] ${className}`} />
}

/* ── main ──────────────────────────────────────────────────────────────────── */

export default function LlmCostCalculator() {
  const reduce = useReducedMotionSafe()

  const [models, setModels] = useState<Model[]>([])
  const [source, setSource] = useState<"loading" | "api" | "fallback">("loading")
  const [modelId, setModelId] = useState("")

  const [input, setInput] = useState(1500)
  const [output, setOutput] = useState(500)
  const [requests, setRequests] = useState(100_000)
  const [cacheHit, setCacheHit] = useState(60)

  const [filter, setFilter] = useState("")
  const [showRequest, setShowRequest] = useState(false)
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    fetchModels(ctrl.signal)
      .then((res) => {
        const mapped = (res.models ?? []).map(mapApi).filter((m) => Number.isFinite(m.in) && Number.isFinite(m.out))
        if (mapped.length) {
          setModels(mapped)
          setModelId(pickDefault(mapped))
          setSource("api")
        } else {
          setModels(FALLBACK_MODELS)
          setModelId(pickDefault(FALLBACK_MODELS))
          setSource("fallback")
        }
      })
      .catch(() => {
        if (ctrl.signal.aborted) return
        setModels(FALLBACK_MODELS)
        setModelId(pickDefault(FALLBACK_MODELS))
        setSource("fallback")
      })
    return () => ctrl.abort()
  }, [])

  const providers = useMemo(() => {
    const seen: string[] = []
    for (const m of models) if (!seen.includes(m.provider)) seen.push(m.provider)
    return seen
  }, [models])

  const model = useMemo(() => models.find((m) => m.id === modelId), [models, modelId])

  const perRequest = model ? reqCost(model, input, output) : 0
  const monthly = perRequest * requests
  const annual = monthly * 12
  const cachedMonthly = monthly * (1 - cacheHit / 100)
  const savings = monthly - cachedMonthly

  const comparison = useMemo(() => {
    const f = filter.trim().toLowerCase()
    return models
      .map((m) => ({ ...m, monthly: reqCost(m, input, output) * requests }))
      .filter((m) => !f || m.name.toLowerCase().includes(f) || m.provider.toLowerCase().includes(f))
      .sort((a, b) => a.monthly - b.monthly)
  }, [models, input, output, requests, filter])

  const applyPreset = (p: Preset) => {
    setInput(p.input)
    setOutput(p.output)
    setRequests(p.requests)
  }

  const loading = source === "loading"

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">
      <GrainOverlay />
      <SiteNavbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[#D4CFC1] dark:border-[#1A1A1A] pt-20 pb-10">
        <HeroAtmosphere variant="center" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <motion.span
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#F2F0E9]/80 dark:bg-[#1A1A1A]/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#1860D3] dark:text-[#6FA8FF] backdrop-blur-sm"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            Free tool
          </motion.span>
          <motion.h1
            className="font-heading mx-auto max-w-2xl text-4xl font-bold leading-[1.08] tracking-[-0.03em] md:text-5xl"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT }}
          >
            LLM Cost <span className="text-[#1860D3] dark:text-[#6FA8FF]">Calculator</span>
          </motion.h1>
          <motion.p
            className="mt-4 mx-auto max-w-lg text-[16px] leading-relaxed text-[#6B6B66] dark:text-[#9A9A92]"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE_OUT }}
          >
            Estimate the monthly cost of any OpenAI, Anthropic, or Google model, then see how much
            caching could save you.
          </motion.p>
        </div>
      </section>

      {/* ── Two-pane calculator ──────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-14">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start">
          {/* LEFT — inputs */}
          <div className="lg:sticky lg:top-24 rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#FAF9F6] dark:bg-[#1A1A1A] p-6">
            <h2 className="font-heading text-[18px] font-bold tracking-tight">Your workload</h2>

            <div className="mt-5">
              <span className={labelCls}>Quick presets</span>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    title={p.hint}
                    className="rounded-full border border-[#E5E1D6] dark:border-[#2A2A2A] bg-white dark:bg-[#0F0F0F] px-3.5 py-1.5 text-[12px] font-medium text-[#6B6B66] transition-colors hover:border-[#1860D3]/50 hover:text-[#0a0a0a] dark:text-[#9A9A92] dark:hover:border-[#6FA8FF]/50 dark:hover:text-[#FAF9F6]"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <label className={labelCls} htmlFor="model">
                Model
              </label>
              {loading ? (
                <Skeleton className="h-[46px] w-full" />
              ) : (
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger
                    id="model"
                    className="h-auto w-full rounded-xl border-[#E5E1D6] bg-white px-4 py-2.5 text-[15px] text-[#0a0a0a] shadow-none focus:border-[#1860D3] focus:ring-0 dark:border-[#2A2A2A] dark:bg-[#0F0F0F] dark:text-[#FAF9F6] dark:focus:border-[#6FA8FF]"
                  >
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[340px] border-[#E5E1D6] bg-[#FAF9F6] dark:border-[#2A2A2A] dark:bg-[#1A1A1A]">
                    {providers.map((prov) => (
                      <SelectGroup key={prov}>
                        <SelectLabel className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9A92]">
                          {prov}
                        </SelectLabel>
                        {models
                          .filter((m) => m.provider === prov)
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              <span className="flex w-full items-center justify-between gap-4">
                                <span className="text-[#0a0a0a] dark:text-[#FAF9F6]">{m.name}</span>
                                <span className="font-mono text-[11px] tabular-nums text-[#9A9A92]">
                                  ${m.in} / ${m.out}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowRequest((v) => !v)
                  setShowReport(false)
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1860D3] dark:text-[#6FA8FF] hover:underline"
              >
                <HugeiconsIcon icon={Add01Icon} size={14} />
                Don&apos;t see your model? Request it
              </button>
            </div>

            <AnimatePresence initial={false}>
              {showRequest && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={reduce ? undefined : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: EASE_OUT }}
                  className="overflow-hidden"
                >
                  <div className="pt-4">
                    <RequestModelForm onClose={() => setShowRequest(false)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <NumberField label="Input tokens" value={input} onChange={setInput} suffix="/ req" />
              <NumberField label="Output tokens" value={output} onChange={setOutput} suffix="/ req" />
            </div>
            <div className="mt-4">
              <NumberField label="Requests per month" value={requests} onChange={setRequests} suffix="/ mo" />
            </div>

            <div className="mt-6">
              <div className="mb-1.5 flex items-center justify-between">
                <label className={labelCls + " mb-0"} htmlFor="cache">
                  Cache hit rate
                </label>
                <span className="font-mono text-[13px] font-semibold tabular-nums text-[#1860D3] dark:text-[#6FA8FF]">
                  {cacheHit}%
                </span>
              </div>
              <input
                id="cache"
                type="range"
                min={0}
                max={90}
                step={5}
                value={cacheHit}
                onChange={(e) => setCacheHit(Number(e.target.value))}
                className="w-full accent-[#1860D3] dark:accent-[#6FA8FF]"
              />
              <p className="mt-1.5 text-[12px] text-[#9A9A92]">
                Share of requests served from cache instead of the model. Repetitive workloads
                routinely hit 40 to 70 percent.
              </p>
            </div>
          </div>

          {/* RIGHT — pricing */}
          <div className="flex flex-col gap-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Headline cost */}
              <div className="rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#FAF9F6] dark:bg-[#1A1A1A] p-6">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-[#6B6B66] dark:text-[#9A9A92]">
                    Monthly cost
                  </span>
                  <span className="text-[12px] text-[#9A9A92]">{model?.name ?? ""}</span>
                </div>
                {loading || !model ? (
                  <Skeleton className="mt-3 h-12 w-40" />
                ) : (
                  <div className="mt-2 font-heading text-[44px] font-bold leading-none tracking-tight tabular-nums">
                    {usd(monthly)}
                  </div>
                )}
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#E5E1D6] dark:border-[#2A2A2A] pt-4 text-[13px]">
                  <div>
                    <p className="text-[#9A9A92]">Per request</p>
                    <p className="font-mono font-semibold tabular-nums">{model ? usdPer(perRequest) : "--"}</p>
                  </div>
                  <div>
                    <p className="text-[#9A9A92]">Per year</p>
                    <p className="font-mono font-semibold tabular-nums">{model ? usd(annual) : "--"}</p>
                  </div>
                </div>
              </div>

              {/* Caching savings */}
              <div className="rounded-2xl border border-[#1860D3]/30 dark:border-[#6FA8FF]/25 bg-[#E8F0FD]/50 dark:bg-[#1860D3]/10 p-6">
                <div className="flex items-center gap-2 text-[#1860D3] dark:text-[#6FA8FF]">
                  <HugeiconsIcon icon={FlashIcon} size={16} />
                  <span className="text-[12px] font-semibold uppercase tracking-wider">With caching</span>
                </div>
                {loading || !model ? (
                  <Skeleton className="mt-3 h-10 w-32" />
                ) : (
                  <>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-heading text-[34px] font-bold leading-none tracking-tight tabular-nums">
                        {usd(cachedMonthly)}
                      </span>
                      <span className="text-[13px] text-[#6B6B66] dark:text-[#9A9A92]">/ mo</span>
                    </div>
                    <p className="mt-2 text-[13px] text-[#0a0a0a] dark:text-[#E5E1D6]">
                      Save{" "}
                      <span className="font-semibold text-[#1860D3] dark:text-[#6FA8FF]">{usd(savings)}/mo</span> at a{" "}
                      {cacheHit}% hit rate.
                    </p>
                  </>
                )}
                <div className="mt-4">
                  <IslandCta to="/observability" variant="accent">
                    Track your real spend
                  </IslandCta>
                </div>
              </div>
            </div>

            {/* Report price */}
            {model && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowReport((v) => !v)
                    setShowRequest(false)
                  }}
                  className="text-[13px] font-medium text-[#6B6B66] hover:text-[#1860D3] dark:text-[#9A9A92] dark:hover:text-[#6FA8FF]"
                >
                  Spotted a price change for {model.name}? Report it
                </button>
                <AnimatePresence initial={false}>
                  {showReport && (
                    <motion.div
                      initial={reduce ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={reduce ? undefined : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: EASE_OUT }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 max-w-xl">
                        <ReportPriceForm model={model} onClose={() => setShowReport(false)} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Comparison */}
            <div className="rounded-2xl border border-[#E5E1D6] dark:border-[#2A2A2A] bg-[#FAF9F6] dark:bg-[#1A1A1A]">
              <div className="flex flex-col gap-3 border-b border-[#E5E1D6] dark:border-[#2A2A2A] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-heading text-[16px] font-bold tracking-tight">Every model, your workload</h3>
                  <p className="mt-0.5 text-[12px] text-[#9A9A92]">
                    {input.toLocaleString()} in / {output.toLocaleString()} out tokens ×{" "}
                    {requests.toLocaleString()} req. Cheapest first. Tap a row to select.
                  </p>
                </div>
                <div className="relative sm:w-52">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9A92]"
                  />
                  <input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter models"
                    className={inputCls + " py-2 pl-8 text-[13px]"}
                  />
                </div>
              </div>

              <div className="max-h-[460px] overflow-y-auto">
                {loading ? (
                  <div className="space-y-2 p-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-full" />
                    ))}
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#F2F0E9] dark:bg-[#161616]">
                        <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] dark:text-[#9A9A92]">
                          Model
                        </th>
                        <th className="hidden px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] dark:text-[#9A9A92] sm:table-cell">
                          In / Out (1M)
                        </th>
                        <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-[#6B6B66] dark:text-[#9A9A92]">
                          Monthly
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map((m) => {
                        const active = m.id === modelId
                        return (
                          <tr
                            key={m.id}
                            onClick={() => setModelId(m.id)}
                            className={`cursor-pointer border-b border-[#EDE9DE] last:border-0 dark:border-[#222] ${
                              active
                                ? "bg-[#E8F0FD]/60 dark:bg-[#1860D3]/10"
                                : "hover:bg-[#F2F0E9]/60 dark:hover:bg-[#161616]"
                            }`}
                          >
                            <td className="px-5 py-2.5">
                              <span className="flex items-center gap-2 text-[14px] font-medium">
                                {m.name}
                                {active && (
                                  <HugeiconsIcon
                                    icon={CheckmarkCircle02Icon}
                                    size={13}
                                    className="text-[#1860D3] dark:text-[#6FA8FF]"
                                  />
                                )}
                              </span>
                              <span className="text-[11px] text-[#9A9A92]">{m.provider}</span>
                            </td>
                            <td className="hidden px-5 py-2.5 text-right font-mono text-[12px] tabular-nums text-[#6B6B66] dark:text-[#9A9A92] sm:table-cell">
                              ${m.in} / ${m.out}
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono text-[13px] font-semibold tabular-nums">
                              {usd(m.monthly)}
                            </td>
                          </tr>
                        )
                      })}
                      {comparison.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-5 py-8 text-center text-[13px] text-[#9A9A92]">
                            No models match &ldquo;{filter}&rdquo;.{" "}
                            <button
                              onClick={() => {
                                setFilter("")
                                setShowRequest(true)
                              }}
                              className="font-medium text-[#1860D3] dark:text-[#6FA8FF] hover:underline"
                            >
                              Request it
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <p className="text-[12px] text-[#9A9A92]">
              {source === "fallback"
                ? `Showing built-in list prices (updated ${PRICES_UPDATED}); live pricing was unavailable. `
                : "List prices per 1M tokens, standard tier. "}
              Estimates only. Confirm current rates with each provider.
            </p>
          </div>
        </div>
      </section>

      {/* ── Explainer + FAQ ──────────────────────────────────────────────── */}
      <section className="border-b border-[#D4CFC1] dark:border-[#1A1A1A] py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-heading text-[26px] font-bold tracking-tight">How LLM pricing works</h2>
          <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-[#4a4a47] dark:text-[#C9C4B8]">
            <p>
              LLM providers bill per <strong>token</strong>, roughly 4 characters or about 0.75 words
              of English. Every request is priced in two parts: the <strong>input</strong> tokens you
              send (your prompt, system message, and any retrieved context) and the{" "}
              <strong>output</strong> tokens the model generates. Output is almost always the more
              expensive of the two.
            </p>
            <p>
              Your monthly bill is the per-request cost multiplied by your request volume. The
              calculator prices your specific workload across every model in our database, so you can
              compare real cost instead of a generic benchmark.
            </p>
          </div>

          <h2 className="mt-12 font-heading text-[26px] font-bold tracking-tight">How to cut your LLM costs</h2>
          <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-[#4a4a47] dark:text-[#C9C4B8]">
            {[
              "Cache repeated calls. Many production workloads send the same or near-identical prompts repeatedly. Serving those from a cache removes the model call entirely.",
              "Right-size the model. A smaller model often handles routine tasks at a fraction of the cost. Use the table above to see the gap.",
              "Trim the prompt. Shorter system messages and tighter retrieved context cut input tokens on every call.",
              "Cap output length. Set a max output token limit so the model stops once it has answered.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={18}
                  className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]"
                />
                <span>{t}</span>
              </li>
            ))}
          </ul>

          <h2 className="mt-12 font-heading text-[26px] font-bold tracking-tight">Frequently asked questions</h2>
          <div className="mt-5 divide-y divide-[#E5E1D6] border-y border-[#E5E1D6] dark:divide-[#2A2A2A] dark:border-[#2A2A2A]">
            {FAQS.map((f) => (
              <div key={f.q} className="py-5">
                <h3 className="font-heading text-[16px] font-semibold">{f.q}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#4a4a47] dark:text-[#C9C4B8]">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <HugeiconsIcon icon={SparklesIcon} size={22} className="mx-auto mb-4 text-[#1860D3] dark:text-[#6FA8FF]" />
          <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">Stop estimating. Start measuring.</h2>
          <p className="mt-4 mx-auto max-w-lg text-[16px] leading-relaxed text-[#6B6B66] dark:text-[#9A9A92]">
            Fluiq traces every LLM call with real token counts and USD cost at provider rates,
            attributed to the agent node that spent it. Two lines of Python.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <IslandCta to="/signup" variant="accent">
              Start free
            </IslandCta>
            <IslandCta to="/observability" variant="ghost">
              See how tracing works
              <HugeiconsIcon icon={ArrowRight02Icon} size={15} className="ml-2 inline" />
            </IslandCta>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
