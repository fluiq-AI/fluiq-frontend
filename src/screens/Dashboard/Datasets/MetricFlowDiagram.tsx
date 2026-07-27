"use client"

import { useMemo } from "react"
import {
  Background,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { cn } from "@/lib/utils"

/**
 * The evaluation architecture behind each built-in metric.
 *
 * Several metrics are multi-step: hallucination extracts atomic claims and then
 * verifies them against the reference, so editing one of its prompts only
 * changes one stage of the pipeline. These specs mirror the evaluator worker
 * (jobs/helper/hallucination.py and jobs/helper/ragas.py) so the diagram shows
 * what actually runs, and the prompt list per metric is derived from them.
 */

type StepKind = "input" | "prompt" | "decision" | "score"

interface StepSpec {
  id: string
  kind: StepKind
  label: string
  note?: string
  /** Judge-prompt name, when this step is an LLM call. */
  prompt?: string
  x: number
  y: number
}

interface MetricFlow {
  steps: StepSpec[]
  edges: { from: string; to: string; label?: string }[]
}

const COL = 210
const ROW = 104

function singleStepFlow(promptName: string, inputLabel: string, scoreLabel: string): MetricFlow {
  return {
    steps: [
      { id: "in", kind: "input", label: inputLabel, x: 0, y: 0 },
      { id: "judge", kind: "prompt", label: "Grade with judge", prompt: promptName, x: COL, y: 0 },
      { id: "score", kind: "score", label: scoreLabel, x: COL * 2, y: 0 },
    ],
    edges: [
      { from: "in", to: "judge" },
      { from: "judge", to: "score" },
    ],
  }
}

export const METRIC_FLOWS: Record<string, MetricFlow> = {
  hallucination: {
    steps: [
      { id: "in", kind: "input", label: "Answer", note: "plus reference / contexts", x: 0, y: ROW / 2 },
      { id: "gate", kind: "decision", label: "Reference available?", x: COL, y: ROW / 2 },
      {
        id: "claims", kind: "prompt", label: "Extract claims",
        note: "atomic factual claims", prompt: "hallucination_claims", x: COL * 2, y: 0,
      },
      {
        id: "verify", kind: "prompt", label: "Verify claims",
        note: "each claim vs reference", prompt: "hallucination_verify", x: COL * 3, y: 0,
      },
      {
        id: "nocontext", kind: "prompt", label: "Judge directly",
        note: "general knowledge", prompt: "hallucination_no_context", x: COL * 2, y: ROW,
      },
      {
        id: "score", kind: "score", label: "Score",
        note: "supported ÷ total claims", x: COL * 4, y: ROW / 2,
      },
    ],
    edges: [
      { from: "in", to: "gate" },
      { from: "gate", to: "claims", label: "yes" },
      { from: "gate", to: "nocontext", label: "no" },
      { from: "claims", to: "verify" },
      { from: "verify", to: "score" },
      { from: "nocontext", to: "score" },
    ],
  },
  faithfulness: {
    steps: [
      { id: "in", kind: "input", label: "Question + Answer", x: 0, y: ROW / 2 },
      { id: "gate", kind: "decision", label: "Contexts provided?", x: COL, y: ROW / 2 },
      {
        id: "statements", kind: "prompt", label: "Extract statements",
        prompt: "faithfulness_statements", x: COL * 2, y: 0,
      },
      {
        id: "verify", kind: "prompt", label: "Check entailment",
        note: "statements vs context", prompt: "faithfulness_verify", x: COL * 3, y: 0,
      },
      {
        id: "score", kind: "score", label: "Score",
        note: "entailed ÷ total", x: COL * 4, y: ROW / 2,
      },
    ],
    edges: [
      { from: "in", to: "gate" },
      { from: "gate", to: "statements", label: "yes" },
      { from: "gate", to: "score", label: "no → 0.0" },
      { from: "statements", to: "verify" },
      { from: "verify", to: "score" },
    ],
  },
  relevance:    singleStepFlow("answer_relevancy", "Question + Answer", "Relevance score"),
  toxicity:     singleStepFlow("toxicity", "Answer", "Toxicity score"),
  coherence:    singleStepFlow("coherence", "Answer", "Coherence score"),
  completeness: singleStepFlow("completeness", "Answer", "Completeness score"),
  // The agentic evaluator's layered pipeline (jobs/agentic/orchestrator.py):
  // L0 normalize → L1 deterministic (no judge) → L2 tool selection →
  // L3 trajectory → L4 multi-agent coordination → optional deep jury → gated
  // run score. Depth decides how far it runs: fast stops after L2, standard
  // adds L3/L4, deep adds the jury.
  agentic: {
    steps: [
      { id: "in", kind: "input", label: "Normalize trace", note: "spans → agent run", x: 0, y: 0 },
      { id: "l1", kind: "decision", label: "Deterministic", note: "L1 · errors, loops — no judge", x: COL, y: 0 },
      {
        id: "l2", kind: "prompt", label: "Tool & MCP selection",
        note: "L2 · right tools, args & MCP server", prompt: "tool_selection_quality", x: COL * 2, y: 0,
      },
      {
        id: "l3", kind: "prompt", label: "Trajectory",
        note: "L3 · goal progress", prompt: "trajectory_quality", x: COL * 3, y: 0,
      },
      {
        id: "l4", kind: "prompt", label: "Coordination",
        note: "L4 · multi-agent joins", prompt: "agent_coordination", x: COL * 4, y: 0,
      },
      { id: "panel", kind: "decision", label: "Jury", note: "deep only · re-score", x: COL * 5, y: 0 },
      { id: "score", kind: "score", label: "Run score", note: "blended & gated", x: COL * 6, y: 0 },
    ],
    edges: [
      { from: "in", to: "l1" },
      { from: "l1", to: "l2" },
      { from: "l2", to: "l3" },
      { from: "l3", to: "l4" },
      { from: "l4", to: "panel" },
      { from: "panel", to: "score" },
    ],
  },
}

/** Judge-prompt names the agentic evaluator can edit, in pipeline order. */
export const AGENTIC_PROMPTS = metricPromptNames("agentic")

/** Judge-prompt names a metric uses, in pipeline order. */
export function metricPromptNames(metric: string): string[] {
  const flow = METRIC_FLOWS[metric]
  if (!flow) return []
  return flow.steps.filter((s) => s.prompt).map((s) => s.prompt as string)
}

/** True when the metric runs more than one judge call. */
export function isMultiStep(metric: string): boolean {
  return metricPromptNames(metric).length > 1
}

// ── Node rendering ───────────────────────────────────────────────────────────

interface StepNodeData extends Record<string, unknown> {
  label: string
  note?: string
  kind: StepKind
  active: boolean
}

type StepFlowNode = Node<StepNodeData, "step">

const KIND_STYLE: Record<StepKind, string> = {
  input:    "border-border/70 bg-muted/50 text-muted-foreground",
  decision: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  prompt:   "border-border/70 bg-background text-foreground",
  score:    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
}

function StepNodeCard({ data }: NodeProps<StepFlowNode>) {
  const { label, note, kind, active } = data
  return (
    <div
      className={cn(
        "w-[170px] rounded-md border px-2.5 py-2 text-center shadow-sm transition-colors",
        KIND_STYLE[kind],
        active && "border-primary bg-primary/10 text-primary ring-2 ring-primary/30",
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-muted-foreground/50" />
      <p className="truncate text-[11px] font-medium leading-tight">{label}</p>
      {note ? (
        <p className="mt-0.5 truncate text-[9px] leading-tight opacity-70">{note}</p>
      ) : null}
      {kind === "prompt" ? (
        <p className="mt-1 truncate font-mono text-[9px] opacity-60">
          {active ? "editing" : "judge call"}
        </p>
      ) : null}
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-muted-foreground/50" />
    </div>
  )
}

const nodeTypes = { step: StepNodeCard }

/**
 * Read-only flow diagram of a metric's evaluation pipeline. The prompt being
 * edited is highlighted so it's obvious which stage you're changing.
 */
export function MetricFlowDiagram({
  metric,
  activePrompt,
}: {
  metric: string
  activePrompt?: string
}) {
  const flow = METRIC_FLOWS[metric]

  const nodes = useMemo<StepFlowNode[]>(() => {
    if (!flow) return []
    return flow.steps.map((s) => ({
      id: s.id,
      type: "step" as const,
      position: { x: s.x, y: s.y },
      data: {
        label: s.label,
        note: s.note,
        kind: s.kind,
        active: Boolean(s.prompt && s.prompt === activePrompt),
      },
    }))
  }, [flow, activePrompt])

  const edges = useMemo<Edge[]>(() => {
    if (!flow) return []
    return flow.edges.map((e) => ({
      id: `${e.from}-${e.to}`,
      source: e.from,
      target: e.to,
      label: e.label,
      animated: false,
      style: { strokeWidth: 1.5 },
      labelStyle: { fontSize: 10 },
    }))
  }, [flow])

  if (!flow) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
        No pipeline recorded for this metric.
      </div>
    )
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      zoomOnScroll={false}
      panOnScroll
      preventScrolling={false}
      className="bg-transparent"
    >
      <Background gap={16} size={1} className="opacity-40" />
    </ReactFlow>
  )
}
