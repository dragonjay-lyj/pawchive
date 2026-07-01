import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pawchive.st",
        pathname: "/**",
      },
    ],
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: "https://pawchive.st/api/:path*",
      },
    ];
  },
};

export default nextConfig;
