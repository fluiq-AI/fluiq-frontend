import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  EyeIcon,
  ShieldIcon,
  ZapIcon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons"

/* ─── Trace types & helpers ──────────────────────────────────────────────── */
type TStatus = { l: string; c: "ok" | "warn" | "miss" }
interface Trace {
  id: string; model: string; sec: TStatus; cache: TStatus; ms: number; eval: string
}
const C_MODELS = ["claude-3.5-s", "gpt-4o", "claude-3-h", "gemini-1.5"]
const C_SEC: TStatus[] = [
  { l: "✓ Safe",    c: "ok"   }, { l: "✓ Safe", c: "ok"   },
  { l: "✓ Safe",    c: "ok"   }, { l: "⚠ Flagged", c: "warn" },
]
const C_CACHE: TStatus[] = [
  { l: "⚡ HIT",  c: "ok"   }, { l: "⚡ HIT", c: "ok"   }, { l: "○ MISS", c: "miss" },
]
const C_EVALS = ["0.96", "0.91", "0.88", "0.94", "0.83", "0.97", "0.90"]
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const rid  = () => "req_" + Math.random().toString(36).slice(2, 6).toUpperCase()
const mkTrace = (): Trace => ({
  id: rid(), model: pick(C_MODELS), sec: pick(C_SEC),
  cache: pick(C_CACHE), ms: Math.floor(130 + Math.random() * 560), eval: pick(C_EVALS),
})

// Deterministic first trace so the server HTML and the first client render match.
// mkTrace() uses Math.random(), which differs between server and client and would
// otherwise cause a hydration mismatch; the effect swaps in random traces after mount.
const INITIAL_TRACE: Trace = {
  id: "req_INIT", model: C_MODELS[0], sec: C_SEC[0],
  cache: C_CACHE[0], ms: 300, eval: C_EVALS[0],
}

