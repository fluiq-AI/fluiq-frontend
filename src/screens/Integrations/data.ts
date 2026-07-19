export type Category = "LLM Provider" | "Agent Framework" | "Vector Database"
export type IconKey = "eye" | "shield" | "zap" | "sparkle" | "test" | "flash" | "cpu"

export interface Feature {
  icon: IconKey
  title: string
  desc: string
}

export interface IntegrationData {
  slug: string
  name: string
  category: Category
  metaTitle: string
  metaDescription: string
  heroHeadline: string
  heroSub: string
  features: [Feature, Feature, Feature]
  setupCode: string
  setupNote?: string
  instrumentedItems: string[]
  relatedSlugs: [string, string, string]
}

export const INTEGRATIONS: IntegrationData[] = [
  // ── LLM Providers ────────────────────────────────────────────────────────
  {
    slug: "openai",
    name: "OpenAI",
    category: "LLM Provider",
    metaTitle: "OpenAI Monitoring, Cost Tracking & Tracing | Fluiq",
    metaDescription: "Auto-instrument every OpenAI call (completions, embeddings, images, audio) with two lines of Python. Full traces, USD cost per call, and security scanning.",
    heroHeadline: "OpenAI Monitoring & Cost Tracking",
    heroSub: "Two lines of Python give every OpenAI call (chat completions, streaming, embeddings, images, audio) a full trace with token counts, USD cost at OpenAI rates, and security scanning. No wrappers or decorators needed.",
    features: [
      { icon: "eye", title: "Full span tree", desc: "Every chat completion, embedding, and image call becomes a structured span with input/output tokens, model version, latency, and USD cost at OpenAI's published rates." },
      { icon: "zap", title: "Response caching", desc: "Fluiq mines your trace history to find repeated prompts and serves them from Redis, cutting both latency and API spend on high-repetition workloads." },
      { icon: "shield", title: "Security scanning", desc: "Every prompt passes through Fluiq's server-side guard for prompt injection, jailbreak patterns, PII (SSNs, cards, emails), and secret string detection, before the response is returned." },
    ],
    setupCode: `import fluiq
fluiq.instrument(api_key="fl_...")  # patches the openai module at import time

from openai import OpenAI
client = OpenAI()

# All of these are traced automatically, no code changes:
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)
embedding = client.embeddings.create(
    model="text-embedding-3-small", input="Hello world"
)`,
    instrumentedItems: [
      "openai.chat.completions.create()",
      "openai.chat.completions.acreate()",
      "openai.responses.create()",
      "openai.beta.chat.completions.parse()",
      "openai.embeddings.create()",
      "openai.images.generate()",
      "openai.audio.transcriptions.create()",
      "openai.audio.speech.create()",
    ],
    relatedSlugs: ["anthropic", "gemini", "langchain"],
  },

  {
    slug: "anthropic",
    name: "Anthropic",
    category: "LLM Provider",
    metaTitle: "Anthropic Claude Monitoring & Observability | Fluiq",
    metaDescription: "Monitor every Anthropic Claude call with two lines of Python. Prompt cache visibility, token tracking, cost at Claude rates, and security scanning.",
    heroHeadline: "Anthropic Claude Monitoring & Tracing",
    heroSub: "Auto-instrument every Claude API call (Messages, streaming, and the Beta client) with zero code changes. See prompt cache hits, token costs at Anthropic's rates, and security events on every request.",
    features: [
      { icon: "eye", title: "Prompt cache visibility", desc: "See exactly how many tokens were served from Anthropic's prompt cache (cache_read vs cache_creation) on every request, and what you saved on each call." },
      { icon: "sparkle", title: "Cost at Claude rates", desc: "Input, output, and cache token costs calculated at Anthropic's published per-token rates for each Claude model, attributed per trace and aggregated by day." },
      { icon: "shield", title: "Security scanning", desc: "Prompt injection, jailbreak scoring, and PII detection run server-side on every Claude request, in warn mode to flag, or block mode to intercept before the API call." },
    ],
    setupCode: `import fluiq
fluiq.instrument(api_key="fl_...")  # patches anthropic automatically

import anthropic
client = anthropic.Anthropic()

# Messages API, fully traced with cache visibility:
message = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Summarise this document"}],
)

# Streaming is also traced:
with client.messages.stream(model="claude-opus-4-8", max_tokens=256,
    messages=[{"role": "user", "content": "Hello"}]) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)`,
    instrumentedItems: [
      "anthropic.messages.create()",
      "anthropic.messages.stream()",
      "anthropic.messages.acreate()",
      "anthropic.beta.messages.create()",
      "anthropic.beta.messages.stream()",
      "anthropic.messages.batches.create()",
    ],
    relatedSlugs: ["openai", "gemini", "langchain"],
  },

  {
    slug: "gemini",
    name: "Google Gemini",
    category: "LLM Provider",
    metaTitle: "Google Gemini Monitoring, Cost Tracking & Tracing | Fluiq",
    metaDescription: "Auto-instrument every Google Gemini API call with two lines of Python. Full span traces, USD cost at Gemini rates, cached token tracking, and security scanning.",
    heroHeadline: "Google Gemini Monitoring & API Tracing",
    heroSub: "Auto-instrument every Gemini generate_content call, streaming and non-streaming, with zero code changes. Get token-level traces, cost at Google's published rates, and cached token visibility in your dashboard.",
    features: [
      { icon: "eye", title: "Streaming + batch traces", desc: "Both streaming and non-streaming generate_content calls are traced, with per-token counts, model version, latency, and finish reason captured on every request." },
      { icon: "zap", title: "Cached token tracking", desc: "Gemini cached token usage is tracked per call and surfaced in the Optimize dashboard, see exactly how much you're saving on context caching." },
      { icon: "sparkle", title: "Cost at Gemini rates", desc: "Token costs calculated at Google's published Gemini rates for each model tier, attributed per trace and visible in aggregate cost analytics." },
    ],
    setupCode: `import fluiq
fluiq.instrument(api_key="fl_...")  # patches google-generativeai automatically

import google.generativeai as genai
genai.configure(api_key="your-gemini-key")
model = genai.GenerativeModel("gemini-1.5-pro")

# Traced automatically, sync and async:
response = model.generate_content("Explain LLM observability in one paragraph")

# Streaming is also traced:
for chunk in model.generate_content("Write a haiku", stream=True):
    print(chunk.text, end="")`,
    instrumentedItems: [
      "genai.GenerativeModel.generate_content()",
      "genai.GenerativeModel.generate_content_async()",
      "genai.GenerativeModel.stream_generate_content()",
      "genai.embed_content()",
      "genai.embed_content_async()",
      "genai.GenerativeModel.count_tokens()",
    ],
    relatedSlugs: ["openai", "vertex-ai", "google-adk"],
  },

  {
    slug: "vertex-ai",
    name: "Google Vertex AI",
    category: "LLM Provider",
    metaTitle: "Google Vertex AI Monitoring, Cost Tracking & Tracing | Fluiq",
    metaDescription: "Monitor every Vertex AI model call with two lines of Python. Full span traces, USD cost at Vertex rates, and security scanning for enterprise LLM pipelines.",
    heroHeadline: "Google Vertex AI Monitoring & Tracing",
    heroSub: "Auto-instrument enterprise Vertex AI model calls with zero code changes. Get full span trees, cost at Vertex AI's billed rates, and security scanning on every generation request.",
    features: [
      { icon: "eye", title: "Enterprise-grade traces", desc: "Vertex AI GenerativeModel calls are traced with full span trees, input/output token counts, latency, and safety rating metadata captured on every request." },
      { icon: "sparkle", title: "Cost at Vertex rates", desc: "API costs attributed at Vertex AI's published per-character and per-token rates for each model, surfaced per trace and in aggregate cost analytics." },
      { icon: "shield", title: "Security scanning", desc: "Prompt injection and PII detection run on every Vertex AI call before responses reach your application, blocking attacks that bypass Google's built-in safety filters." },
    ],
    setupCode: `import fluiq
fluiq.instrument(api_key="fl_...")  # patches vertexai automatically

import vertexai
from vertexai.generative_models import GenerativeModel

vertexai.init(project="my-gcp-project", location="us-central1")
model = GenerativeModel("gemini-1.5-pro")

# Traced automatically with cost at Vertex AI rates:
response = model.generate_content("Summarise this enterprise document")

# Async is also traced:
response = await model.generate_content_async("Explain AI observability")`,
    instrumentedItems: [
      "vertexai.generative_models.GenerativeModel.generate_content()",
      "vertexai.generative_models.GenerativeModel.generate_content_async()",
      "vertexai.generative_models.GenerativeModel.stream()",
      "vertexai.language_models.TextGenerationModel.predict()",
      "vertexai.language_models.TextEmbeddingModel.get_embeddings()",
    ],
    relatedSlugs: ["gemini", "google-adk", "openai"],
  },

  // ── Agent Frameworks ─────────────────────────────────────────────────────
  {
    slug: "langchain",
    name: "LangChain",
    category: "Agent Framework",
    metaTitle: "LangChain Monitoring, Tracing & Observability | Fluiq",
    metaDescription: "Auto-instrument every LangChain chain, agent, and tool call. Per-step span trees, cost attribution, LLM-as-judge evals, and security in two lines of Python.",
    heroHeadline: "LangChain Monitoring & Chain Tracing",
    heroSub: "Auto-instrument every LangChain chain step (LLM calls, tool use, retriever queries) with zero code changes. Get full span trees, per-step cost attribution, and inline evals on every response.",
    features: [
      { icon: "eye", title: "Per-step span tree", desc: "Every chain step, LLM call, tool invocation, retriever query, embedding, becomes its own span with input, output, token counts, latency, and USD cost." },
      { icon: "sparkle", title: "Cost attribution", desc: "USD cost broken down per LLM node in the chain, across nested sub-chains and tool calls, know exactly which step in your pipeline is expensive." },
      { icon: "test", title: "Inline evals", desc: "LLM-as-judge scoring (hallucination, relevance, faithfulness, toxicity) runs automatically on chain outputs, warn mode logs scores, block mode intercepts bad responses." },
    ],
    setupCode: `import fluiq
fluiq.instrument(api_key="fl_...")  # patches LangChain automatically

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

llm = ChatOpenAI(model="gpt-4o")
prompt = ChatPromptTemplate.from_template("Summarise this: {text}")
chain = prompt | llm | StrOutputParser()

# Every step is a separate trace span with cost:
result = chain.invoke({"text": "Your document content here"})`,
    instrumentedItems: [
      "BaseLLM.__call__() / invoke()",
      "BaseChatModel.__call__() / invoke()",
      "BaseChain.invoke() / run()",
      "BaseTool.run() / arun()",
      "BaseRetriever.get_relevant_documents()",
      "BaseEmbeddings.embed_documents()",
      "BaseEmbeddings.embed_query()",
      "ConversationalRetrievalChain.invoke()",
    ],
    relatedSlugs: ["langgraph", "crewai", "openai"],
  },

  {
    slug: "langgraph",
    name: "LangGraph",
    category: "Agent Framework",
    metaTitle: "LangGraph Tracing & Graph Execution Monitoring | Fluiq",
    metaDescription: "Trace every LangGraph node, edge, and state transition. Per-node cost attribution, branch visibility, and full agent execution spans in two lines of Python.",
    heroHeadline: "LangGraph Tracing & Node-Level Monitoring",
    heroSub: "Auto-instrument every LangGraph graph execution, node by node, edge by edge. Get per-node span trees, cost attribution, and full visibility into which path your agent took and why.",
    features: [
      { icon: "eye", title: "Node-level span tree", desc: "Every graph node execution is a separate trace span, see which nodes ran, in what order, how long each took, and what tokens they consumed." },
      { icon: "sparkle", title: "Per-node cost breakdown", desc: "Token and USD cost attributed per graph node. Know exactly which node in your agent graph is expensive, and track cost across long-running multi-turn graphs." },
      { icon: "cpu", title: "Branch & state tracing", desc: "Conditional edges and state transitions are recorded in the trace, making it easy to debug why a graph took a particular execution path." },
    ],
    setupCode: `import fluiq
fluiq.instrument(api_key="fl_...")  # patches LangGraph automatically

from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentState(TypedDict):
    messages: list

builder = StateGraph(AgentState)
builder.add_node("planner", planner_node)
builder.add_node("executor", executor_node)
builder.add_conditional_edges("planner", route_fn, {"execute": "executor", "end": END})
builder.set_entry_point("planner")
graph = builder.compile()

# Each node is a traced span, no code changes needed:
result = graph.invoke({"messages": [("user", "Analyse sales data")]})`,
    instrumentedItems: [
      "CompiledGraph.invoke()",
      "CompiledGraph.ainvoke()",
      "CompiledGraph.stream()",
      "CompiledGraph.astream()",
      "Node function calls (any add_node target)",
      "Conditional edge routing functions",
      "MemorySaver checkpointer operations",
      "Subgraph invocations",
    ],
    relatedSlugs: ["langchain", "crewai", "openai"],
  },

  {
    slug: "crewai",
    name: "CrewAI",
    category: "Agent Framework",
    metaTitle: "CrewAI Tracing & Multi-Agent Cost Monitoring | Fluiq",
    metaDescription: "Trace every CrewAI agent, task, and tool call. Get per-agent cost attribution, tool invocation spans, and crew-level cost aggregation, two lines of Python.",
    heroHeadline: "CrewAI Tracing & Multi-Agent Monitoring",
    heroSub: "Auto-instrument every CrewAI crew execution, agent by agent, task by task. Get per-agent span trees, tool call visibility, and full cost attribution across your multi-agent pipeline.",
    features: [
      { icon: "eye", title: "Per-agent span tree", desc: "Each agent's task execution is a separate span, see which agent consumed the most tokens, took the longest, or called the most tools in a single crew kickoff." },
      { icon: "cpu", title: "Tool call tracing", desc: "Every tool invocation by a CrewAI agent is a child span with the tool name, input arguments, output, and latency, full visibility into what your agents are actually doing." },
      { icon: "sparkle", title: "Crew-level cost rollup", desc: "Total token and USD cost aggregated across the entire crew run, broken down by agent and task, know the cost of each kickoff before it hits your billing statement." },
    ],
    setupCode: `import fluiq
fluiq.instrument(api_key="fl_...")  # patches CrewAI automatically

from crewai import Agent, Task, Crew
from crewai.tools import BaseTool

researcher = Agent(
    role="Senior Researcher",
    goal="Find the latest AI agent trends",
    backstory="You are an expert researcher",
    llm="gpt-4o",
)
task = Task(description="Research LLM observability tools", agent=researcher)
crew = Crew(agents=[researcher], tasks=[task], verbose=True)

# Per-agent spans with cost attribution, no code changes:
result = crew.kickoff()`,
    instrumentedItems: [
      "Crew.kickoff() / kickoff_async()",
      "Agent._execute_task()",
      "Task.execute() / execute_sync()",
      "BaseTool._run() / _arun()",
      "Agent.execute_task()",
      "CrewAgentExecutor._call()",
      "Memory.save() / search()",
    ],
    relatedSlugs: ["langgraph", "google-adk", "openai"],
  },

  {
    slug: "google-adk",
    name: "Google ADK",
    category: "Agent Framework",
    metaTitle: "Google ADK Agent Monitoring, Tracing & Cost | Fluiq",
    metaDescription: "Trace every Google ADK agent run, step, and tool invocation. Full session visibility, Gemini model call tracing, and cost attribution, two lines of Python.",
    heroHeadline: "Google ADK Agent Monitoring & Tracing",
    heroSub: "Auto-instrument every Google Agent Development Kit run with zero code changes. Get full agent session traces, per-step tool call spans, and Gemini model costs attributed to each agent turn.",
    features: [
      { icon: "eye", title: "Agent session tracing", desc: "Full visibility into ADK agent runs, every step, tool call, and model response is a traced span, giving you a complete picture of what your agent did and how long it took." },
      { icon: "cpu", title: "Tool invocation spans", desc: "Each ADK tool call is a child span with the function name, input arguments, response, and latency, essential for debugging agents that call many tools per turn." },
      { icon: "sparkle", title: "Gemini costs included", desc: "Underlying Gemini API calls made by ADK agents are traced and costed at Google's published Gemini rates, no separate instrumentation needed." },
    ],
    setupCode: `import fluiq
fluiq.instrument(api_key="fl_...")  # patches Google ADK automatically

from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

def get_weather(city: str) -> dict:
    return {"temperature": 22, "condition": "Sunny"}

agent = LlmAgent(
    name="weather-agent",
    model="gemini-1.5-pro",
    instruction="You are a helpful weather assistant.",
    tools=[get_weather],
)
session_service = InMemorySessionService()
runner = Runner(agent=agent, app_name="weather-app",
                session_service=session_service)

# Agent run fully traced with tool spans:
response = runner.run(user_id="u1", session_id="s1",
                      new_message=types.Content(role="user",
                          parts=[types.Part(text="Weather in Tokyo?")]))`,
    instrumentedItems: [
      "Runner.run() / run_async()",
      "LlmAgent._run_async_impl()",
      "Agent tool function calls",
      "google.adk.models.Gemini.generate_content()",
      "BaseSessionService.create_session()",
      "BaseMemoryService.search_memory()",
    ],
    relatedSlugs: ["gemini", "vertex-ai", "mcp"],
  },

  {
    slug: "mcp",
    name: "MCP",
    category: "Agent Framework",
    metaTitle: "MCP Server Monitoring & Tool Call Tracing | Fluiq",
    metaDescription: "Trace every MCP list_tools and call_tool request. Get tool call latency spans, MCP tool result caching, and server URL attribution, two lines of Python.",
    heroHeadline: "MCP Server Monitoring & Tool Call Tracing",
    heroSub: "Auto-instrument every Model Context Protocol tool call (list_tools, call_tool, and read_resource) with zero code changes. Fluiq also caches repeated MCP tool results to avoid redundant server round-trips.",
    features: [
      { icon: "eye", title: "Tool call tracing", desc: "Every call_tool invocation is a traced span with the MCP server URL, tool name, input arguments, response, and end-to-end latency including server processing time." },
      { icon: "zap", title: "MCP result caching", desc: "Fluiq caches repeated call_tool and list_tools responses keyed by server URL and arguments, identical requests are served instantly without a round-trip to the MCP server." },
      { icon: "cpu", title: "list_tools tracing", desc: "list_tools calls are traced and cached so agents that enumerate available tools on every turn stop paying the network cost after the first request." },
    ],
    setupCode: `import fluiq
fluiq.instrument(api_key="fl_...")  # patches MCP client automatically
fluiq.optimize()                     # also caches repeated tool results

from mcp import ClientSession
from mcp.client.stdio import stdio_client
import asyncio

async def run():
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # list_tools is traced + cached after first call:
            tools = await session.list_tools()

            # call_tool is traced + cached by (tool_name, args):
            result = await session.call_tool(
                "search", {"query": "LLM observability"}
            )

asyncio.run(run())`,
    instrumentedItems: [
      "ClientSession.list_tools()",
      "ClientSession.call_tool()",
      "ClientSession.list_resources()",
      "ClientSession.read_resource()",
      "ClientSession.list_prompts()",
      "ClientSession.get_prompt()",
    ],
    relatedSlugs: ["crewai", "langgraph", "google-adk"],
  },

  // ── Vector Databases ─────────────────────────────────────────────────────
  {
    slug: "pinecone",
    name: "Pinecone",
    category: "Vector Database",
    metaTitle: "Pinecone Monitoring & Vector Database Tracing | Fluiq",
    metaDescription: "Trace every Pinecone query, upsert, and fetch. Get query latency spans, RAG pipeline integration, and result count tracking, two lines of Python.",
    heroHeadline: "Pinecone Monitoring & Vector Query Tracing",
    heroSub: "Auto-instrument every Pinecone index operation (query, upsert, fetch, delete) with zero code changes. Pinecone spans attach as child spans inside your LangChain traces for complete RAG pipeline visibility.",
    features: [
      { icon: "eye", title: "Query latency tracing", desc: "Every index.query() call is a traced span with the number of results, filter metadata, namespace, and end-to-end latency including network time." },
      { icon: "sparkle", title: "RAG pipeline child spans", desc: "Pinecone spans automatically attach as children of LangChain traces, cost and latency roll up to the parent pipeline without any extra configuration." },
      { icon: "zap", title: "Upsert & fetch tracing", desc: "Index upsert, fetch, and delete operations are traced with vector counts and timing, monitor your data pipeline performance alongside query performance." },
    ],
    setupCode: `import fluiq
fluiq.instrument(api_key="fl_...")  # patches Pinecone client automatically

from pinecone import Pinecone
import numpy as np

pc = Pinecone(api_key="your-pinecone-key")
index = pc.Index("my-index")

# All operations traced with latency and result counts:
index.upsert(vectors=[("id1", np.random.rand(1536).tolist(), {"source": "doc"})])

results = index.query(
    vector=np.random.rand(1536).tolist(),
    top_k=5, include_metadata=True
)`,
    instrumentedItems: [
      "Index.query()",
      "Index.query_async()",
      "Index.upsert()",
      "Index.upsert_async()",
      "Index.fetch()",
      "Index.delete()",
      "Index.describe_index_stats()",
      "Index.list()",
    ],
    relatedSlugs: ["langchain", "chroma", "qdrant"],
  },

  {
    slug: "chroma",
    name: "Chroma",
    category: "Vector Database",
    metaTitle: "Chroma (ChromaDB) Monitoring & Vector Search Tracing | Fluiq",
    metaDescription: "Trace every ChromaDB query, add, and update operation. Get collection query spans, RAG pipeline integration, and result count tracking, two lines of Python.",
    heroHeadline: "Chroma (ChromaDB) Monitoring & Query Tracing",
    heroSub: "Auto-instrument every ChromaDB collection operation (query, add, update, get) with zero code changes. Chroma spans integrate as child spans inside LangChain traces for complete RAG observability.",
    features: [
      { icon: "eye", title: "Collection query tracing", desc: "Every collection.query() call is traced with the query text, n_results, where filters, and end-to-end latency including embedding generation time." },
      { icon: "sparkle", title: "RAG pipeline integration", desc: "Chroma spans automatically appear as children inside LangChain traces, full end-to-end RAG pipeline visibility without extra code." },
      { icon: "cpu", title: "Add & update tracing", desc: "Document addition, update, and deletion operations are traced with record counts and timing, monitor ingestion performance alongside query performance." },
    ],
    setupCode: `import fluiq
fluiq.instrument(api_key="fl_...")  # patches ChromaDB automatically

import chromadb

client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("my-docs")

# Add is traced with record count:
collection.add(
    documents=["LLM observability is critical for production AI"],
    ids=["doc1"],
    metadatas=[{"source": "guide"}],
)

# Query is traced with latency and result count:
results = collection.query(
    query_texts=["What is LLM monitoring?"],
    n_results=5,
)`,
    instrumentedItems: [
      "Collection.query()",
      "Collection.add()",
      "Collection.update()",
      "Collection.upsert()",
      "Collection.get()",
      "Collection.delete()",
      "Collection.count()",
      "Client.create_collection()",
    ],
    relatedSlugs: ["pinecone", "qdrant", "weaviate"],
  },

  {
    slug: "weaviate",
    name: "Weaviate",
    category: "Vector Database",
    metaTitle: "Weaviate Monitoring & Vector Search Tracing | Fluiq",
    metaDescription: "Trace every Weaviate query, insert, and batch operation. Near-text and near-vector search spans, RAG pipeline integration, and latency tracking in two lines.",
    heroHeadline: "Weaviate Monitoring & Vector Search Tracing",
    heroSub: "Auto-instrument every Weaviate query and insert (near-text, near-vector, and batch operations) with zero code changes. Weaviate spans integrate as child spans inside LangChain traces for full RAG pipeline visibility.",
    features: [
      { icon: "eye", title: "Vector search tracing", desc: "Weaviate query.get() and near-text/near-vector searches are traced with the class, properties, filters, and end-to-end latency including Weaviate server time." },
      { icon: "sparkle", title: "Batch insert tracing", desc: "Bulk inserts via client.batch are traced with item counts, batch size, and total latency, monitor data pipeline throughput alongside query performance." },
      { icon: "cpu", title: "RAG child spans", desc: "Weaviate spans automatically appear as children of LangChain traces, see retrieval latency, result counts, and cost attribution rolled up into the parent RAG trace." },
    ],
    setupCode: `import fluiq
fluiq.instrument(api_key="fl_...")  # patches Weaviate client automatically

import weaviate

client = weaviate.connect_to_local()

# Near-text search is traced with latency and result counts:
result = (
    client.query
    .get("Article", ["title", "content", "source"])
    .with_near_text({"concepts": ["AI observability", "LLM monitoring"]})
    .with_limit(5)
    .with_additional(["distance"])
    .do()
)

# Batch insert is traced with item count:
with client.batch.dynamic() as batch:
    batch.add_object({"title": "Fluiq Guide", "content": "..."})`,
    instrumentedItems: [
      "client.query.get().do()",
      "client.query.get().with_near_text().do()",
      "client.query.get().with_near_vector().do()",
      "client.data_object.create()",
      "client.batch.add_data_object()",
      "client.schema.create_class()",
      "client.data_object.get_by_id()",
    ],
    relatedSlugs: ["pinecone", "chroma", "qdrant"],
  },

  {
    slug: "faiss",
    name: "FAISS",
    category: "Vector Database",
    metaTitle: "FAISS Index Monitoring & Vector Search Tracing | Fluiq",
    metaDescription: "Trace every FAISS index search, add, and batch operation. Get search latency spans, k-NN result tracking, and RAG pipeline integration, two lines of Python.",
    heroHeadline: "FAISS Index Monitoring & Search Tracing",
    heroSub: "Auto-instrument every FAISS index operation (search, add, and batch queries) with zero code changes. FAISS spans integrate as child spans inside LangChain traces for complete in-memory RAG pipeline observability.",
    features: [
      { icon: "eye", title: "Index search tracing", desc: "Every index.search() call is a traced span with the number of query vectors, k value, index type, and end-to-end latency for profiling in-memory search performance." },
      { icon: "zap", title: "Add operation tracing", desc: "index.add() and index.add_with_ids() are traced with vector counts and timing, measure ingestion throughput as your index grows." },
      { icon: "sparkle", title: "RAG pipeline child spans", desc: "FAISS spans appear as children inside LangChain traces, see how in-memory retrieval latency compares to LLM call time in your RAG pipeline." },
    ],
    setupCode: `import fluiq
fluiq.instrument(api_key="fl_...")  # patches FAISS index operations

import faiss
import numpy as np

dimension = 1536  # text-embedding-3-small output size
index = faiss.IndexFlatL2(dimension)

# Add is traced with vector count and timing:
embeddings = np.random.rand(1000, dimension).astype("float32")
index.add(embeddings)

# Search is traced with k, latency, and index type:
query = np.random.rand(1, dimension).astype("float32")
distances, indices = index.search(query, k=5)`,
    instrumentedItems: [
      "IndexFlat.search() and subclasses",
      "IndexFlat.add() / add_with_ids()",
      "IndexIVF.search() / train()",
      "IndexHNSWFlat.search()",
      "IndexIVFPQ.search()",
      "faiss.write_index() / read_index()",
    ],
    relatedSlugs: ["langchain", "chroma", "qdrant"],
  },

  {
    slug: "qdrant",
    name: "Qdrant",
    category: "Vector Database",
    metaTitle: "Qdrant Monitoring & Vector Database Tracing | Fluiq",
    metaDescription: "Trace every Qdrant search, upsert, and scroll operation. Get search latency spans, payload filter tracing, and RAG pipeline integration, two lines of Python.",
    heroHeadline: "Qdrant Monitoring & Vector Search Tracing",
    heroSub: "Auto-instrument every Qdrant search, upsert, and scroll call, with zero code changes. Qdrant spans integrate as child spans inside LangChain traces for full RAG pipeline visibility.",
    features: [
      { icon: "eye", title: "Search & scroll tracing", desc: "client.search() and client.scroll() are traced with collection name, filter params, limit, latency, and result counts, full visibility into retrieval performance." },
      { icon: "cpu", title: "Upsert tracing", desc: "Batch upsert operations are traced with point counts, vector dimensionality, and total timing, monitor ingestion throughput alongside query performance." },
      { icon: "sparkle", title: "RAG pipeline child spans", desc: "Qdrant spans appear as children inside LangChain traces, cost and latency roll up to the parent RAG trace automatically." },
    ],
    setupCode: `import fluiq
fluiq.instrument(api_key="fl_...")  # patches Qdrant client automatically

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import numpy as np

client = QdrantClient("localhost", port=6333)
client.create_collection("my-collection",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE))

# Upsert is traced with point count:
client.upsert("my-collection", points=[
    PointStruct(id=1, vector=np.random.rand(1536).tolist(),
                payload={"source": "doc1"}),
])

# Search is traced with filters, limit, and latency:
results = client.search("my-collection",
    query_vector=np.random.rand(1536).tolist(), limit=5)`,
    instrumentedItems: [
      "QdrantClient.search()",
      "QdrantClient.search_batch()",
      "QdrantClient.upsert()",
      "QdrantClient.scroll()",
      "QdrantClient.delete()",
      "QdrantClient.create_collection()",
      "QdrantClient.get_collection()",
      "AsyncQdrantClient.search()",
    ],
    relatedSlugs: ["pinecone", "weaviate", "chroma"],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript SDK equivalents.
//
// Keyed by slug. Only integrations supported by @fluiq/sdk appear here — Python
// has more integrations than TypeScript, so e.g. CrewAI is intentionally absent
// and its page stays Python-only (no language toggle is shown).
// ─────────────────────────────────────────────────────────────────────────────
export interface IntegrationTs {
  setupCode: string
  instrumentedItems: string[]
}

export const INTEGRATION_TS: Record<string, IntegrationTs> = {
  openai: {
    setupCode: `import fluiq from "@fluiq/sdk";
fluiq.instrument({ apiKey: "fl_..." }); // patches the openai package

import OpenAI from "openai";
const client = new OpenAI();

// All of these are traced automatically, with no code changes:
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello" }],
});
const embedding = await client.embeddings.create({
  model: "text-embedding-3-small",
  input: "Hello world",
});`,
    instrumentedItems: [
      "client.chat.completions.create()",
      "client.chat.completions.stream()",
      "client.responses.create()",
      "client.beta.chat.completions.parse()",
      "client.embeddings.create()",
      "client.images.generate()",
      "client.audio.transcriptions.create()",
      "client.audio.speech.create()",
    ],
  },

  anthropic: {
    setupCode: `import fluiq from "@fluiq/sdk";
fluiq.instrument({ apiKey: "fl_..." }); // patches @anthropic-ai/sdk

import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();

// Messages API, fully traced with cache visibility:
const message = await client.messages.create({
  model: "claude-opus-4-8",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Summarise this document" }],
});

// Streaming is also traced:
const stream = client.messages.stream({
  model: "claude-opus-4-8",
  max_tokens: 256,
  messages: [{ role: "user", content: "Hello" }],
});
for await (const event of stream) {
  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
    process.stdout.write(event.delta.text);
  }
}`,
    instrumentedItems: [
      "client.messages.create()",
      "client.messages.stream()",
      "client.beta.messages.create()",
      "client.beta.messages.stream()",
      "client.messages.countTokens()",
    ],
  },

  gemini: {
    setupCode: `import fluiq from "@fluiq/sdk";
fluiq.instrument({ apiKey: "fl_..." }); // patches @google/genai

import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: "your-gemini-key" });

// Traced automatically, sync and streaming:
const response = await ai.models.generateContent({
  model: "gemini-2.5-pro",
  contents: "Explain LLM observability in one paragraph",
});

// Streaming is also traced:
const stream = await ai.models.generateContentStream({
  model: "gemini-2.5-pro",
  contents: "Write a haiku",
});
for await (const chunk of stream) {
  process.stdout.write(chunk.text ?? "");
}`,
    instrumentedItems: [
      "ai.models.generateContent()",
      "ai.models.generateContentStream()",
      "ai.models.embedContent()",
      "ai.models.countTokens()",
    ],
  },

  "vertex-ai": {
    setupCode: `import fluiq from "@fluiq/sdk";
fluiq.instrument({ apiKey: "fl_..." }); // patches @google/genai (Vertex mode)

import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({
  vertexai: true,
  project: "my-gcp-project",
  location: "us-central1",
});

// Traced automatically with cost at Vertex AI rates:
const response = await ai.models.generateContent({
  model: "gemini-2.5-pro",
  contents: "Summarise this enterprise document",
});`,
    instrumentedItems: [
      "ai.models.generateContent() (Vertex mode)",
      "ai.models.generateContentStream()",
      "ai.models.embedContent()",
      "ai.models.countTokens()",
    ],
  },

  langchain: {
    setupCode: `import fluiq from "@fluiq/sdk";
fluiq.instrument({ apiKey: "fl_..." }); // patches LangChain

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const llm = new ChatOpenAI({ model: "gpt-4o" });
const prompt = ChatPromptTemplate.fromTemplate("Summarise this: {text}");
const chain = prompt.pipe(llm).pipe(new StringOutputParser());

// Every step is a separate trace span with cost:
const result = await chain.invoke({ text: "Your document content here" });`,
    instrumentedItems: [
      "BaseChatModel.invoke() / stream()",
      "Runnable.invoke() / batch()",
      "RunnableSequence.invoke()",
      "Tool.invoke()",
      "BaseRetriever.invoke()",
      "Embeddings.embedDocuments()",
      "Embeddings.embedQuery()",
    ],
  },

  langgraph: {
    setupCode: `import fluiq from "@fluiq/sdk";
fluiq.instrument({ apiKey: "fl_..." }); // patches LangGraph

import { StateGraph, START, END, Annotation } from "@langchain/langgraph";

const AgentState = Annotation.Root({
  messages: Annotation<string[]>(),
});

const graph = new StateGraph(AgentState)
  .addNode("planner", plannerNode)
  .addNode("executor", executorNode)
  .addConditionalEdges("planner", routeFn, { execute: "executor", end: END })
  .addEdge(START, "planner")
  .compile();

// Each node becomes a traced span, with no code changes:
const result = await graph.invoke({ messages: ["Analyse sales data"] });`,
    instrumentedItems: [
      "CompiledGraph.invoke()",
      "CompiledGraph.stream()",
      "Node function calls (any addNode target)",
      "Conditional edge routing functions",
      "Checkpointer (MemorySaver) operations",
      "Subgraph invocations",
    ],
  },

  "google-adk": {
    setupCode: `import fluiq from "@fluiq/sdk";
fluiq.instrument({ apiKey: "fl_..." }); // patches @google/adk + @google/genai

import { LlmAgent } from "@google/adk";

function getWeather(city: string) {
  return { temperature: 22, condition: "Sunny" };
}

const agent = new LlmAgent({
  name: "weather-agent",
  model: "gemini-2.5-pro",
  instruction: "You are a helpful weather assistant.",
  tools: [getWeather],
});

// Every ADK agent step, tool call, and underlying Gemini request
// is traced automatically. No manual spans required.`,
    instrumentedItems: [
      "LlmAgent run + step events",
      "Agent tool function calls",
      "@google/genai generateContent() (underlying model)",
      "Session service operations",
      "Memory service operations",
    ],
  },

  mcp: {
    setupCode: `import fluiq from "@fluiq/sdk";
fluiq.instrument({ apiKey: "fl_..." }); // patches the MCP client
fluiq.optimize();                       // also caches repeated tool results

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({ command: "node", args: ["server.js"] });
const client = new Client({ name: "my-app", version: "1.0.0" });
await client.connect(transport);

// listTools is traced + cached after first call:
const tools = await client.listTools();

// callTool is traced + cached by (tool name, args):
const result = await client.callTool({
  name: "search",
  arguments: { query: "LLM observability" },
});`,
    instrumentedItems: [
      "client.connect() (initialize)",
      "client.listTools()",
      "client.callTool()",
      "client.listResources()",
      "client.readResource()",
      "client.listPrompts()",
    ],
  },

  pinecone: {
    setupCode: `import fluiq from "@fluiq/sdk";
fluiq.instrument({ apiKey: "fl_..." }); // patches @pinecone-database/pinecone

import { Pinecone } from "@pinecone-database/pinecone";
const pc = new Pinecone({ apiKey: "your-pinecone-key" });
const index = pc.index("my-index");

// All operations traced with latency and result counts:
await index.upsert([{ id: "id1", values: vector, metadata: { source: "doc" } }]);

const results = await index.query({
  vector,
  topK: 5,
  includeMetadata: true,
});`,
    instrumentedItems: [
      "index.query()",
      "index.upsert()",
      "index.fetch()",
      "index.update()",
      "index.deleteMany() / deleteOne()",
      "index.describeIndexStats()",
    ],
  },

  chroma: {
    setupCode: `import fluiq from "@fluiq/sdk";
fluiq.instrument({ apiKey: "fl_..." }); // patches chromadb

import { ChromaClient } from "chromadb";
const client = new ChromaClient();
const collection = await client.getOrCreateCollection({ name: "my-docs" });

// Add is traced with record count:
await collection.add({
  ids: ["doc1"],
  documents: ["LLM observability is critical for production AI"],
  metadatas: [{ source: "guide" }],
});

// Query is traced with latency and result count:
const results = await collection.query({
  queryTexts: ["What is LLM monitoring?"],
  nResults: 5,
});`,
    instrumentedItems: [
      "collection.query()",
      "collection.add()",
      "collection.update()",
      "collection.upsert()",
      "collection.get()",
      "collection.delete()",
      "collection.count()",
    ],
  },

  weaviate: {
    setupCode: `import fluiq from "@fluiq/sdk";
fluiq.instrument({ apiKey: "fl_..." }); // patches weaviate-client

import weaviate from "weaviate-client";
const client = await weaviate.connectToLocal();
const articles = client.collections.get("Article");

// Near-text search is traced with latency and result counts:
const result = await articles.query.nearText(
  ["AI observability", "LLM monitoring"],
  { limit: 5, returnMetadata: ["distance"] },
);

// Batch insert is traced with item count:
await articles.data.insertMany([
  { title: "Fluiq Guide", content: "..." },
]);`,
    instrumentedItems: [
      "collection.query.nearText()",
      "collection.query.nearVector()",
      "collection.query.fetchObjects()",
      "collection.data.insert()",
      "collection.data.insertMany()",
      "collection.data.deleteMany()",
    ],
  },

  faiss: {
    setupCode: `import fluiq from "@fluiq/sdk";
fluiq.instrument({ apiKey: "fl_..." }); // patches faiss-node

import { IndexFlatL2 } from "faiss-node";

const dimension = 1536; // text-embedding-3-small output size
const index = new IndexFlatL2(dimension);

// Add is traced with vector count and timing:
index.add(embedding);

// Search is traced with k, latency, and index type:
const { distances, labels } = index.search(query, 5);`,
    instrumentedItems: [
      "IndexFlatL2.search()",
      "IndexFlatL2.add()",
      "IndexFlatIP.search()",
      "Index.mergeFrom()",
      "Index.write() / read()",
    ],
  },

  qdrant: {
    setupCode: `import fluiq from "@fluiq/sdk";
fluiq.instrument({ apiKey: "fl_..." }); // patches @qdrant/js-client-rest

import { QdrantClient } from "@qdrant/js-client-rest";
const client = new QdrantClient({ url: "http://localhost:6333" });

// Upsert is traced with point count:
await client.upsert("my-collection", {
  points: [{ id: 1, vector, payload: { source: "doc1" } }],
});

// Search is traced with filters, limit, and latency:
const results = await client.search("my-collection", {
  vector: query,
  limit: 5,
});`,
    instrumentedItems: [
      "client.search()",
      "client.query()",
      "client.upsert()",
      "client.scroll()",
      "client.retrieve()",
      "client.delete()",
    ],
  },
}

// Lookup map slug → { name, category } used by related-integration cards
export const INTEGRATION_META: Record<string, { name: string; category: Category }> = Object.fromEntries(
  INTEGRATIONS.map((i) => [i.slug, { name: i.name, category: i.category }])
)
