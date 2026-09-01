import type { NextConfig } from "next"

const routerShim = "./src/lib/router-compat.tsx"

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias["react-router"] = routerShim
    config.resolve.alias["react-router-dom"] = routerShim
    return config
  },

  async redirects() {
    return [
      {
        // /benchmark was a real page until the guardrail results moved into the
        // blog post. It shipped in the sitemap at priority 0.9 and the report
        // PDF circulated while it was live, so the URL still has inbound links
        // and index history pointing at a 404.
        //
        // 301 rather than `permanent: true`, which Next serves as a 308. Both
        // are permanent and Google treats them alike, but the host-level
        // redirects in src/middleware.ts deliberately use 301 as the signal
        // every crawler and SEO tool reads without ambiguity. One redirect
        // status across the site beats two that need explaining.
        source: "/benchmark",
        destination: "/blog/we-published-a-guardrail-benchmark-we-dont-win",
        statusCode: 301,
      },
    ]
  },
}

export default nextConfig