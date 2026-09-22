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
  async redirects() {
    return [
      {
        source: "/services/brand-identity",
        destination: "/services/business-documentation",
        permanent: true,
      },
      {
        source: "/services/seo-services",
        destination: "/services/seo",
        permanent: true,
      },
      {
        source: "/services/mobile-development",
        destination: "/services",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
