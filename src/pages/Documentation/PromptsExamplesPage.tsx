import { Helmet } from "react-helmet-async"
import { FileScriptIcon } from "@hugeicons/core-free-icons"
import { IntegrationTabs, PageHeading } from "./_docComponents"

const tabs = [
  {
    label: "Basic usage",
    description: "Fetch a deployed prompt template by slug and render it with variables before calling your LLM.",
    code: `import fluiq
import openai

fluiq.instrument(api_key="fl_...")

client = openai.OpenAI()

# Fetch the production snapshot (default)
prompt = fluiq.fetch_prompt("customer-support-reply")

# Fill template variables and call your LLM
filled = prompt.render(
    company="Acme Corp",
    language="English",
    question=user_input,
)

response = client.chat.completions.create(
    model=prompt.model or "gpt-4o",
    messages=[{"role": "user", "content": filled}],
)
print(response.choices[0].message.content)`,
  },
  {
    label: "Environments",
    description: "Fetch a prompt from a specific environment — development, staging, or production. Each environment stores an independent snapshot.",
    code: `import fluiq

fluiq.instrument(api_key="fl_...")

# Production snapshot (default)
prod_prompt    = fluiq.fetch_prompt("summariser")

# Staging — test changes before promoting to prod
staging_prompt = fluiq.fetch_prompt("summariser", env="staging")

# Development — iterate locally without touching staging
dev_prompt     = fluiq.fetch_prompt("summariser", env="development")

print(f"prod v{prod_prompt.version}  →  {prod_prompt.template[:60]}...")
print(f"stg  v{staging_prompt.version}  →  {staging_prompt.template[:60]}...")
print(f"dev  v{dev_prompt.version}  →  {dev_prompt.template[:60]}...")`,
  },
  {
    label: "Anthropic",
    description: "Use fetch_prompt() with Anthropic — the prompt object exposes the suggested model so your code stays model-agnostic.",
    code: `import fluiq
import anthropic

fluiq.instrument(api_key="fl_...")

client = anthropic.Anthropic()

prompt = fluiq.fetch_prompt("technical-explainer")

filled = prompt.render(topic=user_question, audience="engineers")

response = client.messages.create(
    model=prompt.model or "claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": filled}],
)
print(response.content[0].text)`,
  },
  {
    label: "Template variables",
    description: "Inspect detected variables before rendering — useful for validation or building dynamic UIs.",
    code: `import fluiq

fluiq.instrument(api_key="fl_...")

prompt = fluiq.fetch_prompt("onboarding-email")

# Variables detected from {{...}} placeholders in the template
print(prompt.variables)   # ["first_name", "product", "tier"]

# Validate all required variables are present before rendering
required = set(prompt.variables)
provided = {"first_name": "Alice", "product": "Fluiq", "tier": "Team"}

missing = required - provided.keys()
if missing:
    raise ValueError(f"Missing template variables: {missing}")

filled = prompt.render(**provided)
print(filled)`,
  },
  {
    label: "Hot-swap",
    description: "Call fetch_prompt() per request to pick up promoted changes instantly — no code change or redeploy needed.",
    code: `import fluiq
import openai

fluiq.instrument(api_key="fl_...")

client = openai.OpenAI()

def handle_request(user_message: str) -> str:
    # Fetched fresh every call — promotions appear immediately
    prompt = fluiq.fetch_prompt("chat-system-prompt")

    response = client.chat.completions.create(
        model=prompt.model or "gpt-4o",
        messages=[
            {"role": "system", "content": prompt.template},
            {"role": "user",   "content": user_message},
        ],
    )
    return response.choices[0].message.content

# Edit the prompt in the dashboard → promote to production
# → next request picks up the new version automatically
# → no code change, no redeploy`,
  },
  {
    label: "Async",
    description: "fetch_prompt() works identically inside async functions — await it in FastAPI, async LangChain, or any async framework.",
    code: `import fluiq
import openai
import asyncio

fluiq.instrument(api_key="fl_...")

client = openai.AsyncOpenAI()

async def handle(user_message: str) -> str:
    prompt = fluiq.fetch_prompt("support-agent")

    filled = prompt.render(question=user_message)

    response = await client.chat.completions.create(
        model=prompt.model or "gpt-4o",
        messages=[{"role": "user", "content": filled}],
    )
    return response.choices[0].message.content

asyncio.run(handle("How do I upgrade my plan?"))`,
  },
  {
    label: "Version info",
    description: "Inspect version and deployment metadata of a fetched prompt — useful for logging and debugging.",
    code: `import fluiq

fluiq.instrument(api_key="fl_...")

prompt = fluiq.fetch_prompt("product-description")

print(f"slug:         {prompt.slug}")
print(f"name:         {prompt.name}")
print(f"version:      v{prompt.version}")
print(f"environment:  {prompt.environment}")
print(f"deployed_at:  {prompt.deployed_at}")
print(f"model:        {prompt.model or '(not set)'}")
print(f"variables:    {prompt.variables}")
print()
print("template preview:")
print(prompt.template[:200])`,
  },
]

export default function PromptsExamplesPage() {
  return (
    <>
      <Helmet>
        <title>Prompt Management Examples — Fluiq Docs</title>
        <meta name="description" content="Code examples for Fluiq prompt management: fetching versioned prompt templates by environment, variable injection, and deployment across dev, staging, and production." />
        <link rel="canonical" href="https://getfluiq.com/examples/prompts" />
        <meta property="og:url" content="https://getfluiq.com/examples/prompts" />
        <meta property="og:title" content="Prompt Management Examples — Fluiq Docs" />
        <meta property="og:description" content="Code examples for Fluiq prompt management: fetching versioned prompt templates by environment, variable injection, and deployment across dev, staging, and production." />
      </Helmet>
    <div className="space-y-6">
      <PageHeading
        icon={FileScriptIcon}
        title="Prompts"
        description="fluiq.fetch_prompt() fetches a versioned template from the Prompts dashboard at runtime. Edit and promote prompts without touching your code or triggering a redeploy."
      />
      <IntegrationTabs tabs={tabs} />
    </div>
    </>
  )
}
