import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@scrinium/brand"],
  async redirects() {
    return [
      {
        source: "/leistungen/ki-schulung-rechtsanwalt",
        destination: "/ki-schulung-rechtsanwalt",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
