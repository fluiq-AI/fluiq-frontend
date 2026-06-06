import { Helmet } from "react-helmet-async"
import { MagicWand01Icon } from "@hugeicons/core-free-icons"
import { IntegrationTabs, PageHeading } from "./_docComponents"

const tabs = [
  {
    label: "OpenAI",
    description: "One call to optimize() enables semantic caching for all traced OpenAI calls — chat, streaming, and embeddings.",
    code: `import openai
from fluiq import instrument, optimize

instrument(api_key="fl_...")
optimize()  # semantic caching (Team+ plan)

client = openai.OpenAI()

# First call — hits OpenAI, response cached in Redis
r1 = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What is machine learning?"}],
)

# Semantically similar call — served instantly from cache
r2 = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Explain machine learning to me"}],
)
# r2: same quality, zero latency, zero API cost`,
  },
  {
    label: "Anthropic",
    description: "Semantic caching works transparently across Anthropic model calls.",
    code: `import anthropic
from fluiq import instrument, optimize

instrument(api_key="fl_...")
optimize()

client = anthropic.Anthropic()

# First call — hits Anthropic API
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=512,
    messages=[{"role": "user", "content": "What is machine learning?"}],
)

# Semantically equivalent follow-up — cache hit
response2 = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=512,
    messages=[{"role": "user", "content": "Can you explain machine learning?"}],
)
# Instant response, no Anthropic API cost`,
  },
  {
    label: "Gemini",
    description: "Works with google-genai and Vertex AI — generation and streaming calls are all eligible for caching.",
    code: `from google import genai
from fluiq import instrument, optimize

instrument(api_key="fl_...")
optimize()

client = genai.Client()

# First call — hits Gemini API
response = client.models.generate_content(
    model="gemini-2.5-pro",
    contents="What is machine learning?",
)

# Semantically similar — cache hit
response2 = client.models.generate_content(
    model="gemini-2.5-pro",
    contents="Explain what machine learning is",
)
# Returned from Redis: instant response, no Gemini cost`,
  },
  {
    label: "LangChain",
    description: "Caching applies to all LangChain LLM calls — chains, agents, and direct invocations.",
    code: `from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from fluiq import instrument, optimize

instrument(api_key="fl_...")
optimize()

llm = ChatOpenAI(model="gpt-4o")
prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer concisely."),
    ("human", "{question}"),
])
chain = prompt | llm

# First call hits the LLM
chain.invoke({"question": "What is machine learning?"})

# Semantically similar — cache hit
chain.invoke({"question": "Explain machine learning briefly"})`,
  },
  {
    label: "LangGraph",
    description: "Semantic caching applies to every LLM call inside a LangGraph node — repeated or similar subgraph paths are served from cache.",
    code: `from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from fluiq import instrument, optimize
from typing import TypedDict

instrument(api_key="fl_...")
optimize()  # semantic caching (Team+ plan)

llm = ChatOpenAI(model="gpt-4o")

class State(TypedDict):
    question: str
    answer: str

def research_node(state: State) -> State:
    # Cache hit if a semantically similar question was asked before
    response = llm.invoke(f"Research: {state['question']}")
    return {"answer": response.content}

def refine_node(state: State) -> State:
    response = llm.invoke(f"Improve this answer: {state['answer']}")
    return {"answer": response.content}

graph = (
    StateGraph(State)
    .add_node("research", research_node)
    .add_node("refine",   refine_node)
    .add_edge("research", "refine")
    .add_edge("refine", END)
    .set_entry_point("research")
    .compile()
)

# First run — both nodes hit the LLM, responses cached
result1 = graph.invoke({"question": "What is semantic caching?"})

# Semantically similar second run — node LLM calls served from cache
result2 = graph.invoke({"question": "Explain semantic caching to me"})`,
  },
  {
    label: "CrewAI",
    description: "Every LLM call made by a CrewAI agent is cached — repeated questions across tasks or reruns are served instantly.",
    code: `from crewai import Agent, Task, Crew, Process
from fluiq import instrument, optimize

instrument(api_key="fl_...")
optimize()  # semantic caching (Team+ plan)

researcher = Agent(
    role="Research Analyst",
    goal="Find accurate technical information",
    backstory="Expert at sourcing and synthesising technical content.",
    verbose=True,
)
writer = Agent(
    role="Technical Writer",
    goal="Write clear, concise summaries",
    backstory="Turns dense research into readable prose.",
    verbose=True,
)

research_task = Task(
    description="Research the topic: {topic}",
    expected_output="Key findings as bullet points.",
    agent=researcher,
)
write_task = Task(
    description="Write a two-paragraph summary of the findings.",
    expected_output="Two clear paragraphs.",
    agent=writer,
)

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, write_task],
    process=Process.sequential,
)

# First run — LLM calls are cached per agent
crew.kickoff(inputs={"topic": "LLM observability"})

# Rerun with similar topic — cache hits reduce latency and cost
crew.kickoff(inputs={"topic": "Observability for LLM pipelines"})`,
  },
  {
    label: "Google ADK",
    description: "ADK agents are cached through the google-genai patch — repeated or semantically similar user queries skip the Gemini API entirely.",
    code: `from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types
from fluiq import instrument, optimize

instrument(api_key="fl_...")
optimize()  # semantic caching (Team+ plan)

root_agent = Agent(
    name="support_agent",
    model="gemini-2.5-pro",
    description="A helpful customer support agent.",
    instruction="Answer customer questions accurately and concisely.",
)

session_service = InMemorySessionService()
runner = Runner(
    agent=root_agent,
    app_name="support_app",
    session_service=session_service,
)

async def ask(user_id: str, question: str) -> str:
    session = await session_service.create_session(
        app_name="support_app", user_id=user_id
    )
    response = runner.run(
        user_id=user_id,
        session_id=session.id,
        new_message=genai_types.Content(
            role="user",
            parts=[genai_types.Part(text=question)],
        ),
    )
    async for event in response:
        if event.is_final_response():
            return event.response.text
    return ""

# First call — hits Gemini, response cached
await ask("u1", "How do I reset my password?")

# Semantically similar — cache hit, instant response, no Gemini cost
await ask("u2", "What's the process to reset my password?")`,
  },
  {
    label: "Custom TTL & threshold",
    description: "Tune the cache TTL (seconds) and semantic similarity threshold to balance hit rate against answer freshness.",
    code: `from fluiq import instrument, optimize

instrument(api_key="fl_...")
optimize(
    ttl=3600,        # entries expire after 1 hour (default: 86 400 s)
    similarity=0.92, # 92% semantic similarity required (default: 0.90)
)

# Tuning guide:
#   Lower similarity (e.g. 0.80) → more cache hits, less precision
#   Higher similarity (e.g. 0.98) → fewer hits, very literal matching
#   Lower TTL  → fresher answers for fast-moving domains
#   Higher TTL → maximum cost savings for stable knowledge bases`,
  },
  {
    label: "Anthropic prompt cache",
    description: "fluiq.optimize() injects cache_control on the system prompt and last tool definition automatically — no code changes needed. Cached token counts appear in every trace.",
    code: `import anthropic
from fluiq import instrument, optimize

instrument(api_key="fl_...")
optimize()  # enables cache_control injection (Team+ plan)

client = anthropic.Anthropic()

# Fluiq automatically adds cache_control: {"type": "ephemeral"} to:
#   - system prompt (converted to content block if string)
#   - last tool definition in the tools array
#
# Anthropic caches the matching prefix server-side; subsequent calls with
# the same system + tools combo read from cache at ~10% of normal input cost.

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system="You are a senior data analyst. You have access to a comprehensive "
           "financial dataset covering 10 years of market data...",  # ← gets cached
    messages=[{"role": "user", "content": "Summarise Q3 revenue trends."}],
)

# response.usage.cache_read_input_tokens  → tokens served from Anthropic's cache
# response.usage.cache_creation_input_tokens → tokens written to create cache entry
# Both are automatically captured as prompt_cache_read_tokens /
# prompt_cache_creation_tokens in the Fluiq trace.

# Second call with same system prompt: cache_read_input_tokens > 0
response2 = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system="You are a senior data analyst. You have access to a comprehensive "
           "financial dataset covering 10 years of market data...",
    messages=[{"role": "user", "content": "Compare Q3 to Q2 performance."}],
)`,
  },
  {
    label: "MCP caching",
    description: "optimize() transparently caches list_tools() and call_tool() on every MCP ClientSession — no changes to your MCP code required.",
    code: `import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from fluiq import instrument, optimize

instrument(api_key="fl_...")
optimize()  # enables MCP list_tools + call_tool caching

async def run():
    async with streamablehttp_client("https://mcp.example.com/mcp") as (r, w, _):
        async with ClientSession(r, w) as session:
            await session.initialize()
            # initialize() also invalidates any stale list_tools cache for this URL

            # First call — hits the MCP server, result cached in Redis
            tools = await session.list_tools()

            # Second call — served from Redis instantly (same server URL)
            tools_again = await session.list_tools()

            # Tool call — result cached keyed by (server_url, "search", {query})
            result = await session.call_tool("search", {"query": "fluiq optimize"})

            # Identical call — served from Redis, MCP server never contacted
            result2 = await session.call_tool("search", {"query": "fluiq optimize"})

# Cache hits appear on the Optimize dashboard under:
#   mcp_list_tools — hit rate for tool schema lookups
#   mcp_call       — hit rate for tool execution results

asyncio.run(run())`,
  },
]

