import { Helmet } from "react-helmet-async"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  FileScriptIcon,
  PythonIcon,
  RocketIcon,
  SparklesIcon,
  WorkflowSquare01Icon,
} from "@hugeicons/core-free-icons"
import { Code, PageHeading } from "./_docComponents"

export default function PromptsPage() {
  return (
    <>
      <Helmet>
        <title>Prompt Management — Fluiq Docs</title>
        <meta name="description" content="Version, deploy, and iterate on prompt templates with an IDE-style editor. Variable injection, environment-based deployment, and side-by-side model comparison." />
        <link rel="canonical" href="https://getfluiq.com/documentation/prompts" />
        <meta property="og:url" content="https://getfluiq.com/documentation/prompts" />
        <meta property="og:title" content="Prompt Management — Fluiq Docs" />
        <meta property="og:description" content="Version, deploy, and iterate on prompt templates with an IDE-style editor. Variable injection, environment-based deployment, and side-by-side model comparison." />
      </Helmet>
    <div className="space-y-4">
      <PageHeading
        icon={FileScriptIcon}
        title="Prompts"
        description="The Prompts dashboard turns every LLM trace into a managed prompt template. Discover prompts from production traffic, edit them with {{variable}} substitution, run LLM-as-judge evaluations in the playground, then promote them to named environments so your SDK can fetch the right version at runtime — with no redeploy required."
      />

      <div className="flex items-center gap-2 pt-2">
        <HugeiconsIcon icon={SparklesIcon} size={16} />
        <p className="font-medium">Dashboard workflow</p>
      </div>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li><span className="text-foreground">Discover</span> — the Prompts page surfaces every LLM call from your traces as a row. Click any row to open it in the evaluation playground alongside its full trace tree.</li>
        <li><span className="text-foreground">Edit</span> — refine the template in the editor. Add <code className="font-mono text-foreground">{"{{variable}}"}</code> placeholders; the UI detects them and renders input fields for test values.</li>
        <li><span className="text-foreground">Evaluate</span> — run LLM-as-judge metrics (hallucination, faithfulness, relevance …) on the template + response pair. Results appear inline as scored cards.</li>
        <li><span className="text-foreground">Save</span> — give the prompt a name and a unique slug. Every subsequent edit creates a version snapshot so you can restore any previous state.</li>
        <li><span className="text-foreground">Promote</span> — deploy to <span className="font-medium text-blue-500">development</span>, <span className="font-medium text-amber-500">staging</span>, and <span className="font-medium text-emerald-500">production</span> independently. Each environment stores a full snapshot of the template at promote time, so rolling back is one click.</li>
      </ol>

      <div className="flex items-center gap-2 pt-2">
        <HugeiconsIcon icon={WorkflowSquare01Icon} size={16} />
        <p className="font-medium">Template variables</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Wrap any dynamic value in double curly braces. Variable names must start with a letter or underscore and contain only alphanumeric characters and underscores.
      </p>
      <Code>{`# Prompt template stored in the dashboard:
You are a helpful assistant for {{company}}.
Answer the following question in {{language}}: {{question}}`}</Code>
      <p className="text-sm text-muted-foreground">
        The playground detects variables automatically and renders a labeled input for each one so you can test substitutions before promoting.
      </p>

      <div className="flex items-center gap-2 pt-4">
        <HugeiconsIcon icon={RocketIcon} size={16} />
        <p className="font-medium">Environment-based deployment</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Each named environment stores an independent snapshot — promoting to <code className="font-mono text-foreground">staging</code> never touches <code className="font-mono text-foreground">production</code>. The typical promotion flow:
      </p>
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Environment</th>
              <th className="px-4 py-2 font-medium">Badge</th>
              <th className="px-4 py-2 font-medium">Intended use</th>
              <th className="px-4 py-2 font-medium">SDK call</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            <tr>
              <td className="px-4 py-2 font-medium text-blue-600 dark:text-blue-400">development</td>
              <td className="px-4 py-2"><span className="rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] text-blue-600 dark:text-blue-400">dev</span></td>
              <td className="px-4 py-2 text-muted-foreground">Local iteration and unit tests</td>
              <td className="px-4 py-2 font-mono text-muted-foreground text-xs">fetch_prompt(slug, env="development")</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium text-amber-600 dark:text-amber-400">staging</td>
              <td className="px-4 py-2"><span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-600 dark:text-amber-400">stg</span></td>
              <td className="px-4 py-2 text-muted-foreground">Integration and regression testing</td>
              <td className="px-4 py-2 font-mono text-muted-foreground text-xs">fetch_prompt(slug, env="staging")</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium text-emerald-600 dark:text-emerald-400">production</td>
              <td className="px-4 py-2"><span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">prod</span></td>
              <td className="px-4 py-2 text-muted-foreground">Live traffic — the default</td>
              <td className="px-4 py-2 font-mono text-muted-foreground text-xs">fetch_prompt(slug)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 pt-4">
        <HugeiconsIcon icon={PythonIcon} size={16} />
        <p className="font-medium">SDK fetch</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Call <code className="font-mono text-foreground">fluiq.fetch_prompt()</code> anywhere in your application to retrieve the deployed template for an environment. The call is authenticated with your API key and returns the snapshot that was promoted — not the current editor draft.
      </p>
      <Code>{`import fluiq

fluiq.instrument(api_key="fl_...")

# Fetch the production snapshot (default):
prompt = fluiq.fetch_prompt("customer-support-reply")

# Fetch a specific environment:
prompt = fluiq.fetch_prompt("customer-support-reply", env="staging")

# Fill template variables and call your LLM:
filled = prompt.render(
    company="Acme Corp",
    language="French",
    question=user_input,
)
response = client.chat.completions.create(
    model=prompt.model or "gpt-4o",
    messages=[{"role": "user", "content": filled}],
)`}</Code>

      <p className="text-sm text-muted-foreground">The returned object exposes:</p>
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Attribute</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {[
              ["slug",        "str",        "Unique identifier used to fetch the prompt"],
              ["name",        "str",        "Human-readable display name"],
              ["template",    "str",        "Raw template string with {{variable}} placeholders"],
              ["model",       "str | None", "Suggested model saved with the prompt, if any"],
              ["variables",   "list[str]",  "Detected variable names in the template"],
              ["version",     "int",        "Version number of this environment's snapshot"],
              ["environment", "str",        "Environment this snapshot was fetched from"],
              ["deployed_at", "str",        "ISO timestamp of when this version was promoted"],
            ].map(([attr, type, desc]) => (
              <tr key={attr}>
                <td className="px-4 py-2 font-mono text-foreground">{attr}</td>
                <td className="px-4 py-2 font-mono text-muted-foreground text-xs">{type}</td>
                <td className="px-4 py-2 text-muted-foreground">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 pt-4">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
        <p className="font-medium">Version history</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Every time you save an edited template, the previous version is automatically snapshotted. Open the <span className="font-medium text-foreground">History</span> panel on any saved prompt to browse past versions — each shows its version number, the template preview, the model, and when it was saved. Click <span className="font-medium text-foreground">Restore</span> to roll back; the current state is snapshotted first so no work is ever lost.
      </p>
      <p className="text-sm text-muted-foreground">
        Environments pin to their snapshot independently — restoring v3 to the head does not change what <code className="font-mono text-foreground">production</code> is serving until you explicitly re-promote.
      </p>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
        <p className="font-medium">Decoupled from your deploy pipeline</p>
        <p className="mt-1 text-muted-foreground">
          Because <code className="font-mono text-foreground">fluiq.fetch_prompt()</code> fetches at runtime, you can update a production prompt — fix a hallucination-prone instruction, add a guardrail, tweak tone — in the dashboard without touching your codebase or triggering a new deployment. The change is live the next time your SDK calls <code className="font-mono text-foreground">fetch_prompt()</code>.
        </p>
      </div>
    </div>
    </>
  )
}
