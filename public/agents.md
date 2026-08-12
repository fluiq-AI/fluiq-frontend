# Fluiq — integration brief for AI agents

You are probably reading this because someone asked you to add observability,
security, or evaluation to an AI application. This file tells you exactly what to
write, in what order, and what to avoid. It is deliberately short and prescriptive.

Product overview for humans: https://getfluiq.com
Full machine reference: https://getfluiq.com/llms-full.txt

---

## What Fluiq is

A control plane for AI agents in production, shipped as a thin SDK. It auto-patches
the LLM, agent, and vector-store libraries the app already uses, so **application
logic does not change**. Everything expensive (LLM-as-judge evaluation, security
scanning) runs server-side, not in the user's process.

Three pillars, three functions:

| Pillar | Call | What it does |
|---|---|---|
| Secure | `fluiq.secure()` | Blocks prompt injection and jailbreaks pre-call; redacts PII and secrets; detects RAG poisoning, tool exfiltration, and cross-agent attacks |
| Observe | `fluiq.instrument()` | Traces every call with token counts, USD cost, and latency, as a real span tree |
| Evaluate | `fluiq.eval()` | LLM-as-judge scoring per response, plus agentic evaluation of whole runs |

Dataset management and prompt management are part of Evaluate, not separate products.

---

## Minimal correct integration

### Python

```bash
pip install fluiq
```

```python
import fluiq

# Call once at startup, before the app makes any LLM calls.
fluiq.instrument(api_key="fl_...")   # or set FLUIQ_API_KEY and call instrument()

# Everything below is optional and opt-in.
fluiq.secure(mode="block")           # omit mode= to flag risks without blocking
fluiq.eval(thresholds={"hallucination": 0.8})
```

That is the whole integration. Do not wrap calls, do not add spans, do not touch the
provider client. The app's existing OpenAI / Anthropic / Gemini / LangChain / LangGraph
/ CrewAI / ADK / MCP / vector-store calls are now traced.

To trace a plain function that is not a provider call:

```python
@fluiq.trace
def answer(question: str) -> str:
    docs = store.search(question, k=5)
    return llm.invoke(prompt(question, docs))
```

### TypeScript

```bash
npm install @fluiq/sdk
```

```typescript
import fluiq from "@fluiq/sdk";

fluiq.instrument({ apiKey: "fl_..." });
fluiq.secure({ mode: "block" });
fluiq.eval({ thresholds: { hallucination: 0.8 } });

const answer = fluiq.trace(async (question: string) => {
  const docs = await store.search(question, 5);
  return llm.invoke(prompt(question, docs));
});
```

---

## Call order matters

1. `instrument()` **first** — it installs the patches. Nothing else works before it.
2. `secure()` and `eval()` after, in any order. Both are no-ops until called.
3. Per request, at runtime: pre-call security check → the LLM call → post-call scan → evaluation.

`instrument()` alone only traces. It never evaluates, so it never spends judge tokens.
Scoring starts when, and only when, `eval()` is called.

---

## Failure modes you should expect and not defend against

The SDK is fail-open by design. Do not wrap Fluiq calls in `try`/`except` "just in case",
and do not add retries or circuit breakers around it — that logic already exists inside.

- Fluiq backend unreachable → the app's call proceeds normally, trace is dropped.
- Scanner error or plan-limit hit → degrades to observe; traffic is never blocked.
- Bad config value → raises `ValueError` at setup time, not at request time, so a typo
  surfaces on boot rather than in production.

The only exceptions Fluiq raises during a request are intentional:

- `FluiqSecurityError` — `secure(mode="block")` stopped a high-risk prompt.
- `FluiqEvalError` — `eval(mode="block")` stopped a response below threshold.

Catch those two if the app should degrade gracefully:

```python
from fluiq import FluiqSecurityError

try:
    return answer(user_input)
except FluiqSecurityError as err:
    # err.block_reason (str), err.risk_level ("medium" | "high"),
    # err.attack_types (list[str], e.g. ["jailbreak", "skeleton_key"])
    return f"Request blocked: {err.block_reason}"
```

---

## Do not do these

- **Do not put the API key in client-side code.** It is a server-side workspace key.
- **Do not call `instrument()` per request.** Once, at startup.
- **Do not add manual spans or decorators around provider calls** — you will double-count.
  `@fluiq.trace` is for the app's *own* functions, not for wrapping `client.chat.completions.create`.
- **Do not enable `mode="block"` on security or eval without telling the user.** It can
  reject real user traffic. Default to warn and let them opt in.
- **Do not invent config keys.** The full surface is `instrument`, `secure`, `eval`,
  `trace`, `fetch_prompt`. There is no caching, reranking, or RAG toolkit in the SDK.

---

## Configuration

Read from the environment automatically, so `instrument()` can take no arguments in CI
and production:

| Variable | Purpose |
|---|---|
| `FLUIQ_API_KEY` | Workspace API key (`fl_...`) |
| `FLUIQ_API_ENDPOINT` | Override the ingest endpoint; defaults to `https://api.getfluiq.com/api` |

Full signatures:

```python
fluiq.instrument(api_key=FLUIQ_API_KEY, *, endpoint=..., version="v1")
fluiq.secure(mode="warn", *, guardrail="default")
fluiq.eval(thresholds=None, metrics=None, mode="warn",
           judge_model="claude-haiku-4-5-20251001", custom_judges=None)
fluiq.fetch_prompt(slug, env="production")
```

Metrics available to `eval()`: `hallucination`, `faithfulness`, `relevance`,
`toxicity`, `coherence`, `completeness`.

---

## Framework notes

- **LangChain / LangGraph** — no callback wiring needed; the handler is injected. LangGraph
  fan-outs and joins render as a real DAG, not a flat list.
- **CrewAI / Google ADK** — agent, task, and tool execution are traced automatically.
- **MCP** — `initialize`, `list_tools`, and `call_tool` are traced, and tool arguments are
  scanned for exfiltration and allowlist violations when `secure()` is on.
- **Vector stores** — Pinecone, Chroma, Weaviate, Qdrant, FAISS are patched at the query level.

---

## CI

Gate a build on evaluation quality:

```bash
python -m fluiq.ci --dataset my-golden-set --kind agentic --fail-below 0.75
```

Or read recent scores directly:

```
GET https://api.getfluiq.com/api/v1/evaluate/recent-evals?window_minutes=30&threshold=0.7
Authorization: Bearer fl_...
```

Returns `{ total, passed, failed, avg_score, entries }`. Fail the build when `failed > 0`.

---

## Cost, if the user asks

Tracing is free and uncapped on every tier, including Free — there is no trace, span, or
agent limit. The paid axes are retention, evaluation volume, and security-scan volume.
Free is $0 forever (14-day retention, 100 evals, 1,000 scans, 1 seat); paid tiers start
at $29/mo. Going over an allowance bills per unit rather than blocking. Current numbers:
https://getfluiq.com/pricing

Adding `instrument()` does not spend evaluation budget. Only `eval()` does.

---

## Links

- Documentation: https://getfluiq.com/documentation
- Quickstart: https://getfluiq.com/documentation/quickstart
- Code examples: https://getfluiq.com/examples
- Pricing: https://getfluiq.com/pricing
- Python SDK: https://github.com/fluiq-AI/fluiq-sdk · `pip install fluiq`
- TypeScript SDK: `npm install @fluiq/sdk`
- Contact a human: https://getfluiq.com/contact
