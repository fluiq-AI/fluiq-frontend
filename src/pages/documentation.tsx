import { useState } from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowRight02Icon,
  BookOpen01Icon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  Database01Icon,
  DollarCircleIcon,
  Github01Icon,
  Layers01Icon,
  MagicWand01Icon,
  PythonIcon,
  RocketIcon,
  SecurityCheckIcon,
  SparklesIcon,
  TestTube01Icon,
  WorkflowSquare01Icon,
  ZapIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CodeBlock } from "@/components/code-block"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const sections = [
  { id: "quickstart", title: "Quickstart" },
  { id: "tracing", title: "Custom tracing" },
  { id: "integrations", title: "Auto-instrumentation" },
  { id: "agents", title: "Tracing agents" },
  { id: "security", title: "Security scanning" },
  { id: "optimization", title: "Optimization" },
  { id: "cost", title: "Cost analytics" },
  { id: "evaluations", title: "Automated evaluations" },
  { id: "quotas", title: "Tiers & quotas" },
  { id: "configuration", title: "Configuration" },
  { id: "self-hosting", title: "Self-hosting" },
  { id: "next-steps", title: "Next steps" },
]

const integrations = [
  {
    name: "OpenAI",
    blurb: "Patches chat completions, responses, parse, streaming, embeddings, images, and audio — sync and async.",
    code: `import openai
from fluiq import instrument

instrument(api_key="fl_...")

client = openai.OpenAI()
client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)`,
  },
  {
    name: "Anthropic",
    blurb: "Patches the Messages API and the Beta client, sync and async.",
    code: `import anthropic
from fluiq import instrument

instrument(api_key="fl_...")

client = anthropic.Anthropic()
client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=512,
    messages=[{"role": "user", "content": "Hello"}],
)`,
  },
  {
    name: "Gemini & Vertex AI",
    blurb: "Patches google-genai and Vertex AI — generation, streaming, and count_tokens, sync and async.",
    code: `from google import genai
from fluiq import instrument

instrument(api_key="fl_...")

client = genai.Client()
client.models.generate_content(
    model="gemini-2.5-pro",
    contents="Hello",
)`,
  },
  {
    name: "LangChain",
    blurb: "Patches the LangChain runtime so chains, agents, and retrievers emit traces automatically.",
    code: `from langchain_openai import ChatOpenAI
from fluiq import instrument

instrument(api_key="fl_...")

llm = ChatOpenAI(model="gpt-4o")
llm.invoke("Hello")`,
  },
  {
    name: "MCP",
    blurb: "Wraps MCP client initialize so tool calls flowing through Model Context Protocol servers are traced.",
    code: `from fluiq import instrument

instrument(api_key="fl_...")

# Any MCP client.initialize() call is now traced
# alongside the LLM that invokes the tool.`,
  },
]

const RERANKER_SNIPPETS = [
  {
    name: "OpenAI",
    code: `from openai import OpenAI
from fluiq.optimization import HybridReranker

client = OpenAI()
reranker = HybridReranker(fusion="rrf", alpha=0.5)

candidates = vector_store.similarity_search(question, k=20)
result = reranker.rerank(question, [c.page_content for c in candidates], top_k=5)
context = "\\n\\n".join(result.texts)

client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": f"{context}\\n\\n{question}"}],
)`,
  },
  {
    name: "Anthropic",
    code: `import anthropic
from fluiq.optimization import HybridReranker

client = anthropic.Anthropic()
reranker = HybridReranker(fusion="rrf", alpha=0.5)

candidates = vector_store.similarity_search(question, k=20)
result = reranker.rerank(question, [c.page_content for c in candidates], top_k=5)
context = "\\n\\n".join(result.texts)

client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=512,
    messages=[{"role": "user", "content": f"{context}\\n\\n{question}"}],
)`,
  },
  {
    name: "Gemini",
    code: `from google import genai
from fluiq.optimization import HybridReranker

client = genai.Client()
reranker = HybridReranker(fusion="rrf", alpha=0.5)

candidates = vector_store.similarity_search(question, k=20)
result = reranker.rerank(question, [c.page_content for c in candidates], top_k=5)
context = "\\n\\n".join(result.texts)

client.models.generate_content(
    model="gemini-2.5-pro",
    contents=f"{context}\\n\\n{question}",
)`,
  },
  {
    name: "Google ADK",
    code: `from google.adk.agents import Agent
from fluiq.optimization import HybridReranker

reranker = HybridReranker(fusion="rrf", alpha=0.5)

def retrieve(question: str) -> str:
    candidates = vector_store.similarity_search(question, k=20)
    result = reranker.rerank(
        question, [c.page_content for c in candidates], top_k=5
    )
    return "\\n\\n".join(result.texts)

agent = Agent(model="gemini-2.5-pro", tools=[retrieve])`,
  },
  {
    name: "LangGraph",
    code: `from langgraph.graph import StateGraph
from fluiq.optimization import HybridReranker

reranker = HybridReranker(fusion="rrf", alpha=0.5)

def rerank_node(state):
    result = reranker.rerank(
        state["question"], state["candidates"], top_k=5
    )
    return {"context": "\\n\\n".join(result.texts)}

graph = StateGraph(dict)
graph.add_node("rerank", rerank_node)`,
  },
  {
    name: "LangChain",
    code: `from langchain_openai import ChatOpenAI
from fluiq.optimization import HybridReranker

reranker = HybridReranker(fusion="rrf", alpha=0.5)
llm = ChatOpenAI(model="gpt-4o-mini")

candidates = vector_store.similarity_search(question, k=20)
result = reranker.rerank(question, [c.page_content for c in candidates], top_k=5)
context = "\\n\\n".join(result.texts)

llm.invoke(f"{context}\\n\\n{question}")`,
  },
  {
    name: "LlamaIndex",
    code: `from llama_index.llms.openai import OpenAI
from fluiq.optimization import HybridReranker

reranker = HybridReranker(fusion="rrf", alpha=0.5)
llm = OpenAI(model="gpt-4o-mini")

nodes = index.as_retriever(similarity_top_k=20).retrieve(question)
result = reranker.rerank(question, [n.get_content() for n in nodes], top_k=5)
context = "\\n\\n".join(result.texts)

llm.complete(f"{context}\\n\\n{question}")`,
  },
  {
    name: "CrewAI",
    code: `from crewai import Agent
from fluiq.optimization import HybridReranker

reranker = HybridReranker(fusion="rrf", alpha=0.5)

def retrieve_tool(question: str) -> str:
    candidates = vector_store.similarity_search(question, k=20)
    result = reranker.rerank(
        question, [c.page_content for c in candidates], top_k=5
    )
    return "\\n\\n".join(result.texts)

researcher = Agent(
    role="researcher",
    goal="answer with sources",
    tools=[retrieve_tool],
)`,
  },
]

