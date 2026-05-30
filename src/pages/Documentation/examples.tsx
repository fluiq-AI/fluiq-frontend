import { useState } from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  ArrowRight02Icon,
  ChartLineData01Icon,
  FileScriptIcon,
  SecurityCheckIcon,
  TestTube01Icon,
  ZapIcon,
  BookOpen01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CodeBlock } from "@/components/code-block"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────────────────────────────── */
/*  Data                                                                   */
/* ─────────────────────────────────────────────────────────────────────── */

const observabilityTabs = [
  {
    label: "OpenAI",
    description:
      "Patches chat completions, streaming, embeddings, images, and audio — sync and async.",
    code: `import openai
from fluiq import instrument

instrument(api_key="fl_...")

client = openai.OpenAI()

# Chat completions — traced automatically
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Summarise this document"}],
)

# Streaming — also traced
with client.chat.completions.stream(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Write a haiku"}],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

# Embeddings
client.embeddings.create(
    model="text-embedding-3-small",
    input=["Hello", "World"],
)`,
  },
  {
    label: "Anthropic",
    description:
      "Patches the Messages API and the Beta client — sync, async, and streaming.",
    code: `import anthropic
from fluiq import instrument

instrument(api_key="fl_...")

client = anthropic.Anthropic()

# Messages — traced automatically
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=512,
    system="You are a concise technical writer.",
    messages=[{"role": "user", "content": "Explain RAG in one paragraph"}],
)
print(response.content[0].text)

# Streaming
with client.messages.stream(
    model="claude-sonnet-4-6",
    max_tokens=512,
    messages=[{"role": "user", "content": "Write a haiku"}],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)`,
  },
  {
    label: "Gemini",
    description:
      "Patches google-genai and Vertex AI — generation, streaming, and count_tokens, sync and async.",
    code: `from google import genai
from fluiq import instrument

instrument(api_key="fl_...")

client = genai.Client()

# Text generation — traced automatically
response = client.models.generate_content(
    model="gemini-2.5-pro",
    contents="Explain quantum entanglement in simple terms",
)
print(response.text)

# Streaming
for chunk in client.models.generate_content_stream(
    model="gemini-2.5-pro",
    contents="Tell me a short story",
):
    print(chunk.text, end="", flush=True)

# Token counting — also traced
count = client.models.count_tokens(
    model="gemini-2.5-pro",
    contents="How many tokens is this sentence?",
)`,
  },
  {
    label: "LangChain",
    description:
      "Patches the LangChain runtime so chains, agents, and retrievers emit traces automatically.",
    code: `from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from fluiq import instrument

instrument(api_key="fl_...")

llm = ChatOpenAI(model="gpt-4o")

# Direct invocation
llm.invoke("What is observability?")

# Full chain — every step is a traced span
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant. Be concise."),
    ("human", "{question}"),
])
chain = prompt | llm
chain.invoke({"question": "What is Fluiq?"})

# Streaming chain
for chunk in chain.stream({"question": "Explain LangChain in one line"}):
    print(chunk.content, end="", flush=True)`,
  },
  {
    label: "MCP",
    description:
      "Wraps MCP client initialize so tool calls flowing through Model Context Protocol servers are traced.",
    code: `from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from fluiq import instrument

instrument(api_key="fl_...")

server_params = StdioServerParameters(
    command="python",
    args=["my_mcp_server.py"],
)

async def run():
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()  # ← Fluiq hooks here
            tools = await session.list_tools()
            result = await session.call_tool(
                "search", {"query": "AI observability"}
            )
            print(result)`,
  },
  {
    label: "LangGraph",
    description:
      "Every node execution and edge transition in a LangGraph StateGraph is captured as a traced span automatically.",
    code: `from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from fluiq import instrument
from typing import TypedDict

instrument(api_key="fl_...")

llm = ChatOpenAI(model="gpt-4o")

class State(TypedDict):
    question: str
    answer: str

def research_node(state: State) -> State:
    response = llm.invoke(f"Research: {state['question']}")
    return {"answer": response.content}

def refine_node(state: State) -> State:
    response = llm.invoke(
        f"Improve this answer: {state['answer']}"
    )
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

# All node calls traced automatically — visible in the trace tree
result = graph.invoke({"question": "What is semantic caching?"})
print(result["answer"])`,
  },
  {
    label: "CrewAI",
    description:
      "Agent and task executions inside a CrewAI Crew are traced automatically — each agent run becomes a named span.",
    code: `from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool
from fluiq import instrument

instrument(api_key="fl_...")

search_tool = SerperDevTool()

researcher = Agent(
    role="Senior Research Analyst",
    goal="Uncover cutting-edge developments in AI observability",
    backstory="You are an expert at finding and synthesising technical information.",
    tools=[search_tool],
    verbose=True,
)

writer = Agent(
    role="Technical Writer",
    goal="Write a concise, accurate summary of research findings",
    backstory="You excel at turning dense research into readable prose.",
    verbose=True,
)

research_task = Task(
    description="Research the latest trends in LLM observability tools.",
    expected_output="A bullet-point summary of key findings.",
    agent=researcher,
)

write_task = Task(
    description="Turn the research findings into a two-paragraph summary.",
    expected_output="Two clear paragraphs for a technical audience.",
    agent=writer,
)

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, write_task],
    process=Process.sequential,
)

# Each agent's LLM calls appear as child spans in the Fluiq trace tree
result = crew.kickoff()
print(result)`,
  },
  {
    label: "Google ADK",
    description:
      "Google Agent Development Kit agents are traced through the underlying Gemini calls captured by Fluiq's google-genai patch.",
    code: `from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google import genai
from fluiq import instrument

instrument(api_key="fl_...")  # patches google-genai used by ADK

root_agent = Agent(
    name="support_agent",
    model="gemini-2.5-pro",
    description="A helpful customer support agent.",
    instruction=(
        "You are a concise, accurate support agent. "
        "Answer questions about the product clearly."
    ),
)

session_service = InMemorySessionService()
runner = Runner(
    agent=root_agent,
    app_name="support_app",
    session_service=session_service,
)

import asyncio
from google.adk.sessions import Session
from google.genai import types as genai_types

async def main():
    session = await session_service.create_session(
        app_name="support_app", user_id="user_1"
    )
    response = runner.run(
        user_id="user_1",
        session_id=session.id,
        new_message=genai_types.Content(
            role="user",
            parts=[genai_types.Part(text="How do I reset my password?")],
        ),
    )
    async for event in response:
        if event.is_final_response():
            print(event.response.text)

asyncio.run(main())`,
  },
  {
    label: "@trace decorator",
    description:
      "Wrap any Python function — sync or async — to record inputs, outputs, latency, and errors as a named span.",
    code: `from fluiq import instrument, trace
import openai

instrument(api_key="fl_...")
client = openai.OpenAI()

@trace
def retrieve(question: str) -> list[str]:
    """Custom retrieval step — its own span in the trace tree."""
    return vector_store.similarity_search(question, k=4)

@trace(name="rag_agent")
async def answer(question: str) -> str:
    docs = retrieve(question)               # nested child span
    context = "\\n".join(docs)
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"Context:\\n{context}"},
            {"role": "user",   "content": question},
        ],
    )
    return response.choices[0].message.content

import asyncio
asyncio.run(answer("What is RAG?"))`,
  },
]

