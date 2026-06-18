import type { NextConfig } from "next"

// `react-router` is transparently aliased to a thin compatibility shim
// (src/lib/router-compat.tsx) backed by next/navigation + next/link. This lets
// the components that still `import { Link, useNavigate, ... } from
// "react-router"` keep working without edits during the Next migration.
// Turbopack expects a project-relative specifier here (not an absolute path).
const routerShim = "./src/lib/router-compat.tsx"

const nextConfig: NextConfig = {
  // Self-contained server bundle for AWS Amplify WEB_COMPUTE (we assemble the
  // .amplify-hosting deploy manifest ourselves — see scripts/amplify-hosting.mjs
  // — instead of relying on Amplify's managed Next.js adapter, which doesn't yet
  // recognize Next 16).
  output: "standalone",

  turbopack: {
    resolveAlias: {
      "react-router": routerShim,
      "react-router-dom": routerShim,
    },
  },
}

export default nextConfig
