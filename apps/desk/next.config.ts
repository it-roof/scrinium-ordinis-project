import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  // Monorepo-Root für File-Tracing von @scrinium/brand
  outputFileTracingRoot: path.join(configDir, "../.."),
  transpilePackages: ["@scrinium/brand"],
  experimental: {
    serverActions: {
      // Bilder max. 10 MB, PDFs max. 25 MB (siehe lib/docs/upload-policy.ts)
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
