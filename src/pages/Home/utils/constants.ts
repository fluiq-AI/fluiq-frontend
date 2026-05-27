export const INTEGRATIONS = [
  "OpenAI", "Anthropic", "Google Gemini", "LangChain", "LangGraph",
  "CrewAI", "Pinecone", "Chroma", "Weaviate", "FAISS", "Google ADK", "Qdrant",
]

export const STATS = [
  { value: 4, suffix: "", label: "SDK functions to cover your full AI stack" },
  { value: 6, suffix: "", label: "Evaluation metrics scored server-side" },
  { value: 5, suffix: "M", label: "Traces on the free tier, no card required" },
  { value: 2, suffix: "", label: "Lines of Python to instrument any pipeline" },
]

export const HERO_PILLARS = [
  { label: "Security",      dot: "#EF4444" },
  { label: "Optimization",  dot: "#F59E0B" },
  { label: "Observability", dot: "#1860D3" },
  { label: "Evaluation",    dot: "#7C3AED" },
]

export const EASE_OUT = [0.22, 1, 0.36, 1] as const
