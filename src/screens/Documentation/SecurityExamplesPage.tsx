"use client"

import { SecurityCheckIcon } from "@hugeicons/core-free-icons"
import { IntegrationTabs, PageHeading, type CodeTab } from "./_docComponents"

const pythonTabs: CodeTab[] = [
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
        # Only these categories trigger a block — PII is warn-only.
        # Agentic categories are also available: rag_poisoning,
        # tool_exfiltration, tool_policy_violation, cross_agent_injection
        "block_categories": ["prompt_injection", "jailbreak", "skeleton_key"],
        # Tools the agent may call — anything else is flagged as a
        # tool_policy_violation. Empty = all tools allowed.
        "allowed_tools": ["search_web", "read_file", "get_weather"],
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

const typescriptTabs: CodeTab[] = [
  {
    label: "Warn mode",
    description:
      "Default mode — every traced LLM call is scanned server-side. Risks are flagged on the trace without blocking execution.",
    code: `import fluiq from "@fluiq/sdk";
import OpenAI from "openai";

fluiq.instrument({ apiKey: "fl_..." });
fluiq.secure(); // warn mode by default

const client = new OpenAI();

// Calls proceed normally; risk metadata appears in the Security dashboard
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: userInput }],
});`,
  },
  {
    label: "Block mode",
    description:
      "In block mode the pre-call check fires automatically before every traced LLM call. If the server returns allow=false, FluiqSecurityError is thrown and the LLM call is never made.",
    code: `import fluiq, { FluiqSecurityError } from "@fluiq/sdk";
import OpenAI from "openai";

fluiq.instrument({ apiKey: "fl_..." });
fluiq.secure({ mode: "block" }); // pre-call check runs automatically

const client = new OpenAI();

let answer: string;
try {
  // Pre-call check fires here before reaching OpenAI
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: userInput }],
  });
  answer = response.choices[0].message.content ?? "";
} catch (e) {
  if (e instanceof FluiqSecurityError) {
    console.log(\`Blocked:      \${e.blockReason}\`);
    console.log(\`Risk level:   \${e.riskLevel}\`);   // "medium" or "high"
    console.log(\`Attack types: \${e.attackTypes}\`); // e.g. ["jailbreak", "pii"]
    answer = "I can't process that request.";
  } else {
    throw e;
  }
}`,
  },
  {
    label: "Exception attributes",
    description:
      "FluiqSecurityError carries three properties from the server's detection result. Detection rules — attack patterns, PII types, topic filters — are configured per-organisation in the Fluiq Security dashboard, not in SDK code.",
    code: `import fluiq, { FluiqSecurityError } from "@fluiq/sdk";
import OpenAI from "openai";

fluiq.instrument({ apiKey: "fl_..." });
fluiq.secure({ mode: "block" });

const client = new OpenAI();

try {
  await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: userInput }],
  });
} catch (e) {
  if (e instanceof FluiqSecurityError) {
    // e.blockReason  — human-readable explanation from the server
    // e.riskLevel    — "medium" or "high"
    // e.attackTypes  — detected categories, e.g.:
    //   ["prompt_injection", "jailbreak", "skeleton_key", "pii"]
    if (e.riskLevel === "high") {
      return res.status(403).json({ error: e.blockReason, types: e.attackTypes });
    }
    return res.status(400).json({ error: "Request flagged — please rephrase." });
  }
  throw e;
}`,
  },
  {
    label: "Express integration",
    description:
      "A realistic web handler pattern — catch FluiqSecurityError at the route level and return a clean HTTP response without leaking internal details.",
    code: `import express from "express";
import fluiq, { FluiqSecurityError } from "@fluiq/sdk";
import OpenAI from "openai";

fluiq.instrument({ apiKey: "fl_..." });
fluiq.secure({ mode: "block" });

const app = express();
app.use(express.json());
const client = new OpenAI();

app.post("/chat", async (req, res) => {
  const userInput = req.body.message ?? "";
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: userInput }],
    });
    res.json({ reply: response.choices[0].message.content });
  } catch (e) {
    if (e instanceof FluiqSecurityError) {
      // Pre-call check blocked the request — don't surface internals
      const status = e.riskLevel === "high" ? 403 : 400;
      return res.status(status).json({
        error: "Your message was flagged by our safety policy.",
      });
    }
    throw e;
  }
});`,
  },
  {
    label: "Audit Log",
    description:
      "Every SDK configuration call and API action is automatically written to an append-only, HMAC-signed audit trail. Query it via REST or browse and export it from the dashboard — no extra SDK code needed.",
    code: `import axios from "axios";

const headers = { Authorization: \`Bearer \${fluiqApiKey}\` };

// Fetch the last 50 guardrail-related events
let resp = await axios.get("https://api.getfluiq.com/api/v1/audit", {
  params: { event_type: "guardrail.updated", limit: 50, offset: 0 },
  headers,
});

for (const event of resp.data.events) {
  console.log(event.event_type, event.actor, event.created_at);
  console.log("row_hash:", event.row_hash); // HMAC-SHA256 for tamper detection
}

// Filter by actor (email or API key prefix)
resp = await axios.get("https://api.getfluiq.com/api/v1/audit", {
  params: { actor: "alice@example.com", limit: 100 },
  headers,
});`,
  },
  {
    label: "Guardrail policy",
    description:
      "Set per-org blocking rules, custom phrase lists, and alert webhooks via the REST API. Changes take effect within 60 seconds — no SDK update or redeployment required.",
    code: `import axios from "axios";

const headers = {
  Authorization: \`Bearer \${fluiqApiKey}\`,
  "Content-Type": "application/json",
};

// Configure org-level guardrail policy
await axios.put(
  "https://api.getfluiq.com/api/v1/guardrails",
  {
    // Block only confirmed high-risk requests (default)
    block_threshold: "high",
    // Warn on medium-risk findings too
    warn_threshold: "medium",
    // Only these categories trigger a block — PII is warn-only.
    // Agentic categories also available: rag_poisoning, tool_exfiltration,
    // tool_policy_violation, cross_agent_injection
    block_categories: ["prompt_injection", "jailbreak", "skeleton_key"],
    // Tools the agent may call — anything else is flagged as a
    // tool_policy_violation. Empty = all tools allowed.
    allowed_tools: ["search_web", "read_file", "get_weather"],
    // Exact phrases always blocked before any scan
    custom_deny_list: ["ignore previous instructions", "confidential pricing"],
    // Phrases that skip all scanning (internal tooling)
    custom_allow_list: ["internal-test-harness"],
    // Webhook for real-time alerts
    alert_webhook: "https://hooks.slack.com/services/...",
    alert_on: ["high"], // only alert on confirmed high-risk blocks
  },
  { headers },
);`,
  },
]

export default function SecurityExamplesPage() {
  return (
    <>
<div className="space-y-6">
      <PageHeading
        icon={SecurityCheckIcon}
        title="Security"
        description="fluiq.secure() adds a scanning layer to every traced LLM call. Choose warn to flag risks on the trace, or block to halt the request before it reaches the model."
      />
      <IntegrationTabs tabs={{ python: pythonTabs, typescript: typescriptTabs }} />
    </div>
    </>
  )
}
