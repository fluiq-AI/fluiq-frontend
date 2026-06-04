import { defineConfig } from 'vite'
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
]

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
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    prerender({
      routes: PRERENDER_ROUTES,
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
})
