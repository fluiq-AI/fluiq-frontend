
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
    a: "One traced span, typically one LLM call, one retriever call, or one decorated function invocation. A single end-to-end agent run usually emits 5-20 traces depending on how many tools and LLM calls it makes. Trace ingestion is unlimited and free on every plan — the Free plan keeps a rolling 14-day history, while Team and above retain your traces indefinitely.",
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
  {
    q: "How do I know if my LLM is actually working in production?",
    a: "Fluiq traces every LLM call, tool call, and decorated function automatically, so you watch live token usage, latency (p50/p95/p99), USD cost per agent node, and pass/fail status stream onto the dashboard as runs complete. Automated LLM-as-judge evals score hallucination, faithfulness, relevance, and more on real production traffic, and Slack alerts fire the moment quality regresses or failure rates climb — so \"is it working?\" becomes a number you watch, not a guess.",
  },
  {
    q: "What's the cheapest way to monitor my LLM application?",
    a: "Start on Fluiq's Free plan: unlimited traces and 1,000 evaluations per month at no cost, with full tracing, cost attribution, and latency analytics included. Instrumentation is one line — fluiq.instrument() — so there's no agent to run and no infrastructure to host. Free keeps a rolling 14-day history; when you outgrow it, Team and above retain traces indefinitely, and fluiq.optimize() caches repeated prompts to cut model spend, so monitoring can actually lower your bill instead of adding to it.",
  },
  {
    q: "Will adding observability slow down my LLM?",
    a: "No. The Fluiq SDK is a thin instrumentation layer that records spans and ships them to the backend in the background, so it adds negligible overhead to the call itself. It is also fail-open by design: if the Fluiq backend is ever slow or unreachable, your application keeps running and never blocks waiting on a trace. You get full visibility without paying for it in latency.",
  },
  {
    q: "How do I know if my AI is actually secure?",
    a: "fluiq.secure() scans both sides of every call. Before the model runs, pre-call scanning catches prompt injection, jailbreaks, and skeleton-key attacks; after it runs, post-call scanning redacts PII and secrets and inspects the whole trace tree for agentic threats — RAG poisoning, tool-input exfiltration, tools used outside their allowlist, and multi-agent trust attacks. Every risk is flagged on the trace with a severity and category, so security is something you see per request instead of assume.",
  },
  {
    q: "What happens when an AI system gets hacked?",
    a: "Common attacks — a jailbreak prompt, a poisoned retrieved document, a tool tricked into leaking data — try to make your model ignore its instructions or exfiltrate sensitive information. With fluiq.secure() in block mode, Fluiq raises a FluiqSecurityError before a high-risk prompt ever reaches the model; in warn mode it records the attempt on the trace without interrupting traffic. Because scanning fails open, a scanner error degrades to observe-only instead of taking your app down, and every blocked or flagged event can alert your team in Slack.",
  },
  {
    q: "Can someone trick my LLM into giving away secrets?",
    a: "That is exactly the class of attack Fluiq is built to stop. The response gate scans model output for PII and high-entropy secrets and redacts them before they are stored or returned, while tool-input exfiltration and allowlist checks catch sensitive data being smuggled out through tool calls. Pre-call injection detection blocks prompts engineered to override your system instructions, and post-call scanning reads retrieved docs and sibling spans to catch indirect injection planted in your RAG sources.",
  },
]