const securityTabs = [
  {
    label: "Warn mode",
    description:
      "Default mode — every traced LLM call is scanned server-side. Risks are flagged on the trace without blocking execution.",
    code: `import fluiq
import openai

fluiq.instrument(api_key="fl_...")
fluiq.secure()  # warn mode by default

client = openai.OpenAI()

# Calls proceed normally; risk metadata appears in the Security dashboard
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": user_input}],
)`,
  },
  {
    label: "Block mode",
    description:
      "In block mode the pre-call check fires automatically before every traced LLM call. If the server returns allow=False, FluiqSecurityError is raised and the LLM call is never made.",
    code: `import fluiq
from fluiq.exceptions import FluiqSecurityError
import openai

fluiq.instrument(api_key="fl_...")
fluiq.secure(mode="block")  # pre-call check runs automatically

client = openai.OpenAI()

try:
    # Pre-call check fires here before reaching OpenAI
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": user_input}],
    )
    answer = response.choices[0].message.content
except FluiqSecurityError as e:
    print(f"Blocked:      {e.block_reason}")
    print(f"Risk level:   {e.risk_level}")    # "medium" or "high"
    print(f"Attack types: {e.attack_types}")  # e.g. ["jailbreak", "pii"]
    answer = "I can't process that request."`,
  },
  {
    label: "Exception attributes",
    description:
      "FluiqSecurityError carries three attributes from the server's detection result. Detection rules — attack patterns, PII types, topic filters — are configured per-organisation in the Fluiq Security dashboard, not in SDK code.",
    code: `import fluiq
from fluiq.exceptions import FluiqSecurityError
import openai

fluiq.instrument(api_key="fl_...")
fluiq.secure(mode="block")

client = openai.OpenAI()

try:
    client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": user_input}],
    )
except FluiqSecurityError as e:
    # e.block_reason  — human-readable explanation from the server
    # e.risk_level    — "medium" or "high"
    # e.attack_types  — detected categories, e.g.:
    #   ["prompt_injection", "jailbreak", "skeleton_key", "pii"]
    match e.risk_level:
        case "high":
            return 403, {"error": e.block_reason, "types": e.attack_types}
        case "medium":
            return 400, {"error": "Request flagged — please rephrase."}`,
  },
  {
    label: "FastAPI integration",
    description:
      "A realistic web handler pattern — catch FluiqSecurityError at the route level and return a clean HTTP response without leaking internal details.",
    code: `from fastapi import FastAPI
from fastapi.responses import JSONResponse
import fluiq
from fluiq.exceptions import FluiqSecurityError
import openai

fluiq.instrument(api_key="fl_...")
fluiq.secure(mode="block")

app = FastAPI()
client = openai.OpenAI()

@app.post("/chat")
async def chat(body: dict):
    user_input = body.get("message", "")
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": user_input}],
        )
        return {"reply": response.choices[0].message.content}

    except FluiqSecurityError as e:
        # Pre-call check blocked the request — don't surface internals
        status = 403 if e.risk_level == "high" else 400
        return JSONResponse(
            status_code=status,
            content={"error": "Your message was flagged by our safety policy."},
        )`,
  },
  {
    label: "Audit Log",
    description:
      "Every SDK configuration call and API action is automatically written to an append-only, HMAC-signed audit trail. Query it via REST or browse and export it from the dashboard — no extra SDK code needed.",
    code: `# Query the audit log via REST (server-side code)
import requests

headers = {"Authorization": f"Bearer {fluiq_api_key}"}

# Fetch the last 50 guardrail-related events
resp = requests.get(
    "https://api.getfluiq.com/api/v1/audit",
    params={
        "event_type": "guardrail.updated",
        "limit":      50,
        "offset":     0,
    },
    headers=headers,
)

for event in resp.json()["events"]:
    print(event["event_type"], event["actor"], event["created_at"])
    print("row_hash:", event["row_hash"])   # HMAC-SHA256 for tamper detection

# Filter by actor (email or API key prefix)
resp = requests.get(
    "https://api.getfluiq.com/api/v1/audit",
    params={"actor": "alice@example.com", "limit": 100},
    headers=headers,
)`,
  },
  {
    label: "Guardrail policy",
    description:
      "Set per-org blocking rules, custom phrase lists, and alert webhooks via the REST API. Changes take effect within 60 seconds — no SDK update or redeployment required.",
    code: `import requests

headers = {
    "Authorization": f"Bearer {fluiq_api_key}",
    "Content-Type": "application/json",
}

# Configure org-level guardrail policy
requests.put(
    "https://api.getfluiq.com/api/v1/guardrails",
    json={
        # Block only confirmed high-risk requests (default)
        "block_threshold": "high",
        # Warn on medium-risk findings too
        "warn_threshold": "medium",
        # Only these categories trigger a block — PII is warn-only
        "block_categories": ["prompt_injection", "jailbreak", "skeleton_key"],
        # Exact phrases always blocked before any scan
        "custom_deny_list": [
            "ignore previous instructions",
            "confidential pricing",
        ],
        # Phrases that skip all scanning (internal tooling)
        "custom_allow_list": ["internal-test-harness"],
        # Webhook for real-time alerts
        "alert_webhook": "https://hooks.slack.com/services/...",
        "alert_on": ["high"],   # only alert on confirmed high-risk blocks
    },
    headers=headers,
)`,
  },
]

