import { PricingFaqs } from "@/lib/faqs"

/**
 * The standalone /faq page, grouped so a reader can scan to their question
 * instead of reading a flat list of twenty.
 *
 * Entries already written for the pricing page are pulled in by question text
 * rather than copied, so there is one place to edit an answer. Anything not
 * matched is appended to "Everything else", which means a new entry added to
 * `PricingFaqs` shows up here automatically instead of silently going missing.
 */

export interface FaqEntry {
  q: string
  a: string
}

export interface FaqGroup {
  id: string
  title: string
  blurb: string
  entries: FaqEntry[]
}

/** Questions authored specifically for this page, not shown on /pricing. */
const EXTRA: Record<string, FaqEntry[]> = {
  plans: [
    {
      q: "How does billing work once I pass my allowance?",
      a: "Your plan includes a monthly allowance of evaluations and security scans. Beyond it you pay per evaluation, priced by depth: $0.007 for a single-judge metric, $0.015 for a fast agentic run, $0.065 for a standard one, and $0.545 for a deep run with a multi-model jury. Security scans are $0.0005 each. Every price includes the judge tokens. You can set a hard spend cap so a runaway batch cannot surprise you.",
    },
    {
      q: "Why is a deep evaluation so much more expensive than a fast one?",
      a: "Because it is genuinely more work. A fast run does deterministic checks plus one judge call. A deep run reads the entire trajectory, then convenes a jury of several models and keeps each juror's score and reasoning as an audit trail. That can be a hundred times the judge tokens of a single relevance check. Most tools bill both as one evaluation, which means light users subsidise heavy ones. We would rather show you the difference.",
    },
    {
      q: "Can I use my own OpenAI or Anthropic key?",
      a: "Yes, on every plan including Free. Save a provider key in Provider Keys and your evaluations run on your account, so judge tokens bill to whatever rate you already negotiated instead of to us. Keys are encrypted before storage with a data key we cannot read without AWS KMS. After you save one it is never shown again, never sent to your browser, and never written to a log. If a key stops working the evaluation stops rather than quietly falling back to our account.",
    },
    {
      q: "Do you charge per seat?",
      a: "No. Plans include seats and you are never billed by headcount. Adding a teammate who needs to look at one trace should not cost the same as adding a heavy user, and per-seat pricing tends to stop people sharing the thing you want them to share.",
    },
    {
      q: "What happens if I hit my free-plan limit?",
      a: "Evaluations and security scans stop for the rest of the month; tracing keeps running, because tracing is unlimited on every plan and we do not want your observability to go dark over a billing threshold. You can upgrade at any time, or start a five-day trial of a paid plan without a card.",
    },
  ],
  evaluation: [
    {
      q: "Can I choose which model judges my evaluations?",
      a: "Yes, on every plan including Free. Pick the judge model per run, per agentic evaluation, or per dataset batch. At deep depth you also choose the jury: which models sit on the panel, each one scoring independently with its reasoning kept on the result. Different judges disagree in interesting ways, and seeing that disagreement is often more useful than a single confident number.",
    },
    {
      q: "Is evaluation automatic?",
      a: "No, and this is deliberate. Instrumenting your app gives you tracing only. Evaluation runs when you ask for it, with fluiq.eval(), so nobody discovers an unexpected bill from evaluations they did not know were running.",
    },
    {
      q: "How do I know what a score actually measured?",
      a: "Every score carries the exact judge prompt that produced it, including its name, version, and whether it came from a default, a platform override, or your own organisation's edit. If a metric starts behaving differently you can see whether the prompt changed rather than guessing.",
    },
  ],
  security: [
    {
      q: "Is security really available on the free plan?",
      a: "Yes, 1,000 scans a month. Scanning is pattern and named-entity based with no LLM call at all, so it costs us a fraction of a cent to run. Locking it behind an expensive tier would have meant nobody could try the one thing our competitors do not ship. You pay for volume, not for access.",
    },
    {
      q: "Does security scanning slow down my application?",
      a: "In warn mode, no: scanning happens server-side after the call and attaches findings to the trace. In block mode there is a check before the prompt reaches the model, which is the point, and it adds a few milliseconds. If the scan cannot complete, the default is to allow the call rather than break your application.",
    },
  ],
  data: [
    {
      q: "Where does my data live, and how long do you keep it?",
      a: "Traces are stored in our infrastructure on AWS. The free plan keeps a rolling 14-day window; every paid plan keeps traces until you delete them. Retention is the paid axis, not ingestion volume, so you are never pushed to trace less than you should.",
    },
    {
      q: "Can I get my data out?",
      a: "Yes. Traces, evaluations, and datasets are exportable, and Enterprise adds compliance exports and audit logs. We also import from LangSmith, Langfuse, Phoenix, and Braintrust, so trying Fluiq does not mean abandoning the history you already have.",
    },
  ],
}

/** Pull an entry out of PricingFaqs by its question text. */
function pick(...questions: string[]): FaqEntry[] {
  return questions
    .map((q) => PricingFaqs.find((f) => f.q === q))
    .filter((f): f is FaqEntry => Boolean(f))
}

const GROUPED: FaqGroup[] = [
  {
    id: "plans",
    title: "Plans & billing",
    blurb: "What you pay for, and what happens when you go over.",
    entries: [
      ...pick("What counts as a trace?", "What counts as an evaluation?"),
      ...EXTRA.plans,
    ],
  },
  {
    id: "evaluation",
    title: "Evaluation",
    blurb: "How scoring works and how much of it you control.",
    entries: EXTRA.evaluation,
  },
  {
    id: "security",
    title: "Security",
    blurb: "What fluiq.secure() checks, and what it costs.",
    entries: [
      ...pick(
        "When do I need fluiq.secure()?",
        "How do I know if my AI is actually secure?",
        "What happens when an AI system gets hacked?",
        "Can someone trick my LLM into giving away secrets?",
      ),
      ...EXTRA.security,
    ],
  },
  {
    id: "getting-started",
    title: "Getting started",
    blurb: "Setup, frameworks, and moving between tools.",
    entries: pick(
      "Which frameworks does Fluiq support?",
      "Can I switch frameworks later?",
      "How do I know if my LLM is actually working in production?",
      "Will adding observability slow down my LLM?",
      "What's the cheapest way to monitor my LLM application?",
    ),
  },
  {
    id: "data",
    title: "Data, privacy & deployment",
    blurb: "Where your data sits and how to get it back out.",
    entries: [
      ...pick("Do you support self-hosting?", "How does fluiq.optimize() work?"),
      ...EXTRA.data,
    ],
  },
]

/** Any PricingFaqs entry not placed above, so nothing is quietly dropped. */
const placed = new Set(GROUPED.flatMap((g) => g.entries.map((e) => e.q)))
const leftover = PricingFaqs.filter((f) => !placed.has(f.q))

export const FAQ_GROUPS: FaqGroup[] = leftover.length
  ? [
      ...GROUPED,
      {
        id: "everything-else",
        title: "Everything else",
        blurb: "",
        entries: leftover,
      },
    ]
  : GROUPED

/** Flat list, for the FAQPage structured data in the route file. */
export const ALL_FAQS: FaqEntry[] = FAQ_GROUPS.flatMap((g) => g.entries)
