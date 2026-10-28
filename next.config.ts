import { createRequire } from "node:module";
import path from "path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return process.env.VERCEL_ENV === "preview"
      ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]
      : [];
  },
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
    const rootRequire = createRequire(path.resolve(process.cwd(), "package.json"));

    config.resolve.alias = {
      ...config.resolve.alias,
      sanity$: path.join(rootNodeModules, "sanity"),
      "sanity/structure$": rootRequire.resolve("sanity/structure"),
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