const evaluationTabs = [
  {
    label: "Warn mode",
    description:
      "Call fluiq.eval() once after instrument() — every subsequent traced LLM call is scored in the background. Results appear in the Evaluations dashboard; a warning is logged when a score falls below its threshold.",
    code: `import openai
import fluiq

fluiq.instrument(api_key="fl_...")
fluiq.eval(
    metrics=["hallucination", "relevance"],  # scored on every LLM call
    mode="warn",                             # default — never blocks
    thresholds={"hallucination": 0.8, "relevance": 0.7},
)

client = openai.OpenAI()

# Evaluation fires automatically after this call
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What year did World War II end?"}],
)
print(response.choices[0].message.content)
# Scores visible in the Fluiq Evaluations tab`,
  },
  {
    label: "Block mode",
    description:
      "In block mode fluiq.eval() runs synchronously after each LLM call and raises FluiqEvalError if any metric falls below its threshold — the response never reaches your application.",
    code: `import openai
import fluiq
from fluiq.exceptions import FluiqEvalError

fluiq.instrument(api_key="fl_...")
fluiq.eval(
    metrics=["hallucination", "toxicity"],
    mode="block",
    thresholds={"hallucination": 0.8, "toxicity": 0.9},
)

client = openai.OpenAI()

try:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": user_query}],
    )
    answer = response.choices[0].message.content
except FluiqEvalError as e:
    # Score fell below threshold — handle gracefully
    print(f"Eval blocked response: {e}")
    answer = "I can't answer that right now."`,
  },
  {
    label: "All metrics",
    description:
      "Fluiq supports six built-in metrics. Mix and match with per-metric thresholds.",
    code: `import fluiq

fluiq.instrument(api_key="fl_...")
fluiq.eval(
    metrics=[
        "hallucination",   # is the response grounded in fact?
        "faithfulness",    # does it stay true to any provided context?
        "relevance",       # does it address the question?
        "toxicity",        # does it contain harmful content?
        "coherence",       # is it logically consistent?
        "completeness",    # does it fully answer the question?
    ],
    thresholds={
        "hallucination": 0.80,
        "faithfulness":  0.75,
        "relevance":     0.70,
        "toxicity":      0.95,
        "coherence":     0.70,
        "completeness":  0.65,
    },
    mode="warn",
    judge_model="claude-haiku-4-5-20251001",  # default judge
)`,
  },
  {
    label: "LangChain",
    description:
      "Evaluation fires automatically on every LangChain LLM call — chains, agents, and direct invocations are all covered.",
    code: `from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
import fluiq

fluiq.instrument(api_key="fl_...")
fluiq.eval(metrics=["hallucination", "relevance"], mode="warn")

llm = ChatOpenAI(model="gpt-4o")
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant. Be concise and accurate."),
    ("human", "{question}"),
])
chain = prompt | llm

# Every chain invocation is traced and evaluated automatically
chain.invoke({"question": "Explain the difference between RAG and fine-tuning"})`,
  },
  {
    label: "LangGraph",
    description:
      "Each LLM call inside a graph node is evaluated independently — scores are attached to the corresponding span in the trace tree.",
    code: `from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
import fluiq
from typing import TypedDict

fluiq.instrument(api_key="fl_...")
fluiq.eval(metrics=["hallucination", "relevance"], mode="warn")

llm = ChatOpenAI(model="gpt-4o")

class State(TypedDict):
    question: str
    answer: str

def research_node(state: State) -> State:
    # This LLM call is traced and evaluated automatically
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

result = graph.invoke({"question": "What are the benefits of semantic caching?"})`,
  },
  {
    label: "CrewAI",
    description:
      "Every LLM call made by a CrewAI agent is evaluated — scores appear as individual spans under the agent in the trace tree.",
    code: `from crewai import Agent, Task, Crew, Process
import fluiq

fluiq.instrument(api_key="fl_...")
fluiq.eval(metrics=["hallucination", "relevance", "completeness"], mode="warn")

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

# Every agent LLM call is evaluated automatically
crew.kickoff(inputs={"topic": "LLM observability best practices"})`,
  },
  {
    label: "Google ADK",
    description:
      "ADK agent calls are evaluated through the google-genai patch — each Gemini call gets a score attached to its trace span.",
    code: `from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types
import fluiq

fluiq.instrument(api_key="fl_...")
fluiq.eval(metrics=["hallucination", "relevance", "coherence"], mode="warn")

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

async def ask(user_id: str, question: str):
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

# Gemini call is evaluated automatically; score attached to the trace
await ask("u1", "How do I upgrade my subscription?")`,
  },
  {
    label: "CI/CD eval gate",
    description:
      "Use block mode in CI — set thresholds tight and catch FluiqEvalError to fail the build when response quality regresses.",
    code: `# evaluate.py — run in your CI pipeline before merging
import asyncio
import fluiq
from fluiq.exceptions import FluiqEvalError
import openai

fluiq.instrument(api_key="fl_...")
fluiq.eval(
    metrics=["hallucination", "relevance", "completeness"],
    mode="block",
    thresholds={
        "hallucination": 0.85,
        "relevance":     0.80,
        "completeness":  0.75,
    },
)

client = openai.OpenAI()

TEST_CASES = [
    "What year did World War II end?",
    "Explain the difference between TCP and UDP.",
    "What is the capital of Australia?",
]

async def main():
    passed = failed = 0
    for question in TEST_CASES:
        try:
            client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": question}],
            )
            passed += 1
        except FluiqEvalError as e:
            print(f"FAIL [{question[:40]}]: {e}")
            failed += 1

    print(f"\\nResults: {passed} passed, {failed} failed")
    if failed:
        raise SystemExit(f"Eval gate FAILED: {failed} case(s) below threshold")
    print("✓ Eval gate passed")

asyncio.run(main())`,
  },
]

