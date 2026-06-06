import { Helmet } from "react-helmet-async"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, ZapIcon } from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { Code, PageHeading } from "./_docComponents"

export default function ConfigurationPage() {
  return (
    <>
      <Helmet>
        <title>Configuration — Fluiq Docs</title>
        <meta name="description" content="Full reference for Fluiq SDK configuration options — API keys, environment variables, log levels, timeout settings, and per-feature toggles." />
        <meta name="keywords" content="Fluiq configuration, SDK configuration, API keys, environment variables, LLM SDK settings, feature toggles" />
        <link rel="canonical" href="https://getfluiq.com/documentation/configuration" />
        <meta property="og:url" content="https://getfluiq.com/documentation/configuration" />
        <meta property="og:title" content="Configuration — Fluiq Docs" />
        <meta property="og:description" content="Full reference for Fluiq SDK configuration options — API keys, environment variables, log levels, timeout settings, and per-feature toggles." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          "headline": "Configuration — Fluiq Docs",
          "description": "Full reference for Fluiq SDK configuration options — API keys, environment variables, log levels, timeout settings, and per-feature toggles.",
          "url": "https://getfluiq.com/documentation/configuration",
          "isPartOf": { "@id": "https://getfluiq.com" },
        })}</script>
      </Helmet>
    <div className="space-y-4">
      <PageHeading
        icon={ZapIcon}
        title="Configuration"
        description="Four top-level functions configure the SDK. instrument() is required; optimize(), secure(), and eval() are optional paid features."
      />

      <p className="font-medium">fluiq.instrument()</p>
      <Code>{`fluiq.instrument(
    api_key  = "fl_...",          # required — or set FLUIQ_API_KEY env var
    endpoint = "https://...",     # optional — override for self-hosted
    version  = "v1",              # optional — pin for stable schema
)`}</Code>
      <p className="text-sm text-muted-foreground">
        The SDK reads <code className="font-mono text-foreground">FLUIQ_API_KEY</code> and <code className="font-mono text-foreground">FLUIQ_API_ENDPOINT</code> from the environment automatically, so <code className="font-mono text-foreground">instrument()</code> can be called with no arguments in CI and production environments that set those variables.
      </p>

      <p className="font-medium mt-2">fluiq.optimize()</p>
      <Code>{`fluiq.optimize(
    mode = "cache",    # "cache" (default) | "observe"
)`}</Code>
      <div className="grid gap-3 text-sm">
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
          <div>
            <p className="font-mono text-sm text-foreground">
              mode
              <Badge variant="outline" className="ml-2">Team+ required</Badge>
            </p>
            <p className="mt-1 text-muted-foreground">
              <code className="font-mono text-foreground">"cache"</code> — full Redis caching enabled (default).{" "}
              <code className="font-mono text-foreground">"observe"</code> — records what would be hits without intercepting calls.
              Must be called after <code className="font-mono text-foreground">instrument()</code>. Fails open — if the backend is unreachable or the plan check fails, all LLM calls proceed normally.
            </p>
          </div>
        </div>
      </div>

      <p className="font-medium mt-2">fluiq.secure()</p>
      <Code>{`fluiq.secure(
    mode = "warn",     # "warn" (default) | "block"
)`}</Code>
      <div className="grid gap-3 text-sm">
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
          <div>
            <p className="font-mono text-sm text-foreground">
              mode
              <Badge variant="outline" className="ml-2">Team+ required</Badge>
            </p>
            <p className="mt-1 text-muted-foreground">
              <code className="font-mono text-foreground">"warn"</code> — post-call scan only; security metadata enriched on the trace (default).{" "}
              <code className="font-mono text-foreground">"block"</code> — pre-call guard; raises <code className="font-mono text-foreground">FluiqSecurityError</code> before the LLM call when a HIGH-risk prompt is detected.
              Must be called after <code className="font-mono text-foreground">instrument()</code>. Fails open — a plan downgrade or endpoint outage never blocks your LLM calls.
            </p>
          </div>
        </div>
      </div>

      <p className="font-medium mt-2">fluiq.fetch_prompt()</p>
      <Code>{`fluiq.fetch_prompt(
    slug  = "my-prompt",       # required — the unique identifier
    env   = "production",      # optional — "development" | "staging" | "production" (default)
)`}</Code>
      <div className="grid gap-3 text-sm">
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
          <div>
            <p className="font-mono text-sm text-foreground">slug / env</p>
            <p className="mt-1 text-muted-foreground">
              Fetches the environment snapshot promoted via the Prompts dashboard. Requires <code className="font-mono text-foreground">instrument()</code> to have been called first (uses the same API key). Returns a prompt object with <code className="font-mono text-foreground">.template</code>, <code className="font-mono text-foreground">.model</code>, <code className="font-mono text-foreground">.variables</code>, <code className="font-mono text-foreground">.version</code>, and a <code className="font-mono text-foreground">.render(**kwargs)</code> method for variable substitution.
            </p>
          </div>
        </div>
      </div>

      <p className="font-medium mt-2">fluiq.eval()</p>
      <Code>{`fluiq.eval(
    thresholds   = {"hallucination": 0.8, "relevance": 0.7},
    metrics      = ["hallucination", "relevance", "toxicity"],
    mode         = "warn",          # "warn" (default) | "block"
    judge_model  = "gpt-4o-mini",
)`}</Code>
      <div className="grid gap-3 text-sm">
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
          <div>
            <p className="font-mono text-sm text-foreground">thresholds / metrics / mode / judge_model</p>
            <p className="mt-1 text-muted-foreground">
              Runs Fluiq's LLM-as-judge server-side after every LLM call. Supported metrics: <code className="font-mono text-foreground">hallucination</code>, <code className="font-mono text-foreground">faithfulness</code>, <code className="font-mono text-foreground">relevance</code>, <code className="font-mono text-foreground">toxicity</code>, <code className="font-mono text-foreground">coherence</code>, <code className="font-mono text-foreground">completeness</code>.{" "}
              <code className="font-mono text-foreground">"warn"</code> logs when a score is below threshold (default).{" "}
              <code className="font-mono text-foreground">"block"</code> raises <code className="font-mono text-foreground">FluiqEvalError</code> before returning the response.
              Scores are stored in ClickHouse and visible in the dashboard's Quality column across all previous traces.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
