import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  /* config options here */
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
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
        source: "/blog",
        destination: "/articles",
        permanent: true,
      },
      {
        source: "/blog/:slug",
        destination: "/articles/:slug",
        permanent: true,
      },      {
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

const withMDX = createMDX({
  options: {
    // Plugin names as strings: remark/rehype functions are not serializable
    // and Turbopack requires serializable MDX options (see Next.js MDX docs).
    // remark-frontmatter MUST come first: @next/mdx does not strip YAML
    // frontmatter by default, so without it the `---` fences render as
    // <hr/> rules and the key: value lines render as article text.
    // Metadata still comes from gray-matter in lib/articles/loader.ts.
    remarkPlugins: ["remark-frontmatter", "remark-gfm"],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
