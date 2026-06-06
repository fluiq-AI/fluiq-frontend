import { Helmet } from "react-helmet-async"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight02Icon, BookOpen01Icon, RocketIcon } from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Code } from "./_docComponents"

export default function QuickstartPage() {
  return (
    <>
      <Helmet>
        <title>Quickstart — Fluiq Docs</title>
        <meta name="description" content="Install the Fluiq SDK and add full LLM observability to your Python app in under 60 seconds. Works with OpenAI, Anthropic, LangChain, and 13+ more." />
        <meta name="keywords" content="Fluiq quickstart, LLM observability setup, Python LLM SDK, install Fluiq, LLM tracing tutorial, getting started" />
        <link rel="canonical" href="https://getfluiq.com/documentation/quickstart" />
        <meta property="og:url" content="https://getfluiq.com/documentation/quickstart" />
        <meta property="og:title" content="Quickstart — Fluiq Docs" />
        <meta property="og:description" content="Install the Fluiq SDK and add full LLM observability to your Python app in under 60 seconds. Works with OpenAI, Anthropic, LangChain, and 13+ more." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          "headline": "Quickstart — Fluiq Docs",
          "description": "Install the Fluiq SDK and add full LLM observability to your Python app in under 60 seconds. Works with OpenAI, Anthropic, LangChain, and 13+ more.",
          "url": "https://getfluiq.com/documentation/quickstart",
          "isPartOf": { "@id": "https://getfluiq.com" },
        })}</script>
      </Helmet>
    <div className="space-y-12">
      <div>
        <Badge variant="outline" className="mb-4 gap-1.5 px-3 py-1">
          <HugeiconsIcon icon={BookOpen01Icon} />
          SDK reference
        </Badge>
        <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
          Fluiq Python SDK
        </h1>
        <p className="mt-3 text-muted-foreground">
          Two lines of Python instrument any AI agent or LLM pipeline. Auto-traced integrations for OpenAI, Anthropic, Gemini, LangChain, and MCP, plus a <code className="font-mono text-foreground">@trace</code> decorator for everything else. Server-side security scanning, Redis caching, and LLM-as-judge evaluations are one method call each — all on Fluiq infrastructure, nothing to deploy.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={RocketIcon} />
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Quickstart</h2>
        </div>
        <p className="text-muted-foreground">
          Install the package, grab an API key, and call <code className="font-mono text-foreground">instrument()</code> once at startup. Every supported LLM call from that point is traced automatically.
        </p>
        <div className="grid gap-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">1</span>
            <div className="grow">
              <p className="font-medium">Install</p>
              <Code>{`pip install fluiq`}</Code>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">2</span>
            <div className="grow">
              <p className="font-medium">Get an API key</p>
              <p className="text-muted-foreground">
                Create a free account and copy your key from the dashboard.{" "}
                <Link to="/signup" className="font-medium text-foreground hover:underline">Sign up &rarr;</Link>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">3</span>
            <div className="grow">
              <p className="font-medium">Instrument once at startup</p>
              <Code>{`import fluiq

fluiq.instrument(api_key="fl_...") # or set FLUIQ_API_KEY to environment

# Every OpenAI / Anthropic / Gemini / LangChain / MCP
# call from this point on is traced automatically.
# Optionally add paid features:
fluiq.optimize()   # Redis caching — Team+
fluiq.secure()     # Security scanning — Team+`}</Code>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={RocketIcon} />
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Next steps</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open the dashboard</CardTitle>
              <CardDescription>Watch traces stream in, inspect costs by node, and review quality scores.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/login">
                  Go to dashboard
                  <HugeiconsIcon icon={ArrowRight02Icon} />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add the eval gate</CardTitle>
              <CardDescription>Gate every PR on hallucination, faithfulness, and relevancy thresholds.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/documentation/evaluation">
                  See eval gate setup
                  <HugeiconsIcon icon={ArrowRight02Icon} />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enable optimization</CardTitle>
              <CardDescription>One method call activates Redis caching driven by your trace history.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/signup">
                  Upgrade to Team
                  <HugeiconsIcon icon={ArrowRight02Icon} />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manage prompts</CardTitle>
              <CardDescription>Discover, edit, evaluate, and promote prompt templates to dev, staging, and production.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/dashboard/prompts">
                  Open Prompts
                  <HugeiconsIcon icon={ArrowRight02Icon} />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
    </>
  )
}
