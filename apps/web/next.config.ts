import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shared workspace package ships TypeScript source, so let Next compile it.
  transpilePackages: ["@habit/core"],
};

export default nextConfig;