export default function OptimizationExamplesPage() {
  return (
    <>
      <Helmet>
        <title>Optimization Examples — Fluiq Docs</title>
        <meta name="description" content="Code examples for fluiq.optimize(): trace-driven LLM response caching with observe mode, configurable TTL, and per-model scope." />
        <meta name="keywords" content="fluiq.optimize examples, LLM caching code, response caching example, cache TTL, prompt caching code, observe mode" />
        <link rel="canonical" href="https://getfluiq.com/examples/optimization" />
        <meta property="og:url" content="https://getfluiq.com/examples/optimization" />
        <meta property="og:title" content="Optimization Examples — Fluiq Docs" />
        <meta property="og:description" content="Code examples for fluiq.optimize(): trace-driven LLM response caching with observe mode, configurable TTL, and per-model scope." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          "headline": "Optimization Examples — Fluiq Docs",
          "description": "Code examples for fluiq.optimize(): trace-driven LLM response caching with observe mode, configurable TTL, and per-model scope.",
          "url": "https://getfluiq.com/examples/optimization",
          "isPartOf": { "@id": "https://getfluiq.com" },
        })}</script>
      </Helmet>
    <div className="space-y-6">
      <PageHeading
        icon={MagicWand01Icon}
        title="Optimization"
        description="fluiq.optimize() enables semantic caching on Fluiq-managed Redis. Calls with semantically similar prompts are served from cache — instant response, zero API cost."
      />
      <IntegrationTabs tabs={tabs} />
    </div>
    </>
  )
}
