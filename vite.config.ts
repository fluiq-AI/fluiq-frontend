import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import prerender from '@prerenderer/rollup-plugin'

const PRERENDER_ROUTES = [
  '/',
  '/pricing',
  '/contact',
  '/privacy',
  '/terms',
  '/documentation/quickstart',
  '/documentation/observability',
  '/documentation/optimization',
  '/documentation/security',
  '/documentation/evaluation',
  '/documentation/prompts',
  '/documentation/configuration',
  '/examples/observability',
  '/examples/security',
  '/examples/evaluation',
  '/examples/optimization',
  '/examples/prompts',
  '/integrations',
  '/integrations/openai',
  '/integrations/anthropic',
  '/integrations/gemini',
  '/integrations/vertex-ai',
  '/integrations/langchain',
  '/integrations/langgraph',
  '/integrations/crewai',
  '/integrations/google-adk',
  '/integrations/mcp',
  '/integrations/pinecone',
  '/integrations/chroma',
  '/integrations/weaviate',
  '/integrations/faiss',
  '/integrations/qdrant',
  '/langsmith-alternative',
  '/langfuse-alternative',
  '/helicone-alternative',
  '/braintrust-alternative',
  '/portkey-alternative',
  '/lakera-alternative',
  '/blog',
]

// Blog posts are authored in the admin panel and live in Postgres, so their
// routes aren't known at code time. Fetch the published slugs from the API at
// build time and prerender each to static HTML (publishing triggers a rebuild
// via the Render deploy hook). Fails open — a build never breaks if the API is
// unreachable; those posts just fall back to client-side rendering until the
// next successful build.
async function fetchBlogRoutes(apiBase: string): Promise<string[]> {
  const base = apiBase.replace(/\/$/, '')
  if (!base) {
    console.warn('[prerender] VITE_API_BASE_URL unset — skipping blog post prerender')
    return []
  }
  try {
    const res = await fetch(`${base}/api/v1/blog/slugs`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { slugs?: string[] }
    const routes = (data.slugs ?? []).map((slug) => `/blog/${slug}`)
    console.log(`[prerender] discovered ${routes.length} blog post(s)`)
    return routes
  } catch (err) {
    console.warn('[prerender] could not fetch blog slugs:', (err as Error).message)
    return []
  }
}

// Vite 8 (Rolldown) silently drops emitFile for the root index.html when the
// prerender plugin deletes the original bundle entry. Capture it here and
// write it manually after the bundle is flushed to disk.
let capturedHomeHtml = ''

const writePrerenderedHomePlugin = {
  name: 'write-prerendered-home',
  apply: 'build' as const,
  closeBundle() {
    if (!capturedHomeHtml) return
    const dest = path.join(__dirname, 'dist', 'index.html')
    fs.writeFileSync(dest, capturedHomeHtml, 'utf-8')
    console.log('✓ wrote prerendered dist/index.html')
  },
}

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  // Vite loads .env files into import.meta.env, NOT process.env — so read the
  // API base via loadEnv (covers .env.production) with a process.env fallback
  // for when Render injects it as a real build env var. Without this the blog
  // prerender silently skipped every post.
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL || ''

  return {
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    prerender({
      routes: [...PRERENDER_ROUTES, ...(await fetchBlogRoutes(apiBase))],
      renderer: '@prerenderer/renderer-puppeteer',
      rendererOptions: {
        renderAfterDocumentEvent: 'app-prerender-ready',
        maxConcurrentRoutes: 4,
      },
      postProcess(renderedRoute) {
        if (renderedRoute.route === '/') {
          capturedHomeHtml = renderedRoute.html.trim()
        }
      },
    }),
    writePrerenderedHomePlugin,
  ],
  }
})