const CACHING_SNIPPETS = [
  {
    name: "OpenAI",
    code: `from openai import OpenAI
from fluiq.optimization import DiskCache, EmbeddingCache, PromptCache

client = OpenAI()
shared = DiskCache(".fluiq-cache")

embed = EmbeddingCache(
    embed_fn=lambda texts: [
        d.embedding
        for d in client.embeddings.create(
            model="text-embedding-3-small", input=texts
        ).data
    ],
    model="text-embedding-3-small",
    backend=shared,
)

ask = PromptCache(
    llm_fn=lambda prompt, **kw: client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        **kw,
    ).choices[0].message.content,
    model="gpt-4o-mini",
    backend=shared,
)

vectors = embed(["chunk one", "chunk two"])      # forwards to OpenAI
vectors = embed(["chunk one", "chunk three"])    # only "chunk three" forwards
answer  = ask("Summarize: ...", temperature=0)   # cached on second call`,
  },
  {
    name: "Anthropic",
    code: `import anthropic
from fluiq.optimization import DiskCache, PromptCache

client = anthropic.Anthropic()
shared = DiskCache(".fluiq-cache")

ask = PromptCache(
    llm_fn=lambda prompt, **kw: client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
        **kw,
    ).content[0].text,
    model="claude-sonnet-4-5",
    backend=shared,
)

answer = ask("Summarize: ...", temperature=0)    # cached on second call`,
  },
  {
    name: "Gemini",
    code: `from google import genai
from fluiq.optimization import DiskCache, EmbeddingCache, PromptCache

client = genai.Client()
shared = DiskCache(".fluiq-cache")

embed = EmbeddingCache(
    embed_fn=lambda texts: [
        e.values
        for e in client.models.embed_content(
            model="text-embedding-004", contents=texts
        ).embeddings
    ],
    model="text-embedding-004",
    backend=shared,
)

ask = PromptCache(
    llm_fn=lambda prompt, **kw: client.models.generate_content(
        model="gemini-2.5-pro", contents=prompt
    ).text,
    model="gemini-2.5-pro",
    backend=shared,
)`,
  },
  {
    name: "Google ADK",
    code: `from google.adk.agents import Agent
from google import genai
from fluiq.optimization import DiskCache, PromptCache

client = genai.Client()
shared = DiskCache(".fluiq-cache")

ask = PromptCache(
    llm_fn=lambda prompt, **kw: client.models.generate_content(
        model="gemini-2.5-pro", contents=prompt
    ).text,
    model="gemini-2.5-pro",
    backend=shared,
)

agent = Agent(model="gemini-2.5-pro", tools=[ask])`,
  },
  {
    name: "LangGraph",
    code: `from langgraph.graph import StateGraph
from langchain_openai import ChatOpenAI
from fluiq.optimization import DiskCache, PromptCache

llm = ChatOpenAI(model="gpt-4o-mini")
shared = DiskCache(".fluiq-cache")

ask = PromptCache(
    llm_fn=lambda prompt, **kw: llm.invoke(prompt).content,
    model="gpt-4o-mini",
    backend=shared,
)

def answer_node(state):
    return {"answer": ask(state["prompt"], temperature=0)}

graph = StateGraph(dict)
graph.add_node("answer", answer_node)`,
  },
  {
    name: "LangChain",
    code: `from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from fluiq.optimization import DiskCache, EmbeddingCache, PromptCache

llm = ChatOpenAI(model="gpt-4o-mini")
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
shared = DiskCache(".fluiq-cache")

embed = EmbeddingCache(
    embed_fn=embeddings.embed_documents,
    model="text-embedding-3-small",
    backend=shared,
)

ask = PromptCache(
    llm_fn=lambda prompt, **kw: llm.invoke(prompt).content,
    model="gpt-4o-mini",
    backend=shared,
)`,
  },
  {
    name: "LlamaIndex",
    code: `from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from fluiq.optimization import DiskCache, EmbeddingCache, PromptCache

llm = OpenAI(model="gpt-4o-mini")
emb = OpenAIEmbedding(model="text-embedding-3-small")
shared = DiskCache(".fluiq-cache")

embed = EmbeddingCache(
    embed_fn=emb.get_text_embedding_batch,
    model="text-embedding-3-small",
    backend=shared,
)

ask = PromptCache(
    llm_fn=lambda prompt, **kw: llm.complete(prompt).text,
    model="gpt-4o-mini",
    backend=shared,
)`,
  },
  {
    name: "CrewAI",
    code: `from crewai import Agent
from openai import OpenAI
from fluiq.optimization import DiskCache, PromptCache

client = OpenAI()
shared = DiskCache(".fluiq-cache")

ask = PromptCache(
    llm_fn=lambda prompt, **kw: client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        **kw,
    ).choices[0].message.content,
    model="gpt-4o-mini",
    backend=shared,
)

researcher = Agent(role="researcher", goal="answer", tools=[ask])`,
  },
]

const AUTO_OPTIMIZE_SNIPPETS = [
  {
    name: "OpenAI",
    code: `from openai import OpenAI
from fluiq.optimization import auto_optimize

client = OpenAI()
opt = auto_optimize(
    embed_fn=lambda texts: [
        d.embedding
        for d in client.embeddings.create(
            model="text-embedding-3-small", input=texts
        ).data
    ],
    llm_fn=lambda prompt, **kw: client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        **kw,
    ).choices[0].message.content,
    embed_model="text-embedding-3-small",
    llm_model="gpt-4o-mini",
    cache_dir=".fluiq-cache",
    rerank="hybrid",
)

vectors = opt.embed(["chunk one", "chunk two"])
top_5   = opt.rerank(question, candidates, top_k=5)
answer  = opt.ask("Summarize: ...", temperature=0)`,
  },
  {
    name: "Anthropic",
    code: `import anthropic
from fluiq.optimization import auto_optimize

client = anthropic.Anthropic()
opt = auto_optimize(
    llm_fn=lambda prompt, **kw: client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
        **kw,
    ).content[0].text,
    llm_model="claude-sonnet-4-5",
    cache_dir=".fluiq-cache",
    rerank="hybrid",
)

top_5  = opt.rerank(question, candidates, top_k=5)
answer = opt.ask("Summarize: ...", temperature=0)`,
  },
  {
    name: "Gemini",
    code: `from google import genai
from fluiq.optimization import auto_optimize

client = genai.Client()
opt = auto_optimize(
    embed_fn=lambda texts: [
        e.values
        for e in client.models.embed_content(
            model="text-embedding-004", contents=texts
        ).embeddings
    ],
    llm_fn=lambda prompt, **kw: client.models.generate_content(
        model="gemini-2.5-pro", contents=prompt
    ).text,
    embed_model="text-embedding-004",
    llm_model="gemini-2.5-pro",
    cache_dir=".fluiq-cache",
    rerank="hybrid",
)

vectors = opt.embed(["chunk one", "chunk two"])
top_5   = opt.rerank(question, candidates, top_k=5)
answer  = opt.ask("Summarize: ...")`,
  },
  {
    name: "Google ADK",
    code: `from google.adk.agents import Agent
from google import genai
from fluiq.optimization import auto_optimize

client = genai.Client()
opt = auto_optimize(
    llm_fn=lambda prompt, **kw: client.models.generate_content(
        model="gemini-2.5-pro", contents=prompt
    ).text,
    llm_model="gemini-2.5-pro",
    cache_dir=".fluiq-cache",
    rerank="hybrid",
)

def retrieve(question: str) -> str:
    candidates = vector_store.similarity_search(question, k=20)
    return "\\n\\n".join(opt.rerank(
        question, [c.page_content for c in candidates], top_k=5
    ).texts)

agent = Agent(model="gemini-2.5-pro", tools=[retrieve, opt.ask])`,
  },
  {
    name: "LangGraph",
    code: `from langgraph.graph import StateGraph
from langchain_openai import ChatOpenAI
from fluiq.optimization import auto_optimize

llm = ChatOpenAI(model="gpt-4o-mini")
opt = auto_optimize(
    llm_fn=lambda prompt, **kw: llm.invoke(prompt).content,
    llm_model="gpt-4o-mini",
    cache_dir=".fluiq-cache",
    rerank="hybrid",
)

def answer_node(state):
    top = opt.rerank(state["question"], state["candidates"], top_k=5)
    context = "\\n\\n".join(top.texts)
    return {"answer": opt.ask(f"{context}\\n\\n{state['question']}", temperature=0)}

graph = StateGraph(dict)
graph.add_node("answer", answer_node)`,
  },
  {
    name: "LangChain",
    code: `from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from fluiq.optimization import auto_optimize

llm = ChatOpenAI(model="gpt-4o-mini")
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
opt = auto_optimize(
    embed_fn=embeddings.embed_documents,
    llm_fn=lambda prompt, **kw: llm.invoke(prompt).content,
    embed_model="text-embedding-3-small",
    llm_model="gpt-4o-mini",
    cache_dir=".fluiq-cache",
    rerank="hybrid",
)

vectors = opt.embed(["chunk one", "chunk two"])
top_5   = opt.rerank(question, [c.page_content for c in candidates], top_k=5)
answer  = opt.ask("Summarize: ...")`,
  },
  {
    name: "LlamaIndex",
    code: `from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from fluiq.optimization import auto_optimize

llm = OpenAI(model="gpt-4o-mini")
emb = OpenAIEmbedding(model="text-embedding-3-small")
opt = auto_optimize(
    embed_fn=emb.get_text_embedding_batch,
    llm_fn=lambda prompt, **kw: llm.complete(prompt).text,
    embed_model="text-embedding-3-small",
    llm_model="gpt-4o-mini",
    cache_dir=".fluiq-cache",
    rerank="hybrid",
)

vectors = opt.embed(["chunk one", "chunk two"])
top_5   = opt.rerank(question, [n.get_content() for n in nodes], top_k=5)
answer  = opt.ask("Summarize: ...")`,
  },
  {
    name: "CrewAI",
    code: `from crewai import Agent
from openai import OpenAI
from fluiq.optimization import auto_optimize

client = OpenAI()
opt = auto_optimize(
    llm_fn=lambda prompt, **kw: client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        **kw,
    ).choices[0].message.content,
    llm_model="gpt-4o-mini",
    cache_dir=".fluiq-cache",
    rerank="hybrid",
)

researcher = Agent(role="researcher", goal="answer", tools=[opt.ask])`,
  },
]

