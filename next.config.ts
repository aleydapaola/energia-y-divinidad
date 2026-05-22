import path from "path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },
  webpack: (config) => {
    const rootNodeModules = path.resolve(process.cwd(), "node_modules");

    config.resolve.alias = {
      ...config.resolve.alias,
      sanity$: path.join(rootNodeModules, "sanity"),
      "sanity/structure$": path.join(rootNodeModules, "sanity/lib/structure.mjs"),
      "@sanity/vision$": path.join(rootNodeModules, "@sanity/vision"),
      "@sanity/ui$": path.join(rootNodeModules, "@sanity/ui"),
      "@sanity/icons$": path.join(rootNodeModules, "@sanity/icons"),
      react$: path.join(rootNodeModules, "react"),
      "react-dom$": path.join(rootNodeModules, "react-dom"),
      "styled-components$": path.join(rootNodeModules, "styled-components"),
    };

    return config;
  },
};

export default nextConfig;
