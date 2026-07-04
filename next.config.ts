import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pawchive.pw",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.pawchive.pw",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "file.pawchive.pw",
        pathname: "/**",
      },
      // Legacy domain — keep for cached content
      {
        protocol: "https",
        hostname: "pawchive.st",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.pawchive.st",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "file.pawchive.st",
        pathname: "/**",
      },
    ],
    unoptimized: true,
  },
  // No rewrites — requests go through src/app/api/proxy/[...path]/route.ts
  // which handles session cookies, CORS headers, and Origin/Referer properly.
};

export default nextConfig;