const CONTEXT_SHAPING_SNIPPETS = [
  {
    name: "OpenAI",
    code: `from openai import OpenAI
from fluiq.optimization import auto_optimize

client = OpenAI()
opt = auto_optimize(
    llm_fn=lambda p, **kw: client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": p}], **kw,
    ).choices[0].message.content,
)

shorter = opt.compress(top_5.texts, query=question)
context = opt.pack(shorter, max_tokens=4000)
answer  = opt.ask(f"{context}\\n\\nQuestion: {question}", temperature=0)`,
  },
  {
    name: "Anthropic",
    code: `import anthropic
from fluiq.optimization import auto_optimize

client = anthropic.Anthropic()
opt = auto_optimize(
    llm_fn=lambda p, **kw: client.messages.create(
        model="claude-sonnet-4-5", max_tokens=512,
        messages=[{"role": "user", "content": p}], **kw,
    ).content[0].text,
)

shorter = opt.compress(top_5.texts, query=question)
context = opt.pack(shorter, max_tokens=4000)
answer  = opt.ask(f"{context}\\n\\nQuestion: {question}", temperature=0)`,
  },
  {
    name: "Gemini",
    code: `from google import genai
from fluiq.optimization import auto_optimize

client = genai.Client()
opt = auto_optimize(
    llm_fn=lambda p, **kw: client.models.generate_content(
        model="gemini-2.5-pro", contents=p,
    ).text,
)

shorter = opt.compress(top_5.texts, query=question)
context = opt.pack(shorter, max_tokens=4000)
answer  = opt.ask(f"{context}\\n\\nQuestion: {question}")`,
  },
  {
    name: "Google ADK",
    code: `from google.adk.agents import Agent
from google import genai
from fluiq.optimization import auto_optimize

client = genai.Client()
opt = auto_optimize(
    llm_fn=lambda p, **kw: client.models.generate_content(
        model="gemini-2.5-pro", contents=p,
    ).text,
)

def answer_with_packed_context(question: str) -> str:
    candidates = vector_store.similarity_search(question, k=20)
    top = opt.rerank(question, [c.page_content for c in candidates], top_k=8)
    shorter = opt.compress(top.texts, query=question)
    context = opt.pack(shorter, max_tokens=4000)
    return opt.ask(f"{context}\\n\\nQuestion: {question}")

agent = Agent(model="gemini-2.5-pro", tools=[answer_with_packed_context])`,
  },
  {
    name: "LangGraph",
    code: `from langgraph.graph import StateGraph
from langchain_openai import ChatOpenAI
from fluiq.optimization import auto_optimize

llm = ChatOpenAI(model="gpt-4o-mini")
opt = auto_optimize(llm_fn=lambda p, **kw: llm.invoke(p).content)

def answer_node(state):
    top = opt.rerank(state["question"], state["candidates"], top_k=8)
    shorter = opt.compress(top.texts, query=state["question"])
    context = opt.pack(shorter, max_tokens=4000)
    return {"answer": opt.ask(f"{context}\\n\\n{state['question']}", temperature=0)}

graph = StateGraph(dict)
graph.add_node("answer", answer_node)`,
  },
  {
    name: "LangChain",
    code: `from langchain_openai import ChatOpenAI
from fluiq.optimization import auto_optimize

llm = ChatOpenAI(model="gpt-4o-mini")
opt = auto_optimize(llm_fn=lambda p, **kw: llm.invoke(p).content)

candidates = vector_store.similarity_search(question, k=20)
top = opt.rerank(question, [c.page_content for c in candidates], top_k=8)

shorter = opt.compress(top.texts, query=question)
context = opt.pack(shorter, max_tokens=4000)
answer  = opt.ask(f"{context}\\n\\nQuestion: {question}")`,
  },
  {
    name: "LlamaIndex",
    code: `from llama_index.llms.openai import OpenAI
from fluiq.optimization import auto_optimize

llm = OpenAI(model="gpt-4o-mini")
opt = auto_optimize(llm_fn=lambda p, **kw: llm.complete(p).text)

top = opt.rerank(question, [n.get_content() for n in nodes], top_k=8)
shorter = opt.compress(top.texts, query=question)
context = opt.pack(shorter, max_tokens=4000)
answer  = opt.ask(f"{context}\\n\\nQuestion: {question}")`,
  },
  {
    name: "CrewAI",
    code: `from crewai import Agent
from openai import OpenAI
from fluiq.optimization import auto_optimize

client = OpenAI()
opt = auto_optimize(
    llm_fn=lambda p, **kw: client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": p}], **kw,
    ).choices[0].message.content,
)

def answer(question: str) -> str:
    top = opt.rerank(question, retrieve(question), top_k=8)
    shorter = opt.compress(top.texts, query=question)
    context = opt.pack(shorter, max_tokens=4000)
    return opt.ask(f"{context}\\n\\nQuestion: {question}")

researcher = Agent(role="researcher", goal="answer", tools=[answer])`,
  },
]

const QUERY_TRANSFORMS_SNIPPETS = [
  {
    name: "OpenAI",
    code: `from openai import OpenAI
from fluiq.optimization import auto_optimize

client = OpenAI()
opt = auto_optimize(
    embed_fn=lambda t: [d.embedding for d in client.embeddings.create(
        model="text-embedding-3-small", input=t).data],
    llm_fn=lambda p, **kw: client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": p}], **kw,
    ).choices[0].message.content,
)

# rewrites are cached because we route through opt.prompts
fakes    = opt.hyde("What killed the dinosaurs?")
variants = opt.multi_query("How did the dinosaurs die?", n=4)

candidates = [c for q in variants for c in vector_store.similarity_search(q, k=10)]
top_5      = opt.rerank(question, [c.page_content for c in candidates], top_k=5)`,
  },
  {
    name: "Anthropic",
    code: `import anthropic
from fluiq.optimization import auto_optimize

client = anthropic.Anthropic()
opt = auto_optimize(
    llm_fn=lambda p, **kw: client.messages.create(
        model="claude-sonnet-4-5", max_tokens=512,
        messages=[{"role": "user", "content": p}], **kw,
    ).content[0].text,
)

fakes    = opt.hyde("What killed the dinosaurs?", n=3)
variants = opt.multi_query("How did the dinosaurs die?", n=4)

# embed each fake and fan-out the variants over your vector store, then
# fuse with HybridReranker / RRF.
top_5 = opt.rerank(question, candidates, top_k=5)`,
  },
  {
    name: "Gemini",
    code: `from google import genai
from fluiq.optimization import auto_optimize

client = genai.Client()
opt = auto_optimize(
    embed_fn=lambda t: [e.values for e in client.models.embed_content(
        model="text-embedding-004", contents=t).embeddings],
    llm_fn=lambda p, **kw: client.models.generate_content(
        model="gemini-2.5-pro", contents=p,
    ).text,
)

fakes    = opt.hyde("What killed the dinosaurs?")
variants = opt.multi_query("How did the dinosaurs die?", n=4)

vectors    = opt.embed(fakes + variants)
candidates = [c for v in vectors for c in vector_store.search(v, k=10)]
top_5      = opt.rerank(question, [c.page_content for c in candidates], top_k=5)`,
  },
  {
    name: "Google ADK",
    code: `from google.adk.agents import Agent
from google import genai
from fluiq.optimization import auto_optimize

client = genai.Client()
opt = auto_optimize(
    llm_fn=lambda p, **kw: client.models.generate_content(
        model="gemini-2.5-pro", contents=p,
    ).text,
)

def retrieve(question: str) -> str:
    variants = opt.multi_query(question, n=4)
    pool = [c for q in variants for c in vector_store.similarity_search(q, k=10)]
    top = opt.rerank(question, [c.page_content for c in pool], top_k=5)
    return "\\n\\n".join(top.texts)

agent = Agent(model="gemini-2.5-pro", tools=[retrieve])`,
  },
  {
    name: "LangGraph",
    code: `from langgraph.graph import StateGraph
from langchain_openai import ChatOpenAI
from fluiq.optimization import auto_optimize

llm = ChatOpenAI(model="gpt-4o-mini")
opt = auto_optimize(llm_fn=lambda p, **kw: llm.invoke(p).content)

def fanout_node(state):
    variants = opt.multi_query(state["question"], n=4)
    pool = [c for q in variants for c in vector_store.similarity_search(q, k=10)]
    top  = opt.rerank(state["question"], [c.page_content for c in pool], top_k=5)
    return {"candidates": top.texts}

graph = StateGraph(dict)
graph.add_node("fanout", fanout_node)`,
  },
  {
    name: "LangChain",
    code: `from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from fluiq.optimization import auto_optimize

llm = ChatOpenAI(model="gpt-4o-mini")
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
opt = auto_optimize(
    embed_fn=embeddings.embed_documents,
    llm_fn=lambda p, **kw: llm.invoke(p).content,
)

fakes    = opt.hyde("What killed the dinosaurs?")
variants = opt.multi_query("How did the dinosaurs die?", n=4)

vectors    = opt.embed(fakes)
candidates = [c for v in vectors for c in vector_store.similarity_search_by_vector(v, k=10)]
top_5      = opt.rerank(question, [c.page_content for c in candidates], top_k=5)`,
  },
  {
    name: "LlamaIndex",
    code: `from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from fluiq.optimization import auto_optimize

llm = OpenAI(model="gpt-4o-mini")
emb = OpenAIEmbedding(model="text-embedding-3-small")
opt = auto_optimize(
    embed_fn=emb.get_text_embedding_batch,
    llm_fn=lambda p, **kw: llm.complete(p).text,
)

variants = opt.multi_query(question, n=4)
nodes = [n for q in variants for n in retriever.retrieve(q)]
top_5 = opt.rerank(question, [n.get_content() for n in nodes], top_k=5)`,
  },
  {
    name: "CrewAI",
    code: `from crewai import Agent
from openai import OpenAI
from fluiq.optimization import auto_optimize

client = OpenAI()
opt = auto_optimize(
    llm_fn=lambda p, **kw: client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": p}], **kw,
    ).choices[0].message.content,
)

def expanded_search(question: str) -> str:
    variants = opt.multi_query(question, n=4)
    pool = [c for q in variants for c in retrieve(q)]
    top  = opt.rerank(question, pool, top_k=5)
    return "\\n\\n".join(top.texts)

researcher = Agent(role="researcher", goal="answer", tools=[expanded_search])`,
  },
]

