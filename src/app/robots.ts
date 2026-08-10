import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site-url"

const PRIVATE_PATHS = [
  "/dashboard/",
  "/admin/",
  "/auth/",
  "/forgot-password",
  "/reset-password",
]

// Read the host inside the handler, not at module scope: `headers()` is
// request-scoped, and a module-level read is evaluated once per module
// instantiation, which would pin robots.txt to whichever host warmed it first.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const SITE = await getSiteUrl()
  return {
    rules: [
      // Traditional search crawlers
      {
        userAgent: ["Googlebot", "Bingbot", "Slurp", "DuckDuckBot", "Baiduspider", "YandexBot"],
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      // LLM / AI crawlers — both training bots and real-time "search/answer"
      // bots. The search/answer bots (OAI-SearchBot, ChatGPT-User, Claude-User,
      // PerplexityBot) are the ones that fetch pages live to build an answer and
      // can drive referral traffic, so they must stay allowed on public paths.
      {
        userAgent: [
          // OpenAI
          "GPTBot",
          "ChatGPT-User",
          "OAI-SearchBot",
          // Anthropic
          "ClaudeBot",
          "Claude-Web",
          "Claude-User",
          "Claude-SearchBot",
          "anthropic-ai",
          // Google / Perplexity / others
          "Google-Extended",
          "Google-CloudVertexBot",
          "PerplexityBot",
          "Perplexity-User",
          "cohere-ai",
          "CCBot",
          "Applebot-Extended",
          "Amazonbot",
          "Meta-ExternalAgent",
          "DuckAssistBot",
          "Bytespider",
        ],
        disallow: PRIVATE_PATHS,
      },
      // Everyone else
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
