# AGENTS.md

Guidance for AI coding agents working in this repo. The README covers the same ground for humans; this file adds the things an agent is likely to get wrong.

## What this is

The frontend for Fluiq (getfluiq.com): a public marketing site plus the authenticated product dashboard, in one Next.js 16 App Router app. React 19, TypeScript, Tailwind CSS v4, Redux Toolkit. It talks to a separate backend API via `NEXT_PUBLIC_API_BASE_URL`.

## Commands

```bash
npm install
npm run dev        # dev server on http://localhost:3000
npm run build      # production build, type-checked
npm run lint       # eslint-config-next
npm run typecheck  # tsc --noEmit
```

Node 20.9 or newer is required (`.nvmrc`). There is no test suite; `npm run build` and `npm run typecheck` are the checks that matter before committing.

## Layout and the two aliases that will trip you up

This app was migrated from a Vite SPA, and two compatibility decisions still shape every import:

1. `@/pages/*` resolves to `src/screens/*`, not to a `src/pages` directory. The folder was renamed to avoid colliding with Next's Pages Router, but the alias kept its old name. When you search for a component imported from `@/pages/...`, look in `src/screens/`.
2. `react-router` and `react-router-dom` resolve to `src/lib/router-compat.tsx`, a shim over `next/navigation`. Screens import `Link`, `useNavigate`, `useParams`, and `Outlet` from `"react-router"` and that is intentional. Do not "fix" these imports to `next/link` or `next/navigation`, and do not install the real react-router.

Both aliases are declared in `tsconfig.json` and `next.config.ts`.

The rest is conventional: routes in `src/app`, shared UI in `src/components`, Redux slices in `src/store`, helpers in `src/lib`, static assets in `public`.

## Route pattern

Each public route's `page.tsx` in `src/app` is a thin server component. It exports `metadata`, renders JSON-LD through `<JsonLd>`, and delegates to a client screen in `src/screens`. Keep that split: metadata and structured data stay in the `app` wrapper, interactive code stays in the screen.

Authenticated surfaces (`/dashboard`, `/admin`, the auth pages) are client-rendered, set `robots: noindex`, and carry short plain titles. Don't add SEO copy to them.

## Where the text lives

Most user-visible text is data, not JSX:

- `src/lib/seo-pages.ts` holds titles, meta descriptions, keywords, and JSON-LD for nearly every public route. Edit here first when changing page metadata.
- `src/lib/seo.ts` has `buildMetadata()`, which turns those descriptors into Next `Metadata` objects.
- `src/screens/Integrations/data.ts` holds all fourteen integration pages (meta text, hero copy, code samples, FAQs).
- `src/screens/Comparisons/*-alternative.tsx` each hold one competitor comparison page's content.
- `public/llms.txt` and `public/llms-full.txt` are hand-maintained context files for LLM crawlers. When product facts change (pricing, pillars, integrations), update these too. They are linked from the root layout's `<head>`.
- `src/app/sitemap.ts` and `src/app/robots.ts` generate their files dynamically; blog slugs come from the API and fail open.

## Writing style for site copy

All public-facing text has been through a humanizing pass and should stay that way:

- No em dashes or en dashes in any user-visible string, including meta titles, JSON-LD, llms.txt, and code-sample comments that render on a page. Use a colon, comma, period, or parentheses instead. Page titles use `:` inside the title and `| Fluiq` for the brand suffix.
- Prefer plain constructions ("X is", "X has") over "X serves as" or "X boasts".
- Keep claims concrete: numbers, feature names, and prices rather than "powerful", "seamless", or "cutting-edge".
- Meta descriptions stay under roughly 160 characters and state facts about the page.

## Environment and deployment

`.env.development` is read by `next dev`, `.env.production` by `next build`. The only required variable is `NEXT_PUBLIC_API_BASE_URL`.

Production runs on AWS Amplify (SSR). `amplify.yml` runs `npm ci` then `npm run build` on Node 20; env vars are set in the Amplify console, not committed.

## Don't touch

- `.next/`, `dist/`, and `tsconfig.tsbuildinfo` are build output.
- `node_modules/` is huge here; scope searches to `src/`, `public/`, or specific files, or they will time out.
