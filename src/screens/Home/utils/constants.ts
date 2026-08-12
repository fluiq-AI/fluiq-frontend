export const INTEGRATIONS = [
  "OpenAI", "Anthropic", "Google Gemini", "LangChain", "LangGraph",
  "CrewAI", "Pinecone", "Chroma", "Weaviate", "FAISS", "Google ADK", "Qdrant",
]

export const STATS = [
  { value: 3, suffix: "", label: "SDK functions to cover your full AI stack" },
  { value: 6, suffix: "", label: "Evaluation metrics scored server-side" },
  // `display` short-circuits the count-up animation: some values are symbols,
  // not numbers. Everything else still animates from zero.
  { value: 0, suffix: "", display: "∞", label: "Traces every month, free on every plan" },
  { value: 2, suffix: "", label: "Lines of Python to instrument any pipeline" },
]

export const EASE_OUT = [0.22, 1, 0.36, 1] as const
