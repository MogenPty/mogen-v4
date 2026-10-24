"use client";

import { usePathname } from "next/navigation";

/**
 * Resolve a homepage section link for the current route.
 *
 * The Services and Work sections only exist on the homepage, so a link
 * to one of them is homepage-local. On the homepage we use a bare
 * `#section` href so the browser jumps straight to the section. On every
 * other route we keep the `/#section` form so the link still navigates
 * home and lands on the right section. (The Growth Audit moved to the SEO
 * service page in Phase 3, so its links point at `/services/seo/#audit`
 * and pass through untouched on every route.)
 */
export function useAnchorHref(): (href: string) => string {
  const pathname = usePathname();

  return (href: string) =>
    pathname === "/" && href.startsWith("/#") ? href.slice(1) : href;
}
