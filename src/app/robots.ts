import type { MetadataRoute } from "next"

const SITE = "https://getfluiq.com"

const PRIVATE_PATHS = [
  "/dashboard/",
  "/admin/",
  "/auth/",
  "/forgot-password",
  "/reset-password",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Traditional search crawlers
      {
        userAgent: ["Googlebot", "Bingbot", "Slurp", "DuckDuckBot", "Baiduspider", "YandexBot"],
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      // LLM / AI crawlers
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "Claude-Web",
          "anthropic-ai",
          "PerplexityBot",
          "cohere-ai",
          "Google-Extended",
          "CCBot",
          "Applebot-Extended",
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
