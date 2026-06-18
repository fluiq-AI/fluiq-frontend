import type { NextConfig } from "next"

const routerShim = "./src/lib/router-compat.tsx"

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias["react-router"] = routerShim
    config.resolve.alias["react-router-dom"] = routerShim
    return config
  },
}

export default nextConfig