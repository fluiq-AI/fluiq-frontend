import type { NextConfig } from "next"

// `react-router` is transparently aliased to a thin compatibility shim
// (src/lib/router-compat.tsx) backed by next/navigation + next/link. This lets
// the components that still `import { Link, useNavigate, ... } from
// "react-router"` keep working without edits during the Next migration.
// Turbopack expects a project-relative specifier here (not an absolute path).
const routerShim = "./src/lib/router-compat.tsx"

const nextConfig: NextConfig = {
  // Build despite type errors so the migration can land incrementally.
  // Tighten this back up once the tree is clean.
  typescript: { ignoreBuildErrors: true },

  turbopack: {
    resolveAlias: {
      "react-router": routerShim,
      "react-router-dom": routerShim,
    },
  },
}

export default nextConfig
