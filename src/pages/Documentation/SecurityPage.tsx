import { Helmet } from "react-helmet-async"
import { HugeiconsIcon } from "@hugeicons/react"
import { SecurityCheckIcon } from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { Code, PageHeading } from "./_docComponents"
import { useDocLang, byLang } from "./LanguageContext"

export default function SecurityPage() {
  const { lang } = useDocLang()
  return (
    <>
      <Helmet>
        <title>Security — Fluiq Docs</title>
        <meta name="description" content="Block prompt injection, jailbreaks, and PII leakage before they reach your model. fluiq.secure() adds pre-call and post-call scanning with zero false positives." />
        <meta name="keywords" content="LLM security, prompt injection detection, jailbreak detection, PII redaction, LLM guardrails, secret redaction" />
        <link rel="canonical" href="https://getfluiq.com/documentation/security" />
        <meta property="og:url" content="https://getfluiq.com/documentation/security" />
        <meta property="og:title" content="Security — Fluiq Docs" />
        <meta property="og:description" content="Block prompt injection, jailbreaks, and PII leakage before they reach your model. fluiq.secure() adds pre-call and post-call scanning with zero false positives." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          "headline": "Security — Fluiq Docs",
          "description": "Block prompt injection, jailbreaks, and PII leakage before they reach your model. fluiq.secure() adds pre-call and post-call scanning with zero false positives.",
          "url": "https://getfluiq.com/documentation/security",
          "isPartOf": { "@id": "https://getfluiq.com" },
        })}</script>
      </Helmet>
    <div className="space-y-4">
      <PageHeading
        icon={SecurityCheckIcon}
        title="Security"
        description="Call fluiq.secure() after instrument() to activate server-side security scanning. Every traced prompt and response is scanned for PII, prompt injection, and leaked secrets on Fluiq infrastructure. High-risk content is automatically redacted before persistence — the raw sensitive text is never written to the database."
      />

      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
        <p className="font-medium">Transport &amp; data handling</p>
        <p className="mt-1 text-muted-foreground">
          All data is transmitted over TLS 1.2+. The SDK enforces HTTPS and will reject non-HTTPS endpoint overrides. Prompts are transmitted to Fluiq servers where scanning and redaction occur — raw prompts transit the network before redaction. This is expected behavior; the security guarantee is that sensitive content is never written to the database in cleartext.
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <p className="font-semibold text-amber-700 dark:text-amber-400">Growth plan and above</p>
        <p className="mt-1 text-muted-foreground">
          <code className="font-mono text-foreground">fluiq.secure()</code> requires a Growth or Enterprise plan. Calling it on a Free or Team account logs a warning and skips scanning — tracing continues normally, your application is never interrupted.
        </p>
      </div>

      <p className="font-medium">Setup</p>
      <Code>{byLang(
        lang,
        `import fluiq

fluiq.instrument(api_key="fl_...")
fluiq.secure()

# All LLM calls are now traced and scanned server-side.
# Use mode="block" to reject malicious prompts before the LLM call:
fluiq.secure(mode="block")`,
        `import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });
fluiq.secure();

// All LLM calls are now traced and scanned server-side.
// Use mode "block" to reject malicious prompts before the LLM call:
fluiq.secure({ mode: "block" });`,
      )}</Code>
      <p className="text-sm text-muted-foreground">
        No extra packages — scanning runs on Fluiq infrastructure, not in your process. Detection patterns are never shipped in the SDK and are improved continuously without requiring an update.
      </p>

      <p className="font-medium">What's scanned</p>
      <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li>
          <span className="text-foreground">PII scanner</span> — running server-side. Detects credit cards, SSNs, IBAN codes, email addresses, phone numbers, IP addresses, names, and popular API key formats. No client dependencies required.
        </li>
        <li>
          <span className="text-foreground">Prompt-injection scanner</span> — detects known jailbreak and instruction-override phrases. Patterns are maintained server-side and updated without SDK releases.
        </li>
        <li>
          <span className="text-foreground">Secret scanner</span> — matches hardcoded credential patterns for OpenAI, Anthropic, AWS, GitHub, and Stripe keys, and flags high-entropy tokens resembling bearer tokens or passwords.
        </li>
      </ul>

      <p className="font-medium">Modes</p>
      <div className="grid gap-3 text-sm">
        {[
          {
            name: `"warn"`,
            badge: "default",
            body: "Post-call scan only. Security fields are written into the stored trace; HIGH-risk content is redacted before persistence. Your LLM calls are never interrupted. Prompts are transmitted to Fluiq servers unredacted — scanning and redaction happen server-side before any persistence.",
          },
          {
            name: `"block"`,
            badge: "optional",
            body: 'Pre-call guard enabled. Every prompt is checked before the LLM API call. If the check returns allow=false, a FluiqSecurityError is raised and the call is never made.',
          },
        ].map((m) => (
          <div key={m.name} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
            <HugeiconsIcon icon={SecurityCheckIcon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
            <div>
              <p className="font-mono text-sm text-foreground">
                {m.name}
                <Badge variant={m.badge === "default" ? "muted" : "outline"} className="ml-2">{m.badge}</Badge>
              </p>
              <p className="mt-1 text-muted-foreground">{m.body}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="font-medium">Risk levels</p>
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Level</th>
              <th className="px-4 py-2 font-medium">Score</th>
              <th className="px-4 py-2 font-medium">Meaning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-sm">
            <tr>
              <td className="px-4 py-2 font-medium text-emerald-600 dark:text-emerald-400">clean</td>
              <td className="px-4 py-2 font-mono text-muted-foreground">{`< 0.3`}</td>
              <td className="px-4 py-2 text-muted-foreground">No significant findings</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium text-blue-600 dark:text-blue-400">low</td>
              <td className="px-4 py-2 font-mono text-muted-foreground">0.3 – 0.49</td>
              <td className="px-4 py-2 text-muted-foreground">Weak signal; review recommended</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium text-amber-600 dark:text-amber-400">medium</td>
              <td className="px-4 py-2 font-mono text-muted-foreground">0.5 – 0.89</td>
              <td className="px-4 py-2 text-muted-foreground">Likely PII, injection attempt, or suspicious string detected</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium text-destructive">high</td>
              <td className="px-4 py-2 font-mono text-muted-foreground">{`≥ 0.9`}</td>
              <td className="px-4 py-2 text-muted-foreground">Sensitive data confirmed; prompt and response are auto-redacted before storage</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
        <p className="font-medium">Fail-open by design</p>
        <p className="mt-1 text-muted-foreground">
          If the Fluiq security endpoint is unreachable, LLM calls proceed normally. This is intentional — Fluiq never becomes a single point of failure for your application. Use <code className="font-mono text-foreground">mode="block"</code> only in flows where you prefer to fail closed; in warn mode a backend outage is silent and your users are never affected.
        </p>
      </div>

      <p className="font-medium">Audit Logs</p>
      <p className="text-sm text-muted-foreground">
        Every action taken by a user or API key through Fluiq — SDK configuration calls, key creation, policy changes — is written to an append-only audit log backed by ClickHouse. Each row is signed with HMAC-SHA256 so tampering can be detected downstream.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li>
          <span className="text-foreground">10-year retention</span> — rows are never updated or deleted. Meets requirements under the EU AI Act, China AIGC regulations, and the Colorado AI Act.
        </li>
        <li>
          <span className="text-foreground">Event types logged</span> — <code className="font-mono text-foreground">api_key.created</code>, <code className="font-mono text-foreground">api_key.deleted</code>, <code className="font-mono text-foreground">guardrail.updated</code>, <code className="font-mono text-foreground">eval.configured</code>, <code className="font-mono text-foreground">secure.configured</code>, <code className="font-mono text-foreground">optimize.configured</code>, <code className="font-mono text-foreground">user.invited</code>, <code className="font-mono text-foreground">user.removed</code>, and more.
        </li>
        <li>
          <span className="text-foreground">Dashboard access</span> — browse, filter, and export as CSV at <code className="font-mono text-foreground">/dashboard/audit</code>. The <code className="font-mono text-foreground">row_hash</code> field is shown per event for compliance hand-off.
        </li>
        <li>
          <span className="text-foreground">API access</span> — <code className="font-mono text-foreground">GET /api/v1/audit</code> accepts <code className="font-mono text-foreground">event_type</code>, <code className="font-mono text-foreground">actor</code>, <code className="font-mono text-foreground">limit</code> (max 500), and <code className="font-mono text-foreground">offset</code> query parameters. No SDK change needed — the log is maintained automatically.
        </li>
      </ul>

      <p className="font-medium">Guardrail Policies</p>
      <p className="text-sm text-muted-foreground">
        Fine-tune exactly what <code className="font-mono text-foreground">fluiq.secure()</code> blocks for your organisation without changing SDK code. Policies are stored per-org in Postgres and cached in-process for 60 seconds — configuration changes propagate to all new calls within one minute.
      </p>
      <div className="grid gap-3 text-sm">
        {[
          {
            name: "Block threshold",
            body: 'Set to "high" (default) to block only confirmed high-risk requests, or "medium" to also block medium-risk findings. Warn threshold is configured independently — requests above it are flagged in traces even when not blocked.',
          },
          {
            name: "Block categories",
            body: "Restrict which attack types trigger a block. When empty (default), any detected category blocks. Configure a subset — e.g. only prompt_injection and jailbreak — to warn on PII or secrets without blocking them.",
          },
          {
            name: "Custom deny / allow lists",
            body: "Phrase-level overrides checked before any scanner runs. Prompts matching a deny phrase are always blocked; prompts matching an allow phrase skip all scans and proceed immediately.",
          },
          {
            name: "Webhook alerts",
            body: "POST a structured JSON payload to any HTTPS endpoint (Slack, Teams, PagerDuty, or custom) whenever a block or warn event fires. Retried up to 3 times with exponential backoff. Configure alert_on risk levels to tune alert volume.",
          },
        ].map((item) => (
          <div key={item.name} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
            <HugeiconsIcon icon={SecurityCheckIcon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
            <div>
              <p className="text-sm font-medium text-foreground">{item.name}</p>
              <p className="mt-1 text-muted-foreground">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Configure via the dashboard at <code className="font-mono text-foreground">/dashboard/guardrails</code> or programmatically with <code className="font-mono text-foreground">PUT /api/v1/guardrails</code>.
      </p>
    </div>
    </>
  )
}
