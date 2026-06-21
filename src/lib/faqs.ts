
/** Visible FAQ, kept in sync with the FAQPage JSON-LD in the route file. */
export const LLMCostFAQS = [
  {
    q: "How is LLM cost calculated?",
    a: "Cost per request = (input tokens / 1,000,000 x input price) + (output tokens / 1,000,000 x output price). Multiply by your monthly request volume for the monthly cost. Input and output tokens are priced separately, and output is usually more expensive.",
  },
  {
    q: "What is a token?",
    a: "A token is a chunk of text a model reads or writes, roughly 4 characters or 0.75 English words. Both your prompt (input) and the model's response (output) are billed in tokens.",
  },
  {
    q: "Which LLM is cheapest?",
    a: "It depends on your input-to-output ratio, but lightweight models like GPT-4o mini, Claude Haiku, and Gemini Flash are the cheapest per token, often 10 to 20 times less than frontier models. The comparison table ranks every model for your exact workload.",
  },
  {
    q: "How much can response caching save?",
    a: "A cache hit serves a repeated prompt from storage instead of calling the model, so that request costs effectively nothing. At a 60% cache hit rate you cut model spend by about 60%. Fluiq's optimize() builds a cache profile from your real traces and serves duplicates automatically.",
  },
  {
    q: "Where do these prices come from?",
    a: "Prices are list rates per 1M tokens for the standard tier, served from Fluiq's pricing database. Providers change pricing often, so treat the result as a planning estimate, confirm with the provider, and use the report link to flag anything out of date.",
  },
]

export const PricingFaqs = [
  {
    q: "What counts as a trace?",
    a: "One traced span, typically one LLM call, one retriever call, or one decorated function invocation. A single end-to-end agent run usually emits 5-20 traces depending on how many tools and LLM calls it makes. The Free plan includes 50,000 traces per month; Team and above are unlimited.",
  },
  {
    q: "Which frameworks does Fluiq support?",
    a: "Fluiq instruments at the function-call level and ships integrations for OpenAI, Anthropic, Gemini, LangChain, LangGraph, CrewAI, Google ADK, and raw HTTP calls via the @trace decorator. Streaming, tool calls, thinking tokens, and MCP servers are all captured automatically.",
  },
  {
    q: "What counts as an evaluation?",
    a: "One LLM-as-judge scoring call: e.g. a hallucination check on an answer or a relevance score over a retrieved chunk set. Metrics include hallucination, faithfulness, relevance, toxicity, coherence, and completeness. Free includes 1,000 evals/month, Team 10,000, Growth 100,000, and Enterprise is unlimited.",
  },
  {
    q: "When do I need fluiq.secure()?",
    a: "fluiq.secure() runs server-side security scanning: PII detection and redaction, prompt-injection and jailbreak blocking, secret-leak prevention, indirect-injection and RAG-poisoning detection, tool-input exfiltration and allowlist enforcement, and multi-agent trust checks (cross-agent injection and trust-boundary escalation). It is included on the Growth and Enterprise plans. In warn mode it flags risks on the trace without blocking; in block mode it raises FluiqSecurityError before a HIGH-risk prompt reaches the LLM.",
  },
  {
    q: "How does fluiq.optimize() work?",
    a: "Available on Team and above. After you call fluiq.optimize(), the SDK fetches your trace-derived cache profile from the Fluiq backend, connects to a dedicated Redis instance provisioned for your account, and begins serving repeated prompts from cache. In observe mode it records what would have been a cache hit so you can review projected savings before enabling full interception.",
  },
  {
    q: "Do you support self-hosting?",
    a: "Yes. VPC and on-prem deployments are available on the Enterprise plan. The SDK is a thin instrumentation layer and can be pointed at your own backend endpoint if you prefer full self-hosting.",
  },
  {
    q: "Can I switch frameworks later?",
    a: "Yes. Because Fluiq instruments at the call level, the same SDK works across all supported frameworks simultaneously. Switching from LangChain to LangGraph, or adding a new provider, requires no changes to your instrumentation.",
  },
]