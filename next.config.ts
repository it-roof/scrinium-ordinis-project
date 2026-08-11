import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Bilder max. 10 MB, PDFs max. 25 MB (siehe lib/docs/upload-policy.ts)
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
