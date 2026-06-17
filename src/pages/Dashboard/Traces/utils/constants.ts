export const ALL_KEYS = "all"
export const TRACES_PAGE_SIZE = 50

export const FLOW_NODE_WIDTH = 220
export const FLOW_NODE_HEIGHT = 64

// A collapsed agentic loop only fires when an agent drives at least this many
// same-model LLM calls; below it the normal per-call layout reads fine.
export const FLOW_LOOP_MIN_ITERATIONS = 3
