"use client"

import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Database01Icon,
  RoboticIcon,
  WorkflowSquare01Icon,
  CheckmarkCircle02Icon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons"
import { Code, PageHeading } from "./_docComponents"
import { useDocLang, byLang } from "./LanguageContext"

export default function DatasetsPage() {
  const { lang } = useDocLang()
  const isTs = lang === "typescript"
  return (
    <>
      <div className="space-y-4">
        <PageHeading
          icon={Database01Icon}
          title="Datasets"
          description="Curate golden datasets straight from your real traffic, then re-run evaluation and security over them as a regression suite. Trace-backed examples capture the whole agent run, not just an input/output pair, so full agentic evaluation works offline, forever."
        />

        <div className="flex items-center gap-2 pt-2">
          <HugeiconsIcon icon={Database01Icon} size={16} />
          <p className="font-medium">Build a dataset from traces</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Open any run in the{" "}
          <Link to="/dashboard/traces" className="font-medium text-foreground hover:underline">Traces</Link>{" "}
          drawer and click <span className="font-medium text-foreground">Add to Dataset</span>. On a{" "}
          <span className="font-medium text-foreground">root</span> span this captures the entire run; pick an
          existing dataset or create a new one inline. You can also add the currently open example from the{" "}
          <Link to="/dashboard/prompts" className="font-medium text-foreground hover:underline">Prompts</Link>{" "}
          playground.
        </p>

        <div className="flex items-center gap-2 pt-4">
          <HugeiconsIcon icon={WorkflowSquare01Icon} size={16} />
          <p className="font-medium">Trajectory capture</p>
        </div>
        <p className="text-sm text-muted-foreground">
          When you add a trace-backed example, Fluiq pins the run's <span className="font-medium text-foreground">whole trajectory</span> into a retention-independent store: every span, including LLM calls, agent/task steps, tool calls, MCP calls, the multi-agent DAG, and media references. Media is offloaded to object storage and re-linked on read. The pinned snapshot means a dataset run evaluates the exact trajectory even after the original trace has passed its retention window.
        </p>
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
          <p className="font-medium">Why the whole trajectory?</p>
          <p className="mt-1 text-muted-foreground">
            A single input/output pair can only be scored as one turn. Pinning the full run lets Fluiq re-run <span className="font-medium text-foreground">agentic</span> evaluation (tool-selection correctness, trajectory quality, and multi-agent coordination) and security, exactly as it would on a live trace. Expand any example in the{" "}
            <Link to="/dashboard/datasets" className="font-medium text-foreground hover:underline">Datasets</Link>{" "}
            dashboard to inspect the captured steps, agents, tools, and MCP calls.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-4">
          <HugeiconsIcon icon={RoboticIcon} size={16} />
          <p className="font-medium">Connect Agents</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Rather than adding runs one at a time, click <span className="font-medium text-foreground">Connect Agents</span> on a dataset and pick a traced agent. Fluiq imports every run of that agent to date (deduplicated, full trajectory pinned) and keeps the dataset in sync; future runs of a linked agent are appended automatically.
        </p>

        <div className="flex items-center gap-2 pt-4">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
          <p className="font-medium">Batch evaluation &amp; security</p>
        </div>
        <p className="text-sm text-muted-foreground">
          From a dataset you can launch three kinds of batch run over every example:{" "}
          <span className="font-medium text-foreground">agentic evaluation</span> (tool selection, trajectory, coordination against the pinned trajectory),{" "}
          <span className="font-medium text-foreground">security</span> (risk level and detections), and a{" "}
          <span className="font-medium text-foreground">metrics</span> run that grades each example's recorded answer against its{" "}
          <code className="font-mono text-foreground">expected_output</code> with the metrics you pick (hallucination, faithfulness, relevance, toxicity, coherence, completeness). Results roll up into a per-run report with per-metric averages and per-example scores.
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Compare runs.</span> Every report has a{" "}
          <span className="font-medium text-foreground">Compare vs…</span> selector: pick any earlier run of the same kind and Fluiq diffs them — per-metric score deltas (computed only over examples present in both runs) and every example classified as{" "}
          <span className="font-medium text-foreground">regressed</span>, improved, or unchanged. That's your regression gate before shipping a prompt or model change; the same check runs headless in CI via{" "}
          <code className="font-mono text-foreground">python -m fluiq.ci</code> (see{" "}
          <Link to="/documentation#evaluation" className="font-medium text-foreground hover:underline">Evaluation</Link>).
        </p>

        <div className="flex items-center gap-2 pt-4">
          <HugeiconsIcon icon={SecurityCheckIcon} size={16} />
          <p className="font-medium">Programmatic access</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Datasets are also reachable over the API: list datasets, add examples, and fetch an example's pinned trajectory.
        </p>
        <Code>{byLang(
          lang,
          `import os, requests

BASE = "https://api.fluiq.ai/api/v1"
H = {"Authorization": f"Bearer {os.environ['FLUIQ_API_KEY']}"}

# Create a dataset and add an example captured from a trace
ds = requests.post(f"{BASE}/datasets", headers=H,
                   json={"name": "checkout-regressions"}).json()

requests.post(f"{BASE}/datasets/{ds['dataset_id']}/examples", headers=H, json={
    "input": "Refund my last order",
    "expected_output": "Opened refund #4821",
    # link the run so Fluiq pins its full trajectory for agentic eval
    "metadata": {"source_trace_id": "0f9c...e21"},
})`,
          `const BASE = "https://api.fluiq.ai/api/v1";
const H = { Authorization: \`Bearer \${process.env.FLUIQ_API_KEY}\` };

// Create a dataset and add an example captured from a trace
const ds = await fetch(\`\${BASE}/datasets\`, {
  method: "POST", headers: H,
  body: JSON.stringify({ name: "checkout-regressions" }),
}).then((r) => r.json());

await fetch(\`\${BASE}/datasets/\${ds.dataset_id}/examples\`, {
  method: "POST", headers: H,
  body: JSON.stringify({
    input: "Refund my last order",
    expected_output: "Opened refund #4821",
    // link the run so Fluiq pins its full trajectory for agentic eval
    metadata: { source_trace_id: "0f9c...e21" },
  }),
});`,
        )}</Code>
        <p className="text-sm text-muted-foreground">
          Pass a <code className="font-mono text-foreground">source_trace_id</code> in an example's metadata (use the run's <span className="font-medium text-foreground">root</span> trace id) and Fluiq snapshots that run's whole trajectory into the dataset automatically.
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Per-example few-shot.</span> An example&apos;s
          metadata can carry a <code className="font-mono text-foreground">few_shot</code> list of{" "}
          <code className="font-mono text-foreground">{"{input, output}"}</code> pairs, which a task
          template reaches as <code className="font-mono text-foreground">{"{{few_shot}}"}</code> —
          rendered ready to drop into a prompt. It lives on the example rather than the template because
          the useful examples usually differ per row: the nearest neighbours to <em>this</em> question,
          not a fixed three pasted into every prompt. Rows without it render nothing at all, so one
          template serves both. Capped at ten per example.
        </p>
      </div>
    </>
  )
}
