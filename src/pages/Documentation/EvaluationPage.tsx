import { Helmet } from "react-helmet-async"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, WorkflowSquare01Icon } from "@hugeicons/core-free-icons"
import { Code, PageHeading } from "./_docComponents"

export default function EvaluationPage() {
  return (
    <>
      <Helmet>
        <title>Evaluation — Fluiq Docs</title>
        <meta name="description" content="Score every LLM response for hallucination, faithfulness, relevance, and toxicity using LLM-as-judge. Warn or block based on configurable per-metric thresholds." />
        <meta name="keywords" content="LLM evaluation, LLM-as-judge, hallucination detection, faithfulness scoring, relevance scoring, toxicity detection, eval gates" />
        <link rel="canonical" href="https://getfluiq.com/documentation/evaluation" />
        <meta property="og:url" content="https://getfluiq.com/documentation/evaluation" />
        <meta property="og:title" content="Evaluation — Fluiq Docs" />
        <meta property="og:description" content="Score every LLM response for hallucination, faithfulness, relevance, and toxicity using LLM-as-judge. Warn or block based on configurable per-metric thresholds." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          "headline": "Evaluation — Fluiq Docs",
          "description": "Score every LLM response for hallucination, faithfulness, relevance, and toxicity using LLM-as-judge. Warn or block based on configurable per-metric thresholds.",
          "url": "https://getfluiq.com/documentation/evaluation",
          "isPartOf": { "@id": "https://getfluiq.com" },
        })}</script>
      </Helmet>
    <div className="space-y-4">
      <PageHeading
        icon={CheckmarkCircle02Icon}
        title="Evaluation"
        description="Add one line to score every LLM response with Fluiq's server-side judge. Set per-metric thresholds and choose whether failures log a warning or block the call from reaching your application."
      />

      <Code>{`import fluiq

fluiq.instrument(api_key="fl_...")
fluiq.eval(
    thresholds={
        "hallucination": 0.8,   # score 0–1; 1 = no hallucination
        "faithfulness":  0.7,   # grounded in provided context
        "relevance":     0.75,  # response addresses the question
        "toxicity":      0.9,   # 1 = completely safe
    },
    mode="warn",                # "warn" | "block"
    judge_model="gpt-4o-mini",  # judge model Fluiq uses server-side
)`}</Code>

      <p className="font-medium">Supported metrics</p>
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Metric</th>
              <th className="px-4 py-2 font-medium">What it measures</th>
              <th className="px-4 py-2 font-medium">Score 1.0 means</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {[
              ["hallucination", "Factual claims not supported by the prompt/context", "No hallucination — every claim is grounded"],
              ["faithfulness",  "Whether the response stays within the provided context", "Fully grounded — no outside claims added"],
              ["relevance",     "How directly the response addresses the question", "Completely on-topic and direct"],
              ["toxicity",      "Harmful, offensive, or hateful content in the response", "Completely safe and respectful"],
              ["coherence",     "Logical structure and internal consistency", "Perfectly coherent and well-structured"],
              ["completeness",  "Whether the response fully answers the question", "Comprehensive — no key information omitted"],
            ].map(([metric, desc, best]) => (
              <tr key={metric}>
                <td className="px-4 py-2 font-mono text-foreground">{metric}</td>
                <td className="px-4 py-2 text-muted-foreground">{desc}</td>
                <td className="px-4 py-2 text-muted-foreground">{best}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-medium">Modes</p>
      <div className="grid gap-3 text-sm">
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
          <div>
            <p className="font-mono text-sm text-foreground">mode="warn" <span className="font-sans text-muted-foreground font-normal">(default)</span></p>
            <p className="mt-1 text-muted-foreground">
              Evaluation runs in a background thread after the LLM responds. Your application receives the response immediately. A Python warning is logged for every metric that falls below its threshold — visible in your logs and in the Fluiq dashboard's Quality column.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
          <div>
            <p className="font-mono text-sm text-foreground">mode="block"</p>
            <p className="mt-1 text-muted-foreground">
              Evaluation runs synchronously before returning the response. If any metric is below its threshold, a <code className="font-mono text-foreground">FluiqEvalError</code> is raised instead — the low-quality response never reaches your application. Use in staging or for safety-critical flows.
            </p>
          </div>
        </div>
      </div>

      <Code>{`from fluiq.exceptions import FluiqEvalError

try:
    response = client.chat.completions.create(...)
except FluiqEvalError as e:
    print(e.failures)   # {"hallucination": 0.42, "relevance": 0.61}
    print(e.scores)     # all metric scores
    # fallback logic here`}</Code>

      <div className="flex items-center gap-2 pt-4">
        <HugeiconsIcon icon={WorkflowSquare01Icon} size={16} />
        <p className="font-medium">GitHub Actions eval gate</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Gate every PR on quality scores stored during your test suite. The workflow below runs your tests (which generate traces evaluated by Fluiq), waits briefly for async evals to land, then queries the Fluiq API and fails the build if any score is below the threshold.
      </p>
      <Code>{`# .github/workflows/fluiq-eval-gate.yml
name: Fluiq Eval Gate

on:
  pull_request:
    branches: [main]

jobs:
  eval-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: pip install -r requirements.txt fluiq

      - name: Run test suite
        env:
          FLUIQ_API_KEY: \${{ secrets.FLUIQ_API_KEY }}
        run: pytest tests/ -x

      - name: Wait for evaluations
        run: sleep 30

      - name: Check evaluation scores
        env:
          FLUIQ_API_KEY: \${{ secrets.FLUIQ_API_KEY }}
          THRESHOLD: \${{ vars.FLUIQ_EVAL_THRESHOLD || '0.7' }}
        run: |
          python - <<'PYEOF'
          import httpx, os, sys
          api_key   = os.environ["FLUIQ_API_KEY"]
          threshold = float(os.environ.get("THRESHOLD", "0.7"))
          resp = httpx.get(
              "https://api.getfluiq.com/api/v1/optimize/evals",
              headers={"x-api-key": api_key},
              params={"window_minutes": 10, "threshold": threshold},
              timeout=15,
          )
          resp.raise_for_status()
          data = resp.json()
          if data["total"] == 0:
              print("No evaluations found — skipping gate.")
              sys.exit(0)
          avg = data.get("avg_score")
          print(f"Evals: {data['total']} total, {data['passed']} passed, {data['failed']} failed  (avg {f'{avg:.2f}' if avg else 'n/a'})")
          if data["failed"] > 0:
              for e in data["entries"]:
                  if e["score"] is not None and e["score"] < threshold:
                      print(f"  FAIL  {e['metric']}: {e['score']:.2f}  trace={e['trace_id']}")
              sys.exit(1)
          print(f"All scores above threshold ({threshold}).")
          PYEOF`}</Code>

      <p className="font-medium">Quotas</p>
      <p className="text-sm text-muted-foreground">
        Each LLM response evaluation consumes one count from your tier's eval budget. Traces continue to ingest normally once the cap is hit — only the auto-eval is skipped.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Tier</th>
              <th className="px-4 py-2 font-medium">Traces</th>
              <th className="px-4 py-2 font-medium">Evaluations / month</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {[
              ["Free",       "5M total",   "1,000"],
              ["Team",       "Unlimited",  "10,000"],
              ["Growth",     "Unlimited",  "100,000"],
              ["Enterprise", "Unlimited",  "Unlimited"],
            ].map(([tier, traces, evals]) => (
              <tr key={tier}>
                <td className="px-4 py-2 font-medium">{tier}</td>
                <td className="px-4 py-2 text-muted-foreground">{traces}</td>
                <td className="px-4 py-2 text-muted-foreground">{evals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  )
}
