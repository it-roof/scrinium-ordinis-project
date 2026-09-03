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
      // Staff-Messages: bis 50 MB je Datei (siehe lib/staff-messages/types.ts)
      bodySizeLimit: "55mb",
    },
  },
};

export default nextConfig;
