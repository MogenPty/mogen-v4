import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.base44.com",
        port: "",
      },
    ],
  },
};

export default nextConfig;