const promptsTabs = [
  {
    label: "Basic usage",
    description:
      "Fetch a deployed prompt template by slug and render it with variables before calling your LLM.",
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
    description:
      "Fetch a prompt from a specific environment — development, staging, or production. Each environment stores an independent snapshot.",
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
    description:
      "Use fetch_prompt() with Anthropic — the prompt object exposes the suggested model so your code stays model-agnostic.",
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
    description:
      "Inspect detected variables before rendering — useful for validation or building dynamic UIs.",
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
    description:
      "Call fetch_prompt() per request to pick up promoted changes instantly — no code change or redeploy needed.",
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
    description:
      "fetch_prompt() works identically inside async functions — await it in FastAPI, async LangChain, or any async framework.",
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
    description:
      "Inspect version and deployment metadata of a fetched prompt — useful for logging and debugging.",
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

const optimizationTabs = [
  {
    label: "OpenAI",
    description:
      "One call to optimize() enables semantic caching for all traced OpenAI calls — chat, streaming, and embeddings.",
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
    description:
      "Semantic caching works transparently across Anthropic model calls.",
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
    description:
      "Works with google-genai and Vertex AI — generation and streaming calls are all eligible for caching.",
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
    description:
      "Caching applies to all LangChain LLM calls — chains, agents, and direct invocations.",
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
    description:
      "Semantic caching applies to every LLM call inside a LangGraph node — repeated or similar subgraph paths are served from cache.",
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
    description:
      "Every LLM call made by a CrewAI agent is cached — repeated questions across tasks or reruns are served instantly.",
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
    description:
      "ADK agents are cached through the google-genai patch — repeated or semantically similar user queries skip the Gemini API entirely.",
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
    description:
      "Tune the cache TTL (seconds) and semantic similarity threshold to balance hit rate against answer freshness.",
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
]

/* ─────────────────────────────────────────────────────────────────────── */
/*  Components                                                             */
/* ─────────────────────────────────────────────────────────────────────── */

function Code({ children }: { children: string }) {
  return <CodeBlock>{children}</CodeBlock>
}

function IntegrationTabs({
  tabs,
}: {
  tabs: Array<{ label: string; description?: string; code: string }>
}) {
  const [active, setActive] = useState(0)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={cn(
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
              active === i
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs[active].description && (
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          {tabs[active].description}
        </p>
      )}
      <Code>{tabs[active].code}</Code>
    </div>
  )
}

function SectionHeading({
  id,
  icon,
  title,
  description,
}: {
  id: string
  icon: unknown
  title: string
  description: string
}) {
  return (
    <div id={id} className="scroll-mt-24 space-y-2">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={icon as never} />
        <h2 className="font-heading text-2xl font-semibold tracking-tight">{title}</h2>
      </div>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Page                                                                   */
/* ─────────────────────────────────────────────────────────────────────── */

const sidebarSections = [
  { id: "observability", title: "Observability" },
  { id: "security",      title: "Security" },
  { id: "evaluation",    title: "Evaluation" },
  { id: "optimization",  title: "Optimization" },
  { id: "prompts",       title: "Prompts" },
]

export default function Examples() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Fluiq" className="size-7" />
            <span className="font-heading text-lg font-semibold tracking-tight">Fluiq</span>
            <Badge variant="muted" className="ml-1">Examples</Badge>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link to="/" className="hover:text-foreground">Platform</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/documentation" className="hover:text-foreground">Docs</Link>
            <Link to="/examples" className="text-foreground font-medium">Examples</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" asChild>
              <Link to="/signup">
                Get API key
                <HugeiconsIcon icon={ArrowRight02Icon} />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Layout ── */}
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[220px_1fr]">

        {/* ── Sidebar ── */}
        <aside className="hidden md:block">
          <nav className="sticky top-24 flex flex-col gap-1 text-sm">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <HugeiconsIcon icon={BookOpen01Icon} size={12} />
              Examples
            </div>
            {sidebarSections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {s.title}
              </a>
            ))}
            <div className="mt-6 border-t border-border pt-4">
              <Link
                to="/documentation"
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon icon={BookOpen01Icon} size={13} />
                SDK Reference
              </Link>
            </div>
          </nav>
        </aside>

        {/* ── Main ── */}
        <main className="min-w-0 max-w-3xl space-y-16">

          {/* ── Page intro ── */}
          <div className="mb-2">
            <Badge variant="outline" className="mb-4 gap-1.5 px-3 py-1">
              <HugeiconsIcon icon={BookOpen01Icon} />
              Code examples
            </Badge>
            <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
              Examples
            </h1>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Ready-to-run snippets for every Fluiq feature across all supported integrations.
              All examples assume <code className="font-mono text-foreground">fluiq</code> is installed
              and{" "}
              <code className="font-mono text-foreground">instrument(api_key="fl_...")</code> has been
              called once at startup.
            </p>
          </div>

          {/* ── Observability ── */}
          <section className="space-y-6">
            <SectionHeading
              id="observability"
              icon={ChartLineData01Icon}
              title="Observability"
              description="Fluiq auto-instruments every supported library after a single instrument() call. Select an integration below to see how traces flow into your dashboard."
            />
            <IntegrationTabs tabs={observabilityTabs} />
          </section>

          {/* ── Security ── */}
          <section className="space-y-6">
            <SectionHeading
              id="security"
              icon={SecurityCheckIcon}
              title="Security"
              description="fluiq.secure() adds a scanning layer to every traced LLM call. Choose warn to flag risks on the trace, or block to halt the request before it reaches the model."
            />
            <IntegrationTabs tabs={securityTabs} />
          </section>

          {/* ── Evaluation ── */}
          <section className="space-y-6">
            <SectionHeading
              id="evaluation"
              icon={TestTube01Icon}
              title="Evaluation"
              description="Call fluiq.eval() once after instrument() — Fluiq runs an LLM-as-judge on every traced LLM response, scores each metric (0–1), and stores results in your dashboard. Use block mode to gate on quality in CI."
            />
            <IntegrationTabs tabs={evaluationTabs} />
          </section>

          {/* ── Optimization ── */}
          <section className="space-y-6">
            <SectionHeading
              id="optimization"
              icon={ZapIcon}
              title="Optimization"
              description="fluiq.optimize() enables semantic caching on Fluiq-managed Redis. Calls with semantically similar prompts are served from cache — instant response, zero API cost."
            />
            <IntegrationTabs tabs={optimizationTabs} />
          </section>

          {/* ── Prompts ── */}
          <section className="space-y-6">
            <SectionHeading
              id="prompts"
              icon={FileScriptIcon}
              title="Prompts"
              description="fluiq.fetch_prompt() fetches a versioned template from the Prompts dashboard at runtime. Edit and promote prompts without touching your code or triggering a redeploy."
            />
            <IntegrationTabs tabs={promptsTabs} />
          </section>

          {/* ── CTA ── */}
          <div className="rounded-2xl border border-border bg-muted/40 px-8 py-10 text-center">
            <h2 className="font-heading text-2xl font-semibold tracking-tight mb-2">
              Ready to instrument your pipeline?
            </h2>
            <p className="text-muted-foreground mb-6 text-[15px]">
              Free tier covers 5M traces lifetime — no credit card required.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="px-6" asChild>
                <Link to="/signup">
                  Start for free
                  <HugeiconsIcon icon={ArrowRight02Icon} size={16} />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/documentation">Read the SDK docs</Link>
              </Button>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
