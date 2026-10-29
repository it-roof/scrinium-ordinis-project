import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: false,
  serverExternalPackages: [
    "@aws-sdk/client-bedrock-runtime",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
    "pdfkit",
    "docx",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