const TOOL_CACHING_SNIPPETS = [
  {
    name: "OpenAI",
    code: `import requests
from openai import OpenAI
from fluiq.optimization import auto_optimize

client = OpenAI()
opt = auto_optimize(
    llm_fn=lambda p, **kw: client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": p}], **kw,
    ).choices[0].message.content,
    cache_dir=".fluiq-cache",
)

opt.register_tool("web_fetch", lambda url: requests.get(url).text)
opt.register_tool("search_db", lambda query, k=5: db.search(query, k=k))

page = opt.tool("web_fetch", url="https://example.com")  # miss -> network
page = opt.tool("web_fetch", url="https://example.com")  # hit  -> instant`,
  },
  {
    name: "Anthropic",
    code: `import requests
import anthropic
from fluiq.optimization import auto_optimize

client = anthropic.Anthropic()
opt = auto_optimize(
    llm_fn=lambda p, **kw: client.messages.create(
        model="claude-sonnet-4-5", max_tokens=512,
        messages=[{"role": "user", "content": p}], **kw,
    ).content[0].text,
    cache_dir=".fluiq-cache",
)

opt.register_tool("web_fetch", lambda url: requests.get(url).text)
page = opt.tool("web_fetch", url="https://example.com")
page = opt.tool("web_fetch", url="https://example.com")  # cached`,
  },
  {
    name: "Gemini",
    code: `import requests
from google import genai
from fluiq.optimization import auto_optimize

client = genai.Client()
opt = auto_optimize(
    llm_fn=lambda p, **kw: client.models.generate_content(
        model="gemini-2.5-pro", contents=p,
    ).text,
    cache_dir=".fluiq-cache",
)

opt.register_tool("web_fetch", lambda url: requests.get(url).text)
opt.register_tool("search_db", lambda query, k=5: db.search(query, k=k))

page = opt.tool("web_fetch", url="https://example.com")
page = opt.tool("web_fetch", url="https://example.com")  # cached`,
  },
  {
    name: "Google ADK",
    code: `import requests
from google.adk.agents import Agent
from fluiq.optimization import auto_optimize

opt = auto_optimize(cache_dir=".fluiq-cache")
opt.register_tool("web_fetch", lambda url: requests.get(url).text)
opt.register_tool("search_db", lambda query, k=5: db.search(query, k=k))

# Bind the cache-wrapped tools through the agent so repeat calls within a
# run \u2014 or across runs when cache_dir is set \u2014 skip the underlying I/O.
def web_fetch(url: str) -> str:
    return opt.tool("web_fetch", url=url)

def search_db(query: str, k: int = 5) -> list:
    return opt.tool("search_db", query=query, k=k)

agent = Agent(model="gemini-2.5-pro", tools=[web_fetch, search_db])`,
  },
  {
    name: "LangGraph",
    code: `import requests
from langgraph.graph import StateGraph
from langchain_openai import ChatOpenAI
from fluiq.optimization import auto_optimize

llm = ChatOpenAI(model="gpt-4o-mini")
opt = auto_optimize(
    llm_fn=lambda p, **kw: llm.invoke(p).content,
    cache_dir=".fluiq-cache",
)
opt.register_tool("web_fetch", lambda url: requests.get(url).text)

def fetch_node(state):
    return {"page": opt.tool("web_fetch", url=state["url"])}

graph = StateGraph(dict)
graph.add_node("fetch", fetch_node)`,
  },
  {
    name: "LangChain",
    code: `import requests
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from fluiq.optimization import auto_optimize

llm = ChatOpenAI(model="gpt-4o-mini")
opt = auto_optimize(
    llm_fn=lambda p, **kw: llm.invoke(p).content,
    cache_dir=".fluiq-cache",
)
opt.register_tool("web_fetch", lambda url: requests.get(url).text)

@tool
def web_fetch(url: str) -> str:
    """Fetch a URL, cached by (name, url)."""
    return opt.tool("web_fetch", url=url)

agent = create_react_agent(llm, tools=[web_fetch])`,
  },
  {
    name: "LlamaIndex",
    code: `import requests
from llama_index.core.tools import FunctionTool
from llama_index.llms.openai import OpenAI
from fluiq.optimization import auto_optimize

llm = OpenAI(model="gpt-4o-mini")
opt = auto_optimize(
    llm_fn=lambda p, **kw: llm.complete(p).text,
    cache_dir=".fluiq-cache",
)
opt.register_tool("web_fetch", lambda url: requests.get(url).text)

web_fetch_tool = FunctionTool.from_defaults(
    fn=lambda url: opt.tool("web_fetch", url=url),
    name="web_fetch",
)`,
  },
  {
    name: "CrewAI",
    code: `import requests
from crewai import Agent
from crewai.tools import tool
from openai import OpenAI
from fluiq.optimization import auto_optimize

client = OpenAI()
opt = auto_optimize(
    llm_fn=lambda p, **kw: client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": p}], **kw,
    ).choices[0].message.content,
    cache_dir=".fluiq-cache",
)
opt.register_tool("web_fetch", lambda url: requests.get(url).text)

@tool("web_fetch")
def web_fetch(url: str) -> str:
    return opt.tool("web_fetch", url=url)

researcher = Agent(role="researcher", goal="answer", tools=[web_fetch])`,
  },
]







function Code({ children }: { children: string }) {
  return <CodeBlock>{children}</CodeBlock>
}

type ProviderSnippet = { name: string; code: string }

