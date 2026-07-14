export const ALL_KEYS = "all"
export const TRACES_PAGE_SIZE = 50

// Max concurrent child-span prefetch requests after a page loads. Each request
// runs a full server-side join, so an unbounded fan-out (one per root) stampedes
// ClickHouse; a small pool keeps the table responsive for high-volume orgs.
export const PREFETCH_CONCURRENCY = 5

export const FLOW_NODE_WIDTH = 220
export const FLOW_NODE_HEIGHT = 64

// A collapsed agentic loop only fires when an agent drives at least this many
// same-model LLM calls; below it the normal per-call layout reads fine.
export const FLOW_LOOP_MIN_ITERATIONS = 3
