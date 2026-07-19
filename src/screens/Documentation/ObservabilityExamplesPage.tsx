"use client"

import { ChartLineData01Icon } from "@hugeicons/core-free-icons"
import { IntegrationTabs, PageHeading, type CodeTab } from "./_docComponents"

const pythonTabs: CodeTab[] = [
  {
    label: "OpenAI",
    description: "Patches chat completions, streaming, embeddings, images, and audio, sync and async.",
    code: `import openai
from fluiq import instrument

instrument(api_key="fl_...")

client = openai.OpenAI()

# Chat completions: traced automatically
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Summarise this document"}],
)

# Streaming: also traced
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
    description: "Patches the Messages API and the Beta client, sync, async, and streaming.",
    code: `import anthropic
from fluiq import instrument

instrument(api_key="fl_...")

client = anthropic.Anthropic()

# Messages: traced automatically
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
    description: "Patches google-genai and Vertex AI: generation, streaming, and count_tokens, sync and async.",
    code: `from google import genai
from fluiq import instrument

instrument(api_key="fl_...")

client = genai.Client()

# Text generation: traced automatically
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

# Token counting: also traced
count = client.models.count_tokens(
    model="gemini-2.5-pro",
    contents="How many tokens is this sentence?",
)`,
  },
  {
    label: "LangChain",
    description: "Patches the LangChain runtime so chains, agents, and retrievers emit traces automatically.",
    code: `from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from fluiq import instrument

instrument(api_key="fl_...")

llm = ChatOpenAI(model="gpt-4o")

# Direct invocation
llm.invoke("What is observability?")

# Full chain: every step is a traced span
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
    description: "Wraps MCP client initialize so tool calls flowing through Model Context Protocol servers are traced.",
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
    description: "Every node in a LangGraph StateGraph is a traced span. Fan-out and fan-in (join) edges are resolved from the compiled graph, so parallel branches render as a true DAG; the run appears in the Agents view as LangGraph(node_a, node_b, …).",
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

# All node calls traced automatically; visible in the trace tree
result = graph.invoke({"question": "What is semantic caching?"})
print(result["answer"])`,
  },
  {
    label: "CrewAI",
    description: "Agent and task executions inside a CrewAI Crew are traced automatically. Task dependencies (task.context) become DAG edges, and the run shows as Crew(agent_1, agent_2, …) in the Agents view.",
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
    description: "Google Agent Development Kit agents are traced through the underlying Gemini calls captured by Fluiq's google-genai patch.",
    code: `from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from fluiq import instrument
import asyncio
from google.genai import types as genai_types

instrument(api_key="fl_...")  # patches google-genai used by ADK

root_agent = Agent(
    name="support_agent",
    model="gemini-2.5-pro",
    description="A helpful customer support agent.",
    instruction="Answer questions about the product clearly.",
)

session_service = InMemorySessionService()
runner = Runner(
    agent=root_agent,
    app_name="support_app",
    session_service=session_service,
)

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
    description: "Wrap any Python function (sync or async) to record inputs, outputs, latency, and errors as a named span.",
    code: `from fluiq import instrument, trace
import openai

instrument(api_key="fl_...")
client = openai.OpenAI()

@trace
def retrieve(question: str) -> list[str]:
    """Custom retrieval step: its own span in the trace tree."""
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

const typescriptTabs: CodeTab[] = [
  {
    label: "OpenAI",
    description: "Patches chat completions, the responses API, structured outputs, streaming, embeddings, images, and audio.",
    code: `import OpenAI from "openai";
import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });

const client = new OpenAI();

// Chat completions: traced automatically
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Summarise this document" }],
});

// Streaming: also traced
const stream = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Write a haiku" }],
  stream: true,
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}

// Embeddings
await client.embeddings.create({
  model: "text-embedding-3-small",
  input: ["Hello", "World"],
});`,
  },
  {
    label: "Anthropic",
    description: "Patches the Messages API and the Beta client, including streaming and countTokens.",
    code: `import Anthropic from "@anthropic-ai/sdk";
import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });

const client = new Anthropic();

// Messages: traced automatically
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 512,
  system: "You are a concise technical writer.",
  messages: [{ role: "user", content: "Explain RAG in one paragraph" }],
});
console.log(response.content[0].type === "text" && response.content[0].text);

// Streaming
const stream = client.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 512,
  messages: [{ role: "user", content: "Write a haiku" }],
});
for await (const event of stream) {
  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
    process.stdout.write(event.delta.text);
  }
}`,
  },
  {
    label: "Gemini",
    description: "Patches @google/genai and Vertex AI: generation, streaming, countTokens, and embeddings.",
    code: `import { GoogleGenAI } from "@google/genai";
import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });

const client = new GoogleGenAI({});

// Text generation: traced automatically
const response = await client.models.generateContent({
  model: "gemini-2.5-pro",
  contents: "Explain quantum entanglement in simple terms",
});
console.log(response.text);

// Streaming
const stream = await client.models.generateContentStream({
  model: "gemini-2.5-pro",
  contents: "Tell me a short story",
});
for await (const chunk of stream) {
  process.stdout.write(chunk.text ?? "");
}

// Token counting: also traced
const count = await client.models.countTokens({
  model: "gemini-2.5-pro",
  contents: "How many tokens is this sentence?",
});`,
  },
  {
    label: "LangChain",
    description: "Patches the LangChain runtime so chains, agents, and retrievers emit traces automatically.",
    code: `import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });

const llm = new ChatOpenAI({ model: "gpt-4o" });

// Direct invocation
await llm.invoke("What is observability?");

// Full chain: every step is a traced span
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant. Be concise."],
  ["human", "{question}"],
]);
const chain = prompt.pipe(llm);
await chain.invoke({ question: "What is Fluiq?" });

// Streaming chain
const stream = await chain.stream({ question: "Explain LangChain in one line" });
for await (const chunk of stream) {
  process.stdout.write(chunk.content as string);
}`,
  },
  {
    label: "MCP",
    description: "Wraps the MCP client so tool calls flowing through Model Context Protocol servers are traced.",
    code: `import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });

const transport = new StdioClientTransport({
  command: "node",
  args: ["my_mcp_server.js"],
});

const client = new Client({ name: "my-app", version: "1.0.0" });
await client.connect(transport); // ← Fluiq hooks here

const tools = await client.listTools();
const result = await client.callTool({
  name: "search",
  arguments: { query: "AI observability" },
});
console.log(result);`,
  },
  {
    label: "LangGraph",
    description: "Every node in a LangGraph StateGraph is a traced span. Fan-out and fan-in (join) edges are resolved from the compiled graph, so parallel branches render as a true DAG in the trace drawer.",
    code: `import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });

const llm = new ChatOpenAI({ model: "gpt-4o" });

const State = Annotation.Root({
  question: Annotation<string>(),
  answer: Annotation<string>(),
});

async function researchNode(state: typeof State.State) {
  const response = await llm.invoke(\`Research: \${state.question}\`);
  return { answer: response.content as string };
}

async function refineNode(state: typeof State.State) {
  const response = await llm.invoke(\`Improve this answer: \${state.answer}\`);
  return { answer: response.content as string };
}

const graph = new StateGraph(State)
  .addNode("research", researchNode)
  .addNode("refine", refineNode)
  .addEdge(START, "research")
  .addEdge("research", "refine")
  .addEdge("refine", END)
  .compile();

// All node calls traced automatically; visible in the trace tree
const result = await graph.invoke({ question: "What is semantic caching?" });
console.log(result.answer);`,
  },
  {
    label: "Google ADK",
    description: "Google ADK agents are traced through the underlying Gemini calls captured by Fluiq's @google/genai patch.",
    code: `import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." }); // patches @google/genai used by ADK

// @google/adk agent, model, and tool calls are traced automatically.
// Each model call appears as a span in the Fluiq trace tree, with the
// agent run grouped as the parent; no extra instrumentation required.`,
  },
  {
    label: "trace() wrapper",
    description: "Wrap any function (sync or async) to record inputs, outputs, latency, and errors as a named span.",
    code: `import fluiq from "@fluiq/sdk";
import OpenAI from "openai";

fluiq.instrument({ apiKey: "fl_..." });
const client = new OpenAI();

// Custom retrieval step: its own span in the trace tree
const retrieve = fluiq.trace((question: string): string[] => {
  return vectorStore.similaritySearch(question, 4);
});

const answer = fluiq.trace(
  async (question: string): Promise<string> => {
    const docs = retrieve(question);          // nested child span
    const context = docs.join("\\n");
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: \`Context:\\n\${context}\` },
        { role: "user", content: question },
      ],
    });
    return response.choices[0].message.content ?? "";
  },
  { name: "rag_agent" },
);

await answer("What is RAG?");`,
  },
]

export default function ObservabilityExamplesPage() {
  return (
    <>
<div className="space-y-6">
      <PageHeading
        icon={ChartLineData01Icon}
        title="Observability"
        description="Fluiq auto-instruments every supported library after a single instrument() call, free and unlimited on every tier. Multi-agent runs are captured as a real DAG (fan-out, joins, loop-backs). Select an integration below to see how traces flow into your dashboard."
      />
      <IntegrationTabs tabs={{ python: pythonTabs, typescript: typescriptTabs }} />
    </div>
    </>
  )
}