function ProviderCode({ snippets }: { snippets: ProviderSnippet[] }) {
  const [selected, setSelected] = useState(snippets[0].name)
  const current = snippets.find((s) => s.name === selected) ?? snippets[0]
  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="font-mono">
            {current.name}
            <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuRadioGroup value={selected} onValueChange={setSelected}>
            {snippets.map((s) => (
              <DropdownMenuRadioItem key={s.name} value={s.name}>
                {s.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Code>{current.code}</Code>
    </div>
  )
}

function Documentation() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Fluiq" className="size-7" />
            <span className="font-heading text-lg font-semibold tracking-tight">Fluiq</span>
            <Badge variant="muted" className="ml-1">Docs</Badge>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link to="/" className="hover:text-foreground">Platform</Link>
            {/*<Link to="/pricing" className="hover:text-foreground">Pricing</Link>*/}
            <Link to="/documentation" className="text-foreground">Documentation</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href="https://github.com/fluiq-AI/fluiq-sdk" target="_blank" rel="noreferrer">
                <HugeiconsIcon icon={Github01Icon} />
                GitHub
              </a>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">
                Get API key
                <HugeiconsIcon icon={ArrowRight02Icon} />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <nav className="sticky top-24 flex flex-col gap-1 text-sm">
            <span className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              On this page
            </span>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 max-w-3xl">
          <div className="mb-10">
            <Badge variant="outline" className="mb-4 gap-1.5 px-3 py-1">
              <HugeiconsIcon icon={BookOpen01Icon} />
              SDK reference
            </Badge>
            <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
              Fluiq Python SDK
            </h1>
            <p className="mt-3 text-muted-foreground">
              Two lines of Python instrument any AI agent or LLM pipeline. Auto-traced integrations for OpenAI, Anthropic, Gemini, LangChain, and MCP, plus a <code className="font-mono text-foreground">@trace</code> decorator for everything else. Retrieval steps are scored automatically by an LLM-as-judge so quality regressions surface alongside cost.
            </p>
          </div>

          <section id="quickstart" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={RocketIcon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Quickstart</h2>
            </div>
            <p className="text-muted-foreground">Install the package, grab an API key, and call <code className="font-mono text-foreground">instrument()</code> once at startup.</p>

            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">1</span>
                <div className="grow">
                  <p className="font-medium">Install</p>
                  <Code>{`pip install fluiq`}</Code>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Prompt-injection and secret detection are included out of the box with no extra dependencies.
                    For full PII scanning (credit cards, SSNs, email addresses, and more) install{" "}
                    <a href="https://microsoft.github.io/presidio/" target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">Microsoft Presidio</a>{" "}
                    and its spaCy language model:
                  </p>
                  <Code>{`pip install presidio-analyzer presidio-anonymizer
python -m spacy download en_core_web_lg`}</Code>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">2</span>
                <div className="grow">
                  <p className="font-medium">Get an API key</p>
                  <p className="text-muted-foreground">
                    Create a free account and copy your key from the dashboard. <Link to="/signup" className="font-medium text-foreground hover:underline">Sign up &rarr;</Link>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">3</span>
                <div className="grow">
                  <p className="font-medium">Instrument once at startup</p>
                  <Code>{`from fluiq import instrument

instrument(api_key="fl_...")

# or else set FLUIQ_API_KEY = "fl_..." in environment variable
# Every OpenAI / Anthropic / Gemini / LangChain / MCP
# call from this point on is traced automatically.`}</Code>
                </div>
              </div>
            </div>
          </section>

          <section id="tracing" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={TestTube01Icon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Custom tracing</h2>
            </div>
            <p className="text-muted-foreground">
              Wrap any Python function with <code className="font-mono text-foreground">@trace</code> to record inputs, outputs, latency, and errors. Async functions are detected and awaited automatically. Nested calls preserve parent / child relationships.
            </p>
            <Code>{`from fluiq import instrument, trace

instrument(api_key="fl_...")

@trace
def retrieve(question: str) -> list[str]:
    return vector_store.similarity_search(question, k=4)

@trace
async def answer(question: str) -> str:
    docs = retrieve(question)                 # nested span
    return await llm.ainvoke(prompt(question, docs))`}</Code>
            <p className="text-sm text-muted-foreground">
              Inputs and outputs are serialized with <code className="font-mono text-foreground">str()</code>. Use <code className="font-mono text-foreground">__repr__</code> on your domain objects to control what shows up in the dashboard.
            </p>

            <p className="font-medium">Custom span names</p>
            <p className="text-sm text-muted-foreground">
              Pass <code className="font-mono text-foreground">name=</code> to override the function name used as the agent identity on the dashboard. Useful when the function name is generic (<code className="font-mono text-foreground">run</code>, <code className="font-mono text-foreground">call</code>) or when you want to group multiple variants under one label.
            </p>
            <Code>{`from fluiq import trace

@trace(name="research_agent")
def run(question: str) -> str:
    ...

@trace(name="research_agent")
async def run_streaming(question: str) -> str:
    ...`}</Code>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
              <p className="font-medium">Fail-open by design</p>
              <p className="mt-1 text-muted-foreground">
                Every span emission is wrapped in a safety guard so a Fluiq SDK error never crashes your application. Network failures, malformed payloads, missing optional dependencies, and dashboard outages are absorbed silently — your <code className="font-mono text-foreground">@trace</code>-decorated function still returns its real result and your provider call still executes as if Fluiq weren't installed. The same guard wraps the auto-instrumentation patches, so a broken integration never breaks the underlying SDK call.
              </p>
            </div>
          </section>

          <section id="integrations" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={SparklesIcon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Auto-instrumentation</h2>
            </div>
            <p className="text-muted-foreground">
              <code className="font-mono text-foreground">instrument()</code> patches every supported provider it can find on import. If a provider isn't installed, the corresponding patch is skipped silently — you never need feature flags.
            </p>
            <div className="grid gap-4">
              {integrations.map((i) => (
                <Card key={i.name}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={PythonIcon} size={14} />
                      <CardTitle className="text-base">{i.name}</CardTitle>
                    </div>
                    <CardDescription>{i.blurb}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Code>{i.code}</Code>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section id="agents" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={WorkflowSquare01Icon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Tracing agents</h2>
            </div>
            <p className="text-muted-foreground">
              An <em>agent</em> in Fluiq is any function or chain you want to monitor as a single unit of work. Wrap your entrypoint with <code className="font-mono text-foreground">@trace</code> so every nested LLM call, tool invocation, and retrieval step is grouped under one root — and aggregated as one row on the Agents dashboard.
            </p>

            <p className="font-medium">Plain Python agents</p>
            <Code>{`from fluiq import instrument, trace

instrument(api_key="fl_...")

@trace
def run_research_agent(question: str) -> str:
    plan = planner(question)              # nested @trace
    docs = retrieve(plan)                 # nested @trace
    return synthesize(question, docs)     # nested @trace`}</Code>
            <p className="text-sm text-muted-foreground">
              Every invocation of <code className="font-mono text-foreground">run_research_agent</code> is rolled up into one row keyed by the function name. Async functions work the same way — <code className="font-mono text-foreground">@trace</code> detects coroutines and awaits them.
            </p>

            <p className="font-medium">LangChain chains and agents</p>
            <Code>{`from langchain.agents import AgentExecutor, create_openai_tools_agent
from fluiq import instrument

instrument(api_key="fl_...")

executor = AgentExecutor(agent=create_openai_tools_agent(...), tools=[...])
executor.invoke({"input": "What's the weather in Paris?"})`}</Code>
            <p className="text-sm text-muted-foreground">
              No decorator needed. The LangChain integration emits a root span for the runnable (e.g. <code className="font-mono text-foreground">AgentExecutor</code>, <code className="font-mono text-foreground">RunnableSequence</code>) and child spans for every internal step. The agent appears on the dashboard under the runnable's class name.
            </p>

            <p className="font-medium">LangGraph graphs</p>
            <Code>{`from langgraph.graph import StateGraph
from fluiq import instrument

instrument(api_key="fl_...")

graph = StateGraph(AgentState)
graph.add_node("planner", planner_node)
graph.add_node("tool_executor", tool_node)
app = graph.compile()
app.invoke({"messages": [...]})`}</Code>
            <p className="text-sm text-muted-foreground">
              Each node emits its own span tagged with <code className="font-mono text-foreground">langgraph_node</code>. On the Agents dashboard you'll see one row per node (e.g. <code className="font-mono text-foreground">planner</code>, <code className="font-mono text-foreground">tool_executor</code>) so you can spot which step of the graph is driving cost.
            </p>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
              <p className="font-medium">How an agent is identified</p>
              <p className="mt-1 text-muted-foreground">
                Fluiq derives the agent key from the root span of each execution, in this priority:
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li><code className="font-mono text-foreground">@trace(name="...")</code> override, when set</li>
                <li><code className="font-mono text-foreground">@trace</code> function name (e.g. <code className="font-mono text-foreground">run_research_agent</code>)</li>
                <li>LangChain runnable name (e.g. <code className="font-mono text-foreground">AgentExecutor</code>)</li>
                <li>LangGraph <code className="font-mono text-foreground">langgraph_node</code> (e.g. <code className="font-mono text-foreground">planner</code>)</li>
                <li>Provider + model for raw, undecorated LLM calls (e.g. <code className="font-mono text-foreground">openai:gpt-4o</code>)</li>
              </ol>
            </div>
          </section>

          <section id="security" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={SecurityCheckIcon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Security scanning</h2>
            </div>
            <p className="text-muted-foreground">
              Every traced prompt and response is scanned automatically for PII, prompt injection, and leaked secrets. Security scanning is on by default and runs entirely in your process — no data leaves your environment for scanning.
            </p>

            <p className="font-medium">What's scanned</p>
            <p className="text-sm text-muted-foreground">
              The scanner inspects the <code className="font-mono text-foreground">input</code> / <code className="font-mono text-foreground">messages</code> field as the <em>prompt</em> and the <code className="font-mono text-foreground">output</code> / <code className="font-mono text-foreground">response</code> field as the <em>response</em>. Three independent scanners run on each:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                <span className="text-foreground">PII scanner</span> — uses{" "}
                <a href="https://microsoft.github.io/presidio/" target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">Microsoft Presidio</a>{" "}
                to detect credit cards, SSNs, IBAN codes, email addresses, phone numbers, IP addresses, names, and five popular API key formats (OpenAI, Anthropic, AWS, GitHub, Stripe).
                Requires <code className="font-mono text-foreground">presidio-analyzer</code>,{" "}
                <code className="font-mono text-foreground">presidio-anonymizer</code>, and a spaCy model (see installation above).
                When the optional dependencies are absent the PII scanner is skipped silently — injection and secret scanning still run.
              </li>
              <li>
                <span className="text-foreground">Prompt-injection scanner</span> — pure Python, no extra dependencies. Detects known jailbreak and instruction-override phrases such as "ignore previous instructions", "you are now", "act as if", "DAN", and more.
              </li>
              <li>
                <span className="text-foreground">Secret scanner</span> — pure Python, no extra dependencies. Matches hardcoded regex patterns for OpenAI, Anthropic, AWS, GitHub, and Stripe keys, and additionally flags any high-entropy token ≥ 20 characters (Shannon entropy {`>`} 4.5 bits) that looks like a bearer token or password.
              </li>
            </ul>

            <p className="font-medium">Risk levels</p>
            <p className="text-sm text-muted-foreground">
              Each scan produces one of four levels, derived from the combined findings across all three scanners:
            </p>
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
            <p className="text-sm text-muted-foreground">
              When the overall risk is <span className="font-medium text-destructive">high</span>, the scanner replaces the original prompt and response fields in the stored trace with redacted versions — PII entities are substituted with their type labels (e.g. <code className="font-mono text-foreground">&lt;CREDIT_CARD&gt;</code>) before the event leaves your process.
            </p>

            <p className="font-medium">What's stored per trace</p>
            <p className="text-sm text-muted-foreground">
              Ten security fields are written into every trace event that passes through the enricher:
            </p>
            <Code>{`{
  "security_risk_level":    "medium",         # clean | low | medium | high
  "security_risk_score":    0.72,             # 0–1.0 composite score
  "pii_entities_prompt":    ["CREDIT_CARD"],  # entity types found in prompt
  "pii_entities_response":  [],
  "injection_detected":     false,
  "injection_patterns":     [],               # matched phrase fragments
  "secrets_detected":       false,
  "secret_types":           [],               # e.g. ["openai_key"]
  "prompt_redacted":        "...",            # redacted copy (PII replaced)
  "response_redacted":      "..."
}`}</Code>

            <p className="font-medium">Dashboard — Security tab</p>
            <p className="text-sm text-muted-foreground">
              Each trace and agent run on the{" "}
              <Link to="/dashboard/traces" className="font-medium text-foreground hover:underline">Traces</Link>{" "}
              and{" "}
              <Link to="/dashboard/agents" className="font-medium text-foreground hover:underline">Agents</Link>{" "}
              pages has a <span className="text-foreground">Security</span> tab in the detail drawer.
              The tab shows the risk level badge, a per-category breakdown (PII / injection / secrets), matched entity types, and a redacted preview of the prompt and response when the risk level is high.
              The trace table also shows a <span className="text-foreground">Security</span> column — green for clean, amber for low/medium, red for high — so risky traces are visible at a glance without opening the drawer.
            </p>

            <p className="font-medium">Disabling scanning</p>
            <Code>{`from fluiq import instrument

instrument(api_key="fl_...", security_scan=False)`}</Code>
            <p className="text-sm text-muted-foreground">
              Pass <code className="font-mono text-foreground">security_scan=False</code> to skip all three scanners. Useful for offline testing, high-throughput batch pipelines where latency matters, or environments where prompts are known-safe. All other tracing behaviour is unchanged.
            </p>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
              <p className="font-medium">Fail-open by design</p>
              <p className="mt-1 text-muted-foreground">
                Like the rest of the SDK, the security enricher never raises. If Presidio is missing, if a scan throws, or if the enricher encounters an unexpected event shape, it returns the original trace unchanged. Your LLM call is unaffected.
              </p>
            </div>
          </section>

          <section id="optimization" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={MagicWand01Icon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Optimization</h2>
            </div>
            <p className="text-muted-foreground">
              <code className="font-mono text-foreground">fluiq.optimization</code> ships rerankers and caches that drop into any RAG pipeline with no extra service. Both modules are free on every tier and run entirely in your process. Reach for{" "}
              <code className="font-mono text-foreground">auto_optimize()</code> if you want one call that wires everything together, or compose the pieces by hand below.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <HugeiconsIcon icon={ZapIcon} size={16} />
              <p className="font-medium">Auto-optimize (one call)</p>
            </div>
            <p className="text-sm text-muted-foreground">
              <code className="font-mono text-foreground">auto_optimize()</code> returns an{" "}
              <code className="font-mono text-foreground">OptimizedRAG</code> bundle with a shared cache backend, an embedding cache, a prompt cache, a document cache, and a reranker — all wired together with sensible defaults. Pass your{" "}
              <code className="font-mono text-foreground">embed_fn</code> and{" "}
              <code className="font-mono text-foreground">llm_fn</code>; everything else is optional.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                <code className="font-mono text-foreground">cache_dir=".fluiq-cache"</code> uses{" "}
                <code className="font-mono text-foreground">DiskCache</code> so hits survive process restarts; omit it for an in-memory LRU.
              </li>
              <li>
                <code className="font-mono text-foreground">rerank="hybrid"</code> is the default and falls back to{" "}
                <code className="font-mono text-foreground">BM25</code> with a warning when{" "}
                <code className="font-mono text-foreground">sentence-transformers</code> isn't installed, so the call always returns a working bundle. Use{" "}
                <code className="font-mono text-foreground">"bm25"</code>,{" "}
                <code className="font-mono text-foreground">"cross-encoder"</code>, or{" "}
                <code className="font-mono text-foreground">None</code> to override.
              </li>
              <li>
                <code className="font-mono text-foreground">trace="auto"</code> (default) emits cache spans only after{" "}
                <code className="font-mono text-foreground">fluiq.instrument()</code> has been called, so the bundle stays silent in offline scripts and lights up the dashboard hit-rate card in production.
              </li>
            </ul>
            <ProviderCode snippets={AUTO_OPTIMIZE_SNIPPETS} />
            <p className="text-sm text-muted-foreground">
              The bundle exposes the raw components too —{" "}
              <code className="font-mono text-foreground">opt.backend</code>,{" "}
              <code className="font-mono text-foreground">opt.embeddings</code>,{" "}
              <code className="font-mono text-foreground">opt.prompts</code>,{" "}
              <code className="font-mono text-foreground">opt.documents</code>,{" "}
              <code className="font-mono text-foreground">opt.reranker</code> — so you can mix the auto wiring with hand-tuned components when you outgrow the defaults.
            </p>

            <div className="flex items-center gap-2 pt-4">
              <HugeiconsIcon icon={Layers01Icon} size={16} />
              <p className="font-medium">Rerankers</p>
            </div>
            <p className="text-sm text-muted-foreground">
              After your vector store returns the top-K candidates, a reranker sorts them by query relevance before you stuff them into the LLM context. Fluiq ships four:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                <code className="font-mono text-foreground">BM25Reranker</code> —{" "}
                <span className="text-foreground">keyword</span>. Pure-Python Okapi BM25, no extra dependencies. Best when query and corpus share vocabulary (code search, legal, product catalogs).
              </li>
              <li>
                <code className="font-mono text-foreground">CrossEncoderReranker</code> —{" "}
                <span className="text-foreground">semantic</span>. Defaults to <code className="font-mono text-foreground">cross-encoder/ms-marco-MiniLM-L-6-v2</code>. Captures paraphrase and intent; install with <code className="font-mono text-foreground">pip install fluiq[rerank]</code>.
              </li>
              <li>
                <code className="font-mono text-foreground">HybridReranker</code> —{" "}
                <span className="text-foreground">hybrid</span>. Fuses both via Reciprocal Rank Fusion (default) or weighted score blending. The <code className="font-mono text-foreground">alpha</code> knob trades lexical vs. semantic.
              </li>
              <li>
                <code className="font-mono text-foreground">MMRReranker</code> —{" "}
                <span className="text-foreground">diversity-aware</span>. Wraps any of the above and re-selects with Maximal Marginal Relevance so the top-K isn't dominated by near-duplicates. Pass <code className="font-mono text-foreground">embed_fn=...</code> to upgrade redundancy scoring from token overlap to cosine, and tune the relevance/diversity tradeoff via <code className="font-mono text-foreground">lambda_mult</code>.
              </li>
            </ul>
            <ProviderCode snippets={RERANKER_SNIPPETS} />
            <p className="text-sm text-muted-foreground">
              <code className="font-mono text-foreground">result.documents</code> exposes per-item <code className="font-mono text-foreground">index</code>, <code className="font-mono text-foreground">document</code>, and <code className="font-mono text-foreground">score</code> if you want to keep the original payloads.
            </p>

            <div className="flex items-center gap-2 pt-4">
              <HugeiconsIcon icon={Database01Icon} size={16} />
              <p className="font-medium">Caching</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Three specialized caches dedupe the expensive parts of a RAG pipeline. All share two pluggable backends: <code className="font-mono text-foreground">InMemoryCache</code> (LRU + TTL) and <code className="font-mono text-foreground">DiskCache</code> (file-backed, survives restarts).
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                <code className="font-mono text-foreground">EmbeddingCache</code> — wraps any{" "}
                <code className="font-mono text-foreground">embed_fn(texts) {"-> "}vectors</code>. Only cache misses are forwarded to the model; the same texts in different orders all hit the cache.
              </li>
              <li>
                <code className="font-mono text-foreground">PromptCache</code> — caches LLM responses by{" "}
                <code className="font-mono text-foreground">(model, prompt, params)</code>. Sampling settings are part of the key, so <code className="font-mono text-foreground">temperature=0</code> and <code className="font-mono text-foreground">temperature=1</code> get separate slots.
              </li>
              <li>
                <code className="font-mono text-foreground">DocumentCache</code> — caches preprocessed / chunked documents by source id. Skip re-chunking on notebook reloads, repeated CI runs, and batch reindex jobs.
              </li>
              <li>
                <code className="font-mono text-foreground">ToolCache</code> — caches deterministic agent-tool results by{" "}
                <code className="font-mono text-foreground">(name, kwargs)</code>. Drop-in for web fetches, DB reads, code interpreters, retrieval calls. Register tools once, then call through the cache so repeat invocations skip the underlying I/O.
              </li>
            </ul>
            <ProviderCode snippets={CACHING_SNIPPETS} />
            <p className="text-sm text-muted-foreground">
              Backends are interchangeable — start with <code className="font-mono text-foreground">InMemoryCache</code> for ephemeral runs, swap in <code className="font-mono text-foreground">DiskCache</code> when you want hits across processes, or implement <code className="font-mono text-foreground">BaseCache</code> against Redis / Memcached for shared multi-host caches.
            </p>

            <div className="flex items-center gap-2 pt-4">
              <HugeiconsIcon icon={WorkflowSquare01Icon} size={16} />
              <p className="font-medium">Context shaping</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Two helpers sit between the reranker and the LLM.{" "}
              <code className="font-mono text-foreground">pack_context</code> greedily fits chunks into a token budget and can reorder them with <code className="font-mono text-foreground">reorder="lost-in-middle"</code> to mitigate the empirical attention dropoff in the middle of long contexts.{" "}
              <code className="font-mono text-foreground">compress_context</code> drops sentences with no query-term overlap so each chunk costs fewer tokens. Both are pure-Python and have no extra dependencies; pass a custom <code className="font-mono text-foreground">count_tokens</code> or <code className="font-mono text-foreground">scorer</code> when you want production-grade accuracy.
            </p>
            <ProviderCode snippets={CONTEXT_SHAPING_SNIPPETS} />
            <p className="text-sm text-muted-foreground">
              The auto-bundle exposes both as <code className="font-mono text-foreground">opt.compress(...)</code> and <code className="font-mono text-foreground">opt.pack(...)</code>; <code className="font-mono text-foreground">opt.pack</code> defaults to <code className="font-mono text-foreground">reorder="lost-in-middle"</code> so the common path stays one call.
            </p>

            <div className="flex items-center gap-2 pt-4">
              <HugeiconsIcon icon={SparklesIcon} size={16} />
              <p className="font-medium">Query transforms</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Help the vector store find the right chunks by rewriting the question before retrieval.{" "}
              <code className="font-mono text-foreground">HyDE</code> generates a hypothetical answer and embeds <em>that</em> — the fake answer sits closer in embedding space to real evidence than the raw question does, often lifting recall by 10–20% on factoid corpora.{" "}
              <code className="font-mono text-foreground">MultiQuery</code> fans the question out into N paraphrases for fusion-style retrieval. Both accept any <code className="font-mono text-foreground">llm_fn</code>; pass <code className="font-mono text-foreground">opt.prompts</code> so identical questions reuse cached rewrites.
            </p>
            <ProviderCode snippets={QUERY_TRANSFORMS_SNIPPETS} />

            <div className="flex items-center gap-2 pt-4">
              <HugeiconsIcon icon={Database01Icon} size={16} />
              <p className="font-medium">Tool caching for agents</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Agents call the same deterministic tools repeatedly — the same URL, the same SQL, the same retrieval. <code className="font-mono text-foreground">ToolCache</code> sits in front of those calls and dedupes them by{" "}
              <code className="font-mono text-foreground">(name, kwargs)</code> against the same shared backend the rest of the bundle uses, so cache hits survive across agent runs whenever you persist with <code className="font-mono text-foreground">cache_dir=...</code>.
            </p>
            <ProviderCode snippets={TOOL_CACHING_SNIPPETS} />

            <div className="flex items-center gap-2 pt-4">
              <HugeiconsIcon icon={TestTube01Icon} size={16} />
              <p className="font-medium">Trace visibility</p>
            </div>
            <p className="text-sm text-muted-foreground">
              When <code className="font-mono text-foreground">auto_optimize(trace="auto")</code> sees that <code className="font-mono text-foreground">fluiq.instrument()</code> has been called, every cache lookup and reranker invocation emits its own span linked to the surrounding <code className="font-mono text-foreground">@trace</code> root. The Traces dashboard renders them with dedicated icons and sublabels so cache hit rates and reranker latency sit alongside your LLM calls — no extra wiring required.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                Cache spans (<code className="font-mono text-foreground">type=cache</code>) carry{" "}
                <code className="font-mono text-foreground">cache_kind</code> (<code className="font-mono text-foreground">embedding</code> /{" "}
                <code className="font-mono text-foreground">prompt</code> /{" "}
                <code className="font-mono text-foreground">document</code> /{" "}
                <code className="font-mono text-foreground">tool</code>) and{" "}
                <code className="font-mono text-foreground">cache_hit</code> so you can chart hit rates per cache.
              </li>
              <li>
                Rerank spans (<code className="font-mono text-foreground">type=rerank</code>) carry{" "}
                <code className="font-mono text-foreground">reranker</code> (BM25 / CrossEncoder / Hybrid / MMR),{" "}
                <code className="font-mono text-foreground">input_count</code>,{" "}
                <code className="font-mono text-foreground">output_count</code>, and{" "}
                <code className="font-mono text-foreground">top_k</code>.
              </li>
              <li>
                Pass <code className="font-mono text-foreground">trace=False</code> to silence the spans (e.g. for offline evaluation runs), or{" "}
                <code className="font-mono text-foreground">trace=True</code> to force them on regardless of whether{" "}
                <code className="font-mono text-foreground">instrument()</code> ran.
              </li>
              <li>
                Hand-built caches get the same visibility — pass{" "}
                <code className="font-mono text-foreground">trace=True</code> to{" "}
                <code className="font-mono text-foreground">EmbeddingCache(...)</code>,{" "}
                <code className="font-mono text-foreground">PromptCache(...)</code>,{" "}
                <code className="font-mono text-foreground">DocumentCache(...)</code>, or{" "}
                <code className="font-mono text-foreground">ToolCache(...)</code>. Reranker spans go through the bundle, so route reranks via{" "}
                <code className="font-mono text-foreground">auto_optimize(rerank=...)</code> (or{" "}
                <code className="font-mono text-foreground">opt.rerank(...)</code>) when you want them on the dashboard.
              </li>
            </ul>
          </section>


          <section id="cost" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={DollarCircleIcon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Cost analytics</h2>
            </div>
            <p className="text-muted-foreground">
              Every traced LLM call is priced server-side using the provider's published rates. Costs are stored to ten decimal places, denominated in USD, and rolled up across whole agent runs.
            </p>

            <p className="font-medium">How costs are computed</p>
            <p className="text-sm text-muted-foreground">
              For each trace with token usage, Fluiq looks up the model in its price catalog and applies:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li><span className="text-foreground">Input tokens</span> × input rate per million</li>
              <li><span className="text-foreground">Cached input tokens</span> × cached rate (subtracted from billable input first)</li>
              <li><span className="text-foreground">Output tokens</span> × output rate per million</li>
              <li><span className="text-foreground">Long-context</span> rates are used automatically when the prompt crosses the model's threshold (e.g. {">"} 200k tokens)</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              If a model isn't in the catalog, the trace is still recorded but its cost shows as <code className="font-mono text-foreground">—</code>. Reach out and we'll add it.
            </p>

            <p className="font-medium">Per-trace cost (Traces page)</p>
            <p className="text-sm text-muted-foreground">
              The <Link to="/dashboard/traces" className="font-medium text-foreground hover:underline">Traces</Link> table shows a <code className="font-mono text-foreground">Cost</code> column for each row. Leaf rows (LLM calls) display the call's own cost; root rows show the rolled-up total of every descendant trace, marked with a small <code className="font-mono text-foreground">Σ</code> badge. Expand a row to see the per-step breakdown.
            </p>

            <p className="font-medium">Per-agent rollup (Agents page)</p>
            <p className="text-sm text-muted-foreground">
              The <Link to="/dashboard/agents" className="font-medium text-foreground hover:underline">Agents</Link> dashboard groups every execution by the agent key described above and reports:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li><span className="text-foreground">Runs</span> — distinct invocations of the agent</li>
              <li><span className="text-foreground">Total cost</span> — sum across the entire history</li>
              <li><span className="text-foreground">Avg / run</span> — useful for spotting drift over time</li>
              <li><span className="text-foreground">Tokens</span> and <span className="text-foreground">avg latency</span> — to correlate cost with throughput</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Sort by total cost to find your most expensive agents in production, or by runs to find your hottest paths.
            </p>
          </section>

          <section id="evaluations" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Automated evaluations</h2>
            </div>
            <p className="text-muted-foreground">
              Every retrieval step Fluiq sees is scored asynchronously by an LLM-as-judge. You don't write evaluator code — instrument once, and quality scores show up next to cost on the same trace.
            </p>

            <p className="font-medium">What gets scored</p>
            <p className="text-sm text-muted-foreground">
              Any trace of <code className="font-mono text-foreground">type=vectorstore</code> (Chroma, Pinecone, pgvector, Weaviate, and any retriever surfaced by the LangChain integration) is queued for evaluation. The judge ranks each retrieved chunk against the user query and emits two metrics:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li><span className="text-foreground">context_relevance</span> — fraction of retrieved chunks the judge considers useful for answering the query (0–1)</li>
              <li><span className="text-foreground">per_chunk usefulness</span> — boolean per chunk, surfaced in the trace drawer with a green check / red cross</li>
            </ul>

            <p className="font-medium">Where they show up</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>The <Link to="/dashboard/traces" className="font-medium text-foreground hover:underline">Traces</Link> table has a <span className="text-foreground">Quality</span> column with a colored pill: green ≥ 0.8, amber ≥ 0.5, red {"<"} 0.5.</li>
              <li>Wrapper rows roll up the <em>worst</em> score across the subtree (marked with a small <code className="font-mono text-foreground">↓</code>) so a bad chunk at any depth surfaces at the root.</li>
              <li>The trace drawer's <span className="text-foreground">Evaluations</span> section lists each metric, the judge's reason, and per-chunk usefulness.</li>
            </ul>

            <p className="font-medium">Cost &amp; quotas</p>
            <p className="text-sm text-muted-foreground">
              Each evaluated retrieval consumes one count from your tier's eval budget (see <a href="#quotas" className="font-medium text-foreground hover:underline">Tiers &amp; quotas</a>). Once you hit the cap, traces continue to ingest normally — only the auto-eval is skipped — so observability never breaks because of a billing limit.
            </p>
          </section>

          <section id="quotas" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={ChartLineData01Icon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Tiers &amp; quotas</h2>
            </div>
            <p className="text-muted-foreground">
              Two counters drive your plan: traces ingested and automated evaluations performed. Counters are lifetime by default, scoped to your workspace, and visible on the <Link to="/dashboard" className="font-medium text-foreground hover:underline">Overview</Link> page in real time.
            </p>

            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Tier</th>
                    <th className="px-4 py-2 font-medium">Traces</th>
                    <th className="px-4 py-2 font-medium">Evaluations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="px-4 py-2 font-medium text-foreground">Free</td>
                    <td className="px-4 py-2 text-muted-foreground">5,000,000 total</td>
                    <td className="px-4 py-2 text-muted-foreground">1,000</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-foreground">Team</td>
                    <td className="px-4 py-2 text-muted-foreground">Unlimited</td>
                    <td className="px-4 py-2 text-muted-foreground">10,000</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-foreground">Growth</td>
                    <td className="px-4 py-2 text-muted-foreground">Unlimited</td>
                    <td className="px-4 py-2 text-muted-foreground">100,000</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-foreground">Enterprise</td>
                    <td className="px-4 py-2 text-muted-foreground">Unlimited</td>
                    <td className="px-4 py-2 text-muted-foreground">Unlimited</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="font-medium">What happens at the limit</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li><span className="text-foreground">Traces</span> — once a Free workspace exceeds 5M traces, <code className="font-mono text-foreground">/ingest</code> returns <code className="font-mono text-foreground">402 Payment Required</code> and the SDK drops the span. Upgrade to Team or higher for unlimited tracing.</li>
              <li><span className="text-foreground">Evaluations</span> — when the eval budget is exhausted, traces still ingest normally; only the auto-eval is skipped. No hard error is raised.</li>
            </ul>

            <p className="font-medium">Tracking usage</p>
            <p className="text-sm text-muted-foreground">
              The dashboard's <Link to="/dashboard" className="font-medium text-foreground hover:underline">Overview</Link> page shows live progress bars for both counters, fed by <code className="font-mono text-foreground">GET /api/v1/quota</code>. The same endpoint is auth-gated and safe to poll from your own tooling.
            </p>

            <p className="font-medium">Upgrading</p>
            <p className="text-sm text-muted-foreground">
              The Plan row on Overview and Profile has an <span className="text-foreground">Upgrade</span> button that jumps to the next tier on the <Link to="/pricing" className="font-medium text-foreground hover:underline">pricing page</Link>, or to the comparison view if you want to skip ahead. Enterprise customers get unlimited everything plus VPC / on-prem deployment — <Link to="/pricing#contact" className="font-medium text-foreground hover:underline">contact sales</Link>.
            </p>
          </section>


          <section id="configuration" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={ZapIcon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Configuration</h2>
            </div>
            <p className="text-muted-foreground">
              <code className="font-mono text-foreground">instrument()</code> accepts three parameters. Only <code className="font-mono text-foreground">api_key</code> is required.
            </p>
            <Code>{`def instrument(
    api_key: str,
    *,
    version: str = "v1",
    endpoint: str = "https://api.getfluiq.com/api",
    security_scan: bool = True,
) -> None: ...`}</Code>
            <div className="grid gap-3 text-sm">
              {[
                { name: "api_key", required: true, body: "Your workspace API key. Find it in the dashboard under Settings → API keys." },
                { name: "version", required: false, body: "Trace schema version. Pin this in production so server-side schema bumps are opt-in." },
                { name: "endpoint", required: false, body: "Override the ingest URL. Point this at your VPC deployment for self-hosted setups." },
                { name: "security_scan", required: false, body: "Enable or disable automatic PII, injection, and secret scanning on every trace. Defaults to True. Set False to skip scanning entirely — useful for high-throughput batch pipelines where the overhead isn't needed." },
              ].map((p) => (
                <div key={p.name} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-foreground/70" />
                  <div>
                    <p className="font-mono text-sm text-foreground">
                      {p.name}
                      {p.required ? (
                        <Badge variant="muted" className="ml-2">required</Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2">optional</Badge>
                      )}
                    </p>
                    <p className="mt-1 text-muted-foreground">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              The SDK reads no environment variables on its own — wire <code className="font-mono text-foreground">os.getenv("FLUIQ_API_KEY")</code> in if you want one.
            </p>
          </section>

          <section id="self-hosting" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Github01Icon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Self-hosting</h2>
            </div>
            <p className="text-muted-foreground">
              The SDK is open source. Point it at your own ingest service by passing a custom <code className="font-mono text-foreground">endpoint</code>.
            </p>
            <Code>{`from fluiq import instrument

instrument(
    api_key="fl_...",
    endpoint="https://traces.internal.acme.com/api",
)`}</Code>
            <p className="text-sm text-muted-foreground">
              VPC and on-prem deployments of the Fluiq backend are part of the Enterprise tier. <Link to="/pricing" className="font-medium text-foreground hover:underline">See pricing &rarr;</Link>
            </p>
          </section>

          <section id="next-steps" className="mt-16 scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={RocketIcon} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Next steps</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Open the dashboard</CardTitle>
                  <CardDescription>Watch traces stream in, inspect costs by node, and configure Slack alerts.</CardDescription>
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
                  <CardTitle className="text-base">Add the GitHub Action</CardTitle>
                  <CardDescription>Gate every PR on hallucination, faithfulness, and relevancy thresholds.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="https://github.com/fluiq-AI/fluiq-sdk" target="_blank" rel="noreferrer">
                      <HugeiconsIcon icon={Github01Icon} />
                      View on GitHub
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default Documentation

