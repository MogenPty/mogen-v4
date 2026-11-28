import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  // Let proxy.ts normalize redirect sources so `/legacy/` goes directly to
  // its final destination instead of creating a Next.js slash-removal chain.
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.base44.com",
        port: "",
      },
    ],
  },
  /*
   * Disabled after the equivalent eleven rules were seeded by migration 0012.
   * Next.js config redirects execute before proxy.ts, so leaving this method
   * active would prevent administrators from changing or disabling those rules.
   *
   * ROLLBACK: set MOGEN_DATABASE_REDIRECTS_ENABLED=false, uncomment this
   * method, and redeploy. The feature flag alone does not restore these
   * config redirects. Keep this block until production HTTP parity and
   * Search Console monitoring have completed.
   *
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
      },
      // Legacy /news/* (old thin articles since removed) → the articles hub.
      {
        source: "/news/:path*",
        destination: "/articles",
        permanent: true,
      },
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
      // SEO remediation: legacy URLs with search impressions but no v4
      // equivalent page. Each target is the genuine successor surface —
      // never a blanket homepage redirect.
      {
        // Brits is a served area (no office page); the directory covers it.
        source: "/locations/brits",
        destination: "/locations",
        permanent: true,
      },
      {
        // Brits legacy sub-paths (e.g. /locations/brits/brand-identity) → directory.
        source: "/locations/brits/:path*",
        destination: "/locations",
        permanent: true,
      },
      {
        // Legacy mobile app dev service page → web development.
        source: "/services/mobile-app-development/",
        destination: "/services/web-development",
        permanent: true,
      },
      {
        // Legacy blog article → articles hub.
        source: "/blog/the-future-of-web-development-in-south-africa",
        destination: "/articles",
        permanent: true,
      },
      {
        // Legacy work showcase → the v4 approach/success-stories surface.
        source: "/portfolio",
        destination: "/success-stories",
        permanent: true,
      },
      {
        source: "/portfolio/:slug",
        destination: "/success-stories",
        permanent: true,
      },
      {
        // Legacy terms URL seen in search data.
        source: "/terms-conditions",
        destination: "/terms-of-service",
        permanent: true,
      },
      {
        source: "/terms-conditions/:slug",
        destination: "/terms-of-service",
        permanent: true,
      },
    ];
  },
  */
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
