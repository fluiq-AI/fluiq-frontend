# Fluiq Frontend

Marketing site + product app for [Fluiq](https://getfluiq.com), the control
plane for AI agents in production. Built with **Next.js 16 (App Router)**, React 19, TypeScript,
Tailwind CSS v4, and Redux Toolkit.

> **Status: archived.** Fluiq ran from 10 April to September 2026 and never
> found customers. The hosted service is shut down and the infrastructure is
> gone. The code is MIT and stays public because it works. Nothing here is
> maintained — fork it freely.
>
> The rest of the project: [fluiq-api](https://github.com/fluiq-AI/fluiq-api) ·
> [tracer](https://github.com/fluiq-AI/fluiq-worker-tracer) ·
> [evaluator](https://github.com/fluiq-AI/fluiq-worker-evaluator) ·
> [security](https://github.com/fluiq-AI/fluiq-worker-security) ·
> [Python SDK](https://github.com/fluiq-AI/fluiq-sdk) ·
> [TypeScript SDK](https://github.com/fluiq-AI/fluiq-sdk-typescript) ·
> [guardrail-bench](https://github.com/SaurabhKumbhar24/guardrail-bench)

> Migrated from Vite + react-router + a puppeteer prerender step to Next.js App
> Router with server-rendered metadata. See [Architecture notes](#architecture-notes).

## Requirements

- Node.js **>= 20.9** (see `.nvmrc`)
- npm

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

### Scripts

| Command         | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Start the dev server (Turbopack)             |
| `npm run build` | Production build (type-checked)              |
| `npm run start` | Serve the production build                   |
| `npm run lint`  | Lint with `eslint-config-next`               |

### Environment variables

`.env.development` (used by `next dev`) and `.env.production` (used by
`next build` / `next start`):

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080   # backend API base URL
```

> On Amplify, set `NEXT_PUBLIC_API_BASE_URL` in the console env vars.

## Project structure

```
src/
├─ app/                 # Next.js App Router: routes, layouts, metadata
│  ├─ layout.tsx        # Root layout (head, analytics, providers)
│  ├─ providers.tsx     # Client providers: Redux, theme, Helmet
│  ├─ robots.ts         # Dynamic robots.txt  -> /robots.txt
│  ├─ sitemap.ts        # Dynamic sitemap      -> /sitemap.xml
│  └─ <route>/page.tsx  # Thin wrappers that render screens + export metadata
├─ screens/             # Page/feature components (the former src/pages)
├─ components/          # Shared UI components
├─ lib/
│  ├─ router-compat.tsx # react-router -> next/navigation shim
│  ├─ seo.ts            # buildMetadata() helper
│  └─ seo-pages.ts      # Per-route SEO descriptors + JSON-LD
├─ store/               # Redux Toolkit store + slices
└─ contexts/            # React contexts (theme, …)
public/                 # Static assets (logo, banner, llms.txt, llms-full.txt)
```

## Routing & SEO

- Routes live in `src/app` (App Router). Each public route's `page.tsx` is a
  **server component** that exports `metadata` (and JSON-LD via `<JsonLd>`),
  rendering the corresponding client screen.
- `app/sitemap.ts` generates `/sitemap.xml` dynamically — including every
  integration page and **published blog post** (fetched from the API,
  fail-open), regenerated hourly.
- `app/robots.ts` generates `/robots.txt` (search + LLM crawler rules, sitemap
  reference).
- `llms.txt` / `llms-full.txt` are static crawler context files served from
  `public/`.
- Dynamic routes: `integrations/[slug]` (SSG via `generateStaticParams`) and
  `blog/[slug]` (SSR via `generateMetadata` with a server-side post fetch).

## Architecture notes

This app was migrated from a Vite SPA. Two deliberate choices keep the diff small:

1. **`react-router` compatibility shim** (`src/lib/router-compat.tsx`) is aliased
   in `next.config.ts` + `tsconfig.json`, so components can keep importing
   `Link`, `useNavigate`, `useParams`, `Outlet`, etc. from `"react-router"`.
2. **`src/pages` was renamed to `src/screens`** to avoid colliding with Next's
   Pages Router; the `@/pages/*` path alias still resolves to it, so imports are
   unchanged.

Authenticated surfaces (`/dashboard`, `/admin`, auth pages) are client-rendered
and use `react-helmet-async` for their (non-indexed) titles; public/marketing
routes use server-side Next Metadata.

## Deployment

Hosted on **AWS Amplify** (Next.js SSR). Build config in `amplify.yml`:

- `npm ci` → `npm run build`, artifacts from `.next`
- Node pinned to 20 for Next 16
- Set `NEXT_PUBLIC_API_BASE_URL` in the Amplify console
