"use client"

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
import { IntegrationTabs, PageHeading, type CodeTab } from "./_docComponents"

const pythonTabs: CodeTab[] = [
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
    description: "Fluiq supports six built-in metrics. Mix and match with per-metric thresholds.",
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

const typescriptTabs: CodeTab[] = [
  {
    label: "Warn mode",
    description:
      "Call fluiq.eval() once after instrument() — every subsequent traced LLM call is scored in the background. Results appear in the Evaluations dashboard; a warning is logged when a score falls below its threshold.",
    code: `import OpenAI from "openai";
import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });
fluiq.eval({
  metrics: ["hallucination", "relevance"], // scored on every LLM call
  mode: "warn",                            // default — never blocks
  thresholds: { hallucination: 0.8, relevance: 0.7 },
});

const client = new OpenAI();

// Evaluation fires automatically after this call
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "What year did World War II end?" }],
});
console.log(response.choices[0].message.content);
// Scores visible in the Fluiq Evaluations tab`,
  },
  {
    label: "Block mode",
    description:
      "In block mode fluiq.eval() runs synchronously after each LLM call and throws FluiqEvalError if any metric falls below its threshold — the response never reaches your application.",
    code: `import OpenAI from "openai";
import fluiq, { FluiqEvalError } from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });
fluiq.eval({
  metrics: ["hallucination", "toxicity"],
  mode: "block",
  thresholds: { hallucination: 0.8, toxicity: 0.9 },
});

const client = new OpenAI();

let answer: string;
try {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: userQuery }],
  });
  answer = response.choices[0].message.content ?? "";
} catch (e) {
  if (e instanceof FluiqEvalError) {
    // Score fell below threshold — handle gracefully
    console.log(\`Eval blocked response: \${e.message}\`);
    answer = "I can't answer that right now.";
  } else {
    throw e;
  }
}`,
  },
  {
    label: "All metrics",
    description: "Fluiq supports six built-in metrics. Mix and match with per-metric thresholds.",
    code: `import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });
fluiq.eval({
  metrics: [
    "hallucination", // is the response grounded in fact?
    "faithfulness",  // does it stay true to any provided context?
    "relevance",     // does it address the question?
    "toxicity",      // does it contain harmful content?
    "coherence",     // is it logically consistent?
    "completeness",  // does it fully answer the question?
  ],
  thresholds: {
    hallucination: 0.8,
    faithfulness: 0.75,
    relevance: 0.7,
    toxicity: 0.95,
    coherence: 0.7,
    completeness: 0.65,
  },
  mode: "warn",
  judgeModel: "claude-haiku-4-5-20251001", // default judge
});`,
  },
  {
    label: "LangChain",
    description:
      "Evaluation fires automatically on every LangChain LLM call — chains, agents, and direct invocations are all covered.",
    code: `import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });
fluiq.eval({ metrics: ["hallucination", "relevance"], mode: "warn" });

const llm = new ChatOpenAI({ model: "gpt-4o" });
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant. Be concise and accurate."],
  ["human", "{question}"],
]);
const chain = prompt.pipe(llm);

// Every chain invocation is traced and evaluated automatically
await chain.invoke({ question: "Explain the difference between RAG and fine-tuning" });`,
  },
  {
    label: "LangGraph",
    description:
      "Each LLM call inside a graph node is evaluated independently — scores are attached to the corresponding span in the trace tree.",
    code: `import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });
fluiq.eval({ metrics: ["hallucination", "relevance"], mode: "warn" });

const llm = new ChatOpenAI({ model: "gpt-4o" });

const State = Annotation.Root({
  question: Annotation<string>(),
  answer: Annotation<string>(),
});

async function researchNode(state: typeof State.State) {
  // This LLM call is traced and evaluated automatically
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

const result = await graph.invoke({
  question: "What are the benefits of semantic caching?",
});`,
  },
  {
    label: "Google ADK",
    description:
      "ADK agent calls are evaluated through the @google/genai patch — each Gemini call gets a score attached to its trace span.",
    code: `import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });
fluiq.eval({ metrics: ["hallucination", "relevance", "coherence"], mode: "warn" });

// @google/adk agents call Gemini under the hood. Every model call is traced
// through Fluiq's @google/genai patch and evaluated automatically — no extra
// code is required. Scores are attached to each Gemini span in the trace tree.`,
  },
  {
    label: "CI/CD eval gate",
    description:
      "Use block mode in CI — set thresholds tight and catch FluiqEvalError to fail the build when response quality regresses.",
    code: `// evaluate.ts — run in your CI pipeline before merging
import fluiq, { FluiqEvalError } from "@fluiq/sdk";
import OpenAI from "openai";

fluiq.instrument({ apiKey: "fl_..." });
fluiq.eval({
  metrics: ["hallucination", "relevance", "completeness"],
  mode: "block",
  thresholds: { hallucination: 0.85, relevance: 0.8, completeness: 0.75 },
});

const client = new OpenAI();

const TEST_CASES = [
  "What year did World War II end?",
  "Explain the difference between TCP and UDP.",
  "What is the capital of Australia?",
];

let passed = 0;
let failed = 0;
for (const question of TEST_CASES) {
  try {
    await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: question }],
    });
    passed++;
  } catch (e) {
    if (e instanceof FluiqEvalError) {
      console.log(\`FAIL [\${question.slice(0, 40)}]: \${e.message}\`);
      failed++;
    } else {
      throw e;
    }
  }
}

console.log(\`\\nResults: \${passed} passed, \${failed} failed\`);
if (failed > 0) {
  console.error(\`Eval gate FAILED: \${failed} case(s) below threshold\`);
  process.exit(1);
}
console.log("Eval gate passed");`,
  },
]

export default function EvaluationExamplesPage() {
  return (
    <>
<div className="space-y-6">
      <PageHeading
        icon={CheckmarkCircle02Icon}
        title="Evaluation"
        description="Evaluation is opt-in: instrument() only traces, and scoring runs once you call fluiq.eval(). From that point Fluiq runs an LLM-as-judge on every traced LLM response, scores each metric (0–1), and stores results in your dashboard. Use block mode to gate on quality in CI. For whole-run scoring — tool selection, trajectory, and multi-agent coordination — run an agentic evaluation on a root trace or over a Dataset from the dashboard."
      />
      <IntegrationTabs tabs={{ python: pythonTabs, typescript: typescriptTabs }} />
    </div>
    </>
  )
}
