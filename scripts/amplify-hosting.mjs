// Assemble the AWS Amplify Hosting (WEB_COMPUTE) deployment bundle from Next's
// standalone output. Amplify's managed Next.js adapter doesn't recognize Next 16
// yet, so we build the `.amplify-hosting/deploy-manifest.json` ourselves.
//
// Layout produced:
//   .amplify-hosting/
//     deploy-manifest.json
//     static/_next/static/...        (immutable assets served from the CDN)
//     compute/default/               (standalone Node server: server.js + deps)
//
// Run after `next build` (see amplify.yml).

import { cpSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs"

const OUT = ".amplify-hosting"
const COMPUTE = `${OUT}/compute/default`

rmSync(OUT, { recursive: true, force: true })
mkdirSync(COMPUTE, { recursive: true })
mkdirSync(`${OUT}/static`, { recursive: true })

// Compute: the standalone server (server.js, traced node_modules, .next/server, package.json)
cpSync(".next/standalone", COMPUTE, { recursive: true })
// standalone intentionally omits static assets and public/ — the server still needs them at runtime
cpSync(".next/static", `${COMPUTE}/.next/static`, { recursive: true })
if (existsSync("public")) cpSync("public", `${COMPUTE}/public`, { recursive: true })

// CDN: serve hashed, immutable build assets from the edge
cpSync(".next/static", `${OUT}/static/_next/static`, { recursive: true })

const nextVersion = JSON.parse(
  readFileSync("node_modules/next/package.json", "utf8"),
).version

const manifest = {
  version: 1,
  framework: { name: "next", version: nextVersion },
  routes: [
    {
      path: "/_next/static/*",
      target: { kind: "Static", cacheControl: "public, max-age=31536000, immutable" },
    },
    {
      // Everything else (pages, app routes, dynamic sitemap/robots, public files,
      // image optimization) is served by the Next server.
      path: "/*",
      target: { kind: "Compute", src: "default" },
    },
  ],
  computeResources: [
    { name: "default", runtime: "nodejs20.x", entrypoint: "server.js" },
  ],
}

writeFileSync(`${OUT}/deploy-manifest.json`, JSON.stringify(manifest, null, 2) + "\n")
console.log(`✓ assembled ${OUT} (next ${nextVersion})`)