/* ─── Pipeline stage definitions ─────────────────────────────────────────── */
interface PipelineStage {
  key: string; label: string; icon: typeof ShieldIcon
  pendingText: string; processingText: string
  getResult: (t: Trace) => { badge: string; detail: string; color: string; danger: boolean }
}
const PIPELINE_STAGES: PipelineStage[] = [
  {
    key: "security", label: "Security", icon: ShieldIcon,
    pendingText: "Scanning prompt", processingText: "Analyzing threats",
    getResult: (t) => ({
      badge: t.sec.l, color: t.sec.c === "ok" ? "#2D7A4F" : "#B85C2B",
      detail: t.sec.c === "ok" ? "0 threats detected" : "1 threat blocked",
      danger: t.sec.c !== "ok",
    }),
  },
  {
    key: "optimize", label: "Optimization", icon: ZapIcon,
    pendingText: "Checking cache", processingText: "Matching embeddings",
    getResult: (t) => ({
      badge: t.cache.l, color: t.cache.c === "ok" ? "#1860D3" : "#9A9A92",
      detail: t.cache.c === "ok" ? "Saved ~$0.003" : "LLM call forwarded",
      danger: false,
    }),
  },
  {
    key: "observe", label: "Observability", icon: EyeIcon,
    pendingText: "Recording trace", processingText: "Attributing costs",
    getResult: (t) => ({
      badge: `${t.ms}ms`, color: "#1860D3",
      detail: "Latency recorded", danger: false,
    }),
  },
  {
    key: "evaluate", label: "Evaluation", icon: TestTube01Icon,
    pendingText: "Scoring response", processingText: "Running LLM judge",
    getResult: (t) => ({
      badge: t.eval, danger: parseFloat(t.eval) < 0.88,
      color: parseFloat(t.eval) >= 0.88 ? "#2D7A4F" : "#B85C2B",
      detail: parseFloat(t.eval) >= 0.88 ? "Quality passed" : "Quality: warn",
    }),
  },
]

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function StatusRing({ state, danger = false }: { state: "waiting" | "processing" | "done"; danger?: boolean }) {
  if (state === "waiting") return (
    <div style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px solid var(--pp-bd)", flexShrink: 0 }} />
  )
  if (state === "processing") return (
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
      style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--pp-blue-soft)", borderTopColor: "var(--pp-blue)", flexShrink: 0 }} />
  )
  const bg = danger ? "var(--pp-amber)" : "var(--pp-blue)"
  return (
    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      style={{ width: 18, height: 18, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>{danger ? "!" : "✓"}</span>
    </motion.div>
  )
}

function FlowConnector({ active }: { active: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", height: 20 }}>
      <div style={{ width: 1, height: "100%", background: "var(--pp-bd)", position: "relative" }}>
        {active && (
          <motion.div
            style={{ position: "absolute", left: -3, width: 7, height: 7, borderRadius: "50%", background: "var(--pp-blue)" }}
            animate={{ top: [0, 13] }}
            transition={{ duration: 0.45, repeat: Infinity, ease: "linear", repeatDelay: 0.08 }}
          />
        )}
      </div>
    </div>
  )
}

/* ─── PipelineViz ────────────────────────────────────────────────────────── */
const DELAYS = [550, 520, 420, 520, 420, 520, 420, 520, 2300]

export function PipelineViz({ rpm, metrics }: { rpm: number; metrics: { cache: number; sec: number; eval: number } }) {
  const [step, setStep] = useState(0)
  const [trace, setTrace] = useState<Trace>(INITIAL_TRACE)

  useEffect(() => {
    const id = setTimeout(() => {
      if (step >= 8) { setTrace(mkTrace()); setStep(0) }
      else setStep(s => s + 1)
    }, DELAYS[step] ?? 500)
    return () => clearTimeout(id)
  }, [step])

  const stageState = (idx: number): "waiting" | "processing" | "done" => {
    const on = idx * 2 + 1, done = idx * 2 + 2
    if (step < on) return "waiting"
    if (step === on) return "processing"
    if (step >= done) return "done"
    return "waiting"
  }

  const isComplete = step >= 8
  const tokens = Math.floor(trace.ms * 1.8 + 200)
  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', 'Courier New', monospace" }

  return (
    <div className="pipeline-panel" style={{
      background: "var(--pp-bg)", border: "1px solid var(--pp-bd2)", borderRadius: 16,
      overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.08)",
    }}>
      <div style={{ background: "var(--pp-bg2)", borderBottom: "1px solid var(--pp-bd)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--pp-t1)", letterSpacing: "-0.01em" }}>
          Request Pipeline
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 5, ...mono, fontSize: 9, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--pp-green)" }}>
          <span className="live-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--pp-green)", display: "inline-block" }} />
          LIVE
        </div>
      </div>

      <div style={{ padding: "12px 14px 10px" }}>
        <AnimatePresence mode="wait">
          <motion.div key={trace.id}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: "var(--pp-bg2)", border: "1px solid var(--pp-bd)", borderRadius: 9, padding: "8px 11px", marginBottom: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--pp-t1)", lineHeight: 1, marginBottom: 4 }}>{trace.model}</div>
              <div style={{ ...mono, fontSize: 10, color: "var(--pp-t3)" }}>{trace.id} · ~{tokens} tokens</div>
            </div>
            <div style={{ ...mono, fontSize: 9, fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--pp-blue)", background: "var(--pp-blue-soft)", padding: "3px 8px", borderRadius: 4, flexShrink: 0 }}>
              Incoming
            </div>
          </motion.div>
        </AnimatePresence>

        {PIPELINE_STAGES.map((stage, idx) => {
          const state = stageState(idx)
          const result = stage.getResult(trace)
          const iconColor = state === "waiting" ? "var(--pp-bd2)" : state === "processing" ? "var(--pp-blue)" : result.color

          return (
            <div key={stage.key}>
              <FlowConnector active={step >= idx * 2 + 1} />
              <motion.div
                animate={{
                  borderColor: state === "processing" ? "var(--pp-blue)" : "var(--pp-bd)",
                  backgroundColor: state === "processing" ? "var(--pp-blue-soft)" : "var(--pp-bg)",
                }}
                transition={{ duration: 0.22 }}
                style={{ border: "1px solid var(--pp-bd)", borderRadius: 9, padding: "8px 11px", display: "flex", alignItems: "center", gap: 9 }}>
                <StatusRing state={state} danger={result.danger} />
                <span style={{ color: iconColor, flexShrink: 0, display: "flex", transition: "color 0.2s" }}>
                  <HugeiconsIcon icon={stage.icon} size={14} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--pp-t1)", lineHeight: 1.25 }}>{stage.label}</div>
                  <div style={{ ...mono, fontSize: 10, color: "var(--pp-t3)", lineHeight: 1.25 }}>
                    {state === "waiting" ? stage.pendingText : state === "processing" ? stage.processingText : result.detail}
                  </div>
                </div>
                <AnimatePresence>
                  {state === "done" && (
                    <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      style={{ ...mono, fontSize: 12, fontWeight: 700, color: result.color, flexShrink: 0 }}>
                      {result.badge}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          )
        })}

        <FlowConnector active={isComplete} />
        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div key="done"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ background: "var(--pp-blue)", borderRadius: 9, padding: "8px 11px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", lineHeight: 1, marginBottom: 3 }}>Response delivered</div>
                <div style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.6)" }}>
                  {trace.ms}ms · {trace.cache.c === "ok" ? "Served from cache" : "LLM response"}
                </div>
              </div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
                style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>✓</span>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="pending"
              style={{ border: "1px dashed var(--pp-bd)", borderRadius: 9, padding: "8px 11px", display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px dashed var(--pp-bd)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--pp-bd2)", fontWeight: 500 }}>Response</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ borderTop: "1px solid var(--pp-bd)", padding: "9px 14px", display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
        {[
          { label: "req/min", value: String(rpm) },
          { label: "cache",   value: Math.round(metrics.cache) + "%" },
          { label: "security", value: metrics.sec.toFixed(1) + "%" },
          { label: "eval",    value: (metrics.eval / 100).toFixed(2) },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: i === 0 ? "left" : i === 3 ? "right" : "center" }}>
            <div style={{ ...mono, fontSize: 14, fontWeight: 700, color: "var(--pp-t1)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            <div style={{ ...mono, fontSize: 9, color: "var(--pp-t3)", letterSpacing: "0.07em", textTransform: "uppercase", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
