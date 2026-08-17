"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, WorkflowSquare01Icon } from "@hugeicons/core-free-icons"
import { Code, PageHeading } from "./_docComponents"
import { useDocLang, byLang } from "./LanguageContext"

export default function EvaluationPage() {
  const { lang } = useDocLang()
  const isTs = lang === "typescript"
  return (
    <>
<div className="space-y-4">
      <PageHeading
        icon={CheckmarkCircle02Icon}
        title="Evaluation"
        description="Add one line to score every LLM response with Fluiq's server-side judge. Set per-metric thresholds and choose whether failures log a warning or block the call from reaching your application."
      />

      <Code>{byLang(
        lang,
        `import fluiq

fluiq.instrument(api_key="fl_...")
fluiq.eval(
    thresholds={
        "hallucination": 0.8,   # score 0-1; 1 = no hallucination
        "faithfulness":  0.7,   # grounded in provided context
        "relevance":     0.75,  # response addresses the question
        "toxicity":      0.9,   # 1 = completely safe
    },
    mode="warn",                # "warn" | "block"
    judge_model="gpt-4o-mini",  # judge model Fluiq uses server-side
)`,
        `import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });
fluiq.eval({
  thresholds: {
    hallucination: 0.8,  // score 0-1; 1 = no hallucination
    faithfulness: 0.7,   // grounded in provided context
    relevance: 0.75,     // response addresses the question
    toxicity: 0.9,       // 1 = completely safe
  },
  mode: "warn",                            // "warn" | "block"
  judgeModel: "claude-haiku-4-5-20251001", // judge model Fluiq uses server-side
});`,
      )}</Code>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
        <p className="font-medium">Evaluation is opt-in</p>
        <p className="mt-1 text-muted-foreground">
          <code className="font-mono text-foreground">instrument()</code> only traces;
          it never evaluates on its own. Scoring runs only once you call{" "}
          <code className="font-mono text-foreground">{isTs ? "fluiq.eval({ … })" : "fluiq.eval(…)"}</code>{" "}
          (or trigger an evaluation from the dashboard). From that point every LLM response
          in the process is scored against your thresholds; remove the call and Fluiq goes
          back to tracing only. Evaluation runs asynchronously server-side and never adds
          latency to your app.
        </p>
      </div>

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
              ["hallucination", "Factual claims not supported by the prompt/context", "No hallucination; every claim is grounded"],
              ["faithfulness",  "Whether the response stays within the provided context", "Fully grounded; no outside claims added"],
              ["relevance",     "How directly the response addresses the question", "Completely on-topic and direct"],
              ["toxicity",      "Harmful, offensive, or hateful content in the response", "Completely safe and respectful"],
              ["coherence",     "Logical structure and internal consistency", "Perfectly coherent and well-structured"],
              ["completeness",  "Whether the response fully answers the question", "Comprehensive; no key information omitted"],
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

      <p className="font-medium">Custom judges</p>
      <p className="text-sm text-muted-foreground">
        Built-in metrics not enough? Write your own LLM-as-judge. In the dashboard go to{" "}
        <span className="font-medium text-foreground">Prompts</span>, write your judge prompt, and{" "}
        <span className="font-medium text-foreground">Save</span> it with type{" "}
        <span className="font-mono text-foreground">Judge</span>. The template uses{" "}
        <code className="font-mono text-foreground">{"{{question}}"}</code>,{" "}
        <code className="font-mono text-foreground">{"{{answer}}"}</code> and{" "}
        <code className="font-mono text-foreground">{"{{context}}"}</code> placeholders and should ask the
        model to return a JSON object with a numeric <code className="font-mono text-foreground">score</code>{" "}
        (0 to 1) and a <code className="font-mono text-foreground">reason</code>. Then reference it by its
        slug in {isTs ? <code className="font-mono text-foreground">customJudges</code> : <code className="font-mono text-foreground">custom_judges</code>}{" "}
        (slug → threshold). Each judge is scored on every response just like a built-in metric and
        appears in the dashboard under its slug.
      </p>

      <Code>{byLang(
        lang,
        `# Saved in Prompts (type: Judge), slug "refund-policy":
#
#   You are auditing a support reply for refund-policy compliance.
#   QUESTION: {{question}}
#   ANSWER:   {{answer}}
#   POLICY:   {{context}}
#   Return JSON: {"score": <0-1>, "reason": "<why>"}

fluiq.eval(
    metrics=["hallucination"],          # built-ins still run
    thresholds={"hallucination": 0.8},
    custom_judges={
        "refund-policy":  0.9,          # slug → pass threshold
        "brand-tone":     0.7,
    },
    mode="warn",
)`,
        `// Saved in Prompts (type: Judge), slug "refund-policy":
//
//   You are auditing a support reply for refund-policy compliance.
//   QUESTION: {{question}}
//   ANSWER:   {{answer}}
//   POLICY:   {{context}}
//   Return JSON: {"score": <0-1>, "reason": "<why>"}

fluiq.eval({
  metrics: ["hallucination"],          // built-ins still run
  thresholds: { hallucination: 0.8 },
  customJudges: {
    "refund-policy": 0.9,              // slug → pass threshold
    "brand-tone": 0.7,
  },
  mode: "warn",
});`,
      )}</Code>
      <p className="text-sm text-muted-foreground">
        In <code className="font-mono text-foreground">block</code> mode a custom judge scoring below
        its threshold {isTs ? "throws" : "raises"} <code className="font-mono text-foreground">FluiqEvalError</code>{" "}
        just like a built-in metric. If a slug doesn&apos;t resolve to a saved Judge prompt it is
        silently skipped; your call is never broken by a missing judge.
      </p>

      <p className="font-medium">Transparent, editable judge prompts</p>
      <p className="text-sm text-muted-foreground">
        No black-box scoring: every score records the <span className="font-medium text-foreground">exact judge
        prompt</span> (and its version) that produced it — expand{" "}
        <span className="font-medium text-foreground">Judge prompts</span> under any evaluation in the trace
        drawer to read it. If a grading rubric doesn&apos;t match how you want a metric judged, edit it at{" "}
        <span className="font-medium text-foreground">Dashboard → Judge Prompts</span>: your edit applies only
        to your organization within about a minute, required placeholders are validated so a save can&apos;t
        break scoring, and you can reset to the platform prompt or restore any earlier version. Because scores
        carry the prompt version, you can tell exactly when a rubric change happened in your score history.
      </p>

      <p className="font-medium">User feedback &amp; team annotations</p>
      <p className="text-sm text-muted-foreground">
        Judges aren&apos;t the only signal. Record your <span className="font-medium text-foreground">end
        users&apos;</span> reactions with {isTs
          ? <>a call to <code className="font-mono text-foreground">POST /api/v1/feedback</code></>
          : <code className="font-mono text-foreground">fluiq.feedback()</code>}{" "}
        right after the LLM call the user is reacting to — the verdict lands next to the automated scores on
        that trace. Your team can also add a thumbs-up/down with a note on any trace from the drawer&apos;s
        Evaluation tab. Human signals are shown alongside judge scores but never move the automated quality
        rollups.
      </p>
      <Code>{byLang(
        lang,
        `import fluiq

fluiq.instrument(api_key="fl_...")

answer = client.chat.completions.create(...)   # traced call
show_to_user(answer)

# later, when the user reacts:
fluiq.feedback(True, name="thumbs")                     # 👍 on the last LLM call
fluiq.feedback(0.25, name="csat", comment="Too slow",   # or a 0-1 rating
               trace_id=saved_trace_id)                 # target a specific trace`,
        `// TS SDK helper is coming; use the REST endpoint directly for now:
await fetch("https://api.getfluiq.com/api/v1/feedback", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: \`Bearer \${process.env.FLUIQ_API_KEY}\`,
  },
  body: JSON.stringify({
    trace_id: savedTraceId,     // the traced call the user is reacting to
    name: "thumbs",             // channel shown in the dashboard
    value: true,                // true/false or a 0-1 rating
    comment: "Great answer",
  }),
});`,
      )}</Code>

      <p className="font-medium">Modes</p>
      <div className="grid gap-3 text-sm">
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
          <div>
            <p className="font-mono text-sm text-foreground">mode="warn" <span className="font-sans text-muted-foreground font-normal">(default)</span></p>
            <p className="mt-1 text-muted-foreground">
              Evaluation runs {isTs ? "in the background" : "in a background thread"} after the LLM responds. Your application receives the response immediately. A warning is logged for every metric that falls below its threshold, visible in your logs and in the Fluiq dashboard's Quality column.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
          <div>
            <p className="font-mono text-sm text-foreground">mode="block"</p>
            <p className="mt-1 text-muted-foreground">
              Evaluation runs synchronously before returning the response. If any metric is below its threshold, a <code className="font-mono text-foreground">FluiqEvalError</code> is {isTs ? "thrown" : "raised"} instead; the low-quality response never reaches your application. Use in staging or for safety-critical flows.
            </p>
          </div>
        </div>
      </div>

      <Code>{byLang(
        lang,
        `from fluiq.exceptions import FluiqEvalError

try:
    response = client.chat.completions.create(...)
except FluiqEvalError as e:
    print(e.failures)   # {"hallucination": 0.42, "relevance": 0.61}
    print(e.scores)     # all metric scores
    # fallback logic here`,
        `import { FluiqEvalError } from "@fluiq/sdk";

try {
  const response = await client.chat.completions.create(/* ... */);
} catch (e) {
  if (e instanceof FluiqEvalError) {
    console.log(e.failures); // { hallucination: 0.42, relevance: 0.61 }
    console.log(e.scores);   // all metric scores
    // fallback logic here
  } else {
    throw e;
  }
}`,
      )}</Code>

      <div className="flex items-center gap-2 pt-4">
        <HugeiconsIcon icon={WorkflowSquare01Icon} size={16} />
        <p className="font-medium">GitHub Actions eval gate</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Gate every PR on a real eval run. <code className="font-mono text-foreground">python -m fluiq.ci</code>{" "}
        launches a batch evaluation over one of your{" "}
        <span className="font-medium text-foreground">datasets</span> (grading each example against its
        expected output — or a full agentic run), waits for the report, prints per-metric averages, and exits
        non-zero when the average score is below your gate, failing the build with an annotated error. It works
        in any repo — the gate runs against your Fluiq dataset, not your test suite&apos;s language.
      </p>
      <Code>{`# .github/workflows/fluiq-eval-gate.yml
name: Fluiq Eval Gate

on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write   # only needed for --pr-comment

jobs:
  eval-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install Fluiq
        run: pip install fluiq

      - name: Run eval gate
        env:
          FLUIQ_API_KEY: \${{ secrets.FLUIQ_API_KEY }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          python -m fluiq.ci \\
            --dataset "checkout-regressions" \\
            --kind metrics \\
            --metrics hallucination,relevance,completeness \\
            --fail-below 0.7 \\
            --min-example 0.5 \\
            --pr-comment`}</Code>
      <p className="text-sm text-muted-foreground">
        <code className="font-mono text-foreground">--kind agentic</code> runs the full layered agent
        evaluation (tool selection, trajectory, coordination) over each example&apos;s pinned trajectory
        instead. <code className="font-mono text-foreground">--min-example</code> additionally fails the build
        when any single example falls below that floor, so one bad regression can&apos;t hide behind a good
        average. Exit codes: <code className="font-mono text-foreground">0</code> pass,{" "}
        <code className="font-mono text-foreground">1</code> gate failed,{" "}
        <code className="font-mono text-foreground">2</code> error/timeout.
      </p>
      <p className="text-sm text-muted-foreground">
        <code className="font-mono text-foreground">--pr-comment</code> posts the result to the pull
        request itself — per-metric scores, the delta against the last run on the base branch, and the
        weakest examples — so the reviewer deciding whether to merge sees the numbers without opening a
        build log. The comment is <span className="font-medium text-foreground">updated in place</span> on
        every push rather than appended, and it&apos;s posted whether the gate passes or fails: a report
        that only appears on failure gets read as an alarm instead of as a result. Needs{" "}
        <code className="font-mono text-foreground">pull-requests: write</code>; if posting fails the gate
        still returns its real exit code.
      </p>
      <p className="text-sm text-muted-foreground">
        <code className="font-mono text-foreground">--trials N</code> runs each example N times and reports
        the average alongside its spread. Reach for it when a gate keeps flapping — it separates a genuine
        regression from a model that is simply noisy, at N× the cost. Trials are independent generations,
        not one output scored repeatedly, so what you measure is the variance of your app rather than of
        the judge.
      </p>

      <p className="font-medium">Quotas</p>
      <p className="text-sm text-muted-foreground">
        Tracing is always free and unlimited; the paid axis is trace <span className="font-medium text-foreground">retention</span> (Free keeps 14 days, paid keeps forever). Evaluation is metered separately: each scored LLM response consumes one count from your tier's eval budget. When the eval budget is exhausted, traces keep ingesting normally; only new scoring is paused until the next cycle.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Tier</th>
              <th className="px-4 py-2 font-medium">Traces</th>
              <th className="px-4 py-2 font-medium">Retention</th>
              <th className="px-4 py-2 font-medium">Evaluations / month</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {[
              ["Free",       "Unlimited",  "14 days",  "100"],
              ["Starter",    "Unlimited",  "Forever",  "2,000"],
              ["Team",       "Unlimited",  "Forever",  "10,000"],
              ["Growth",     "Unlimited",  "Forever",  "50,000"],
              ["Enterprise", "Unlimited",  "Forever",  "Unlimited"],
            ].map(([tier, traces, retention, evals]) => (
              <tr key={tier}>
                <td className="px-4 py-2 font-medium">{tier}</td>
                <td className="px-4 py-2 text-muted-foreground">{traces}</td>
                <td className="px-4 py-2 text-muted-foreground">{retention}</td>
                <td className="px-4 py-2 text-muted-foreground">{evals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground/70">
        Starter, Team, and Growth include a no-card 5-day trial so you can try unlimited retention and higher eval budgets before upgrading.
      </p>
    </div>
    </>
  )
}
