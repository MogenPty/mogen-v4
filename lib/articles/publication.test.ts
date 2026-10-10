import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAllArticles,
  getArticleBySlug,
  parseArticleFile,
} from "@/lib/articles/loader";
import {
  isArticlePublished,
  isPublishedByDate,
  PUBLICATION_TIMEZONE,
  PUBLICATION_TZ_OFFSET_MS,
  publicationStartUtcMs,
} from "@/lib/articles/publication";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

// Fixed reference points (deterministic — never depend on the real clock).
const START_2026_10_08 = Date.UTC(2026, 9, 8) - 2 * 3600_000; // midnight SAST
const ANCIENT = Date.UTC(2020, 0, 1);
const FAR_FUTURE = Date.UTC(2030, 0, 1);

describe("articles — publication timezone contract", () => {
  it("publishes in Africa/Johannesburg (SAST, UTC+2, no DST)", () => {
    expect(PUBLICATION_TIMEZONE).toBe("Africa/Johannesburg");
    expect(PUBLICATION_TZ_OFFSET_MS).toBe(2 * 3600_000);
  });

  it("interprets YYYY-MM-DD as midnight SAST (22:00Z previous day)", () => {
    expect(publicationStartUtcMs("2026-10-08")).toBe(START_2026_10_08);
    expect(new Date(START_2026_10_08).toISOString()).toBe(
      "2026-10-07T22:00:00.000Z",
    );
  });

  it("has a deterministic SAST-midnight boundary", () => {
    expect(isPublishedByDate("2026-10-08", START_2026_10_08 - 1)).toBe(false);
    expect(isPublishedByDate("2026-10-08", START_2026_10_08)).toBe(true);
    expect(isPublishedByDate("2026-10-08", START_2026_10_08 + 1)).toBe(true);
  });
});

describe("articles — publication eligibility", () => {
  it("requires both non-draft and an arrived publication date", () => {
    expect(
      isArticlePublished(
        { draft: false, publishedAt: "2026-10-08" },
        START_2026_10_08,
      ),
    ).toBe(true);
    // Drafts never publish, even long after their date.
    expect(
      isArticlePublished(
        { draft: true, publishedAt: "2020-01-01" },
        FAR_FUTURE,
      ),
    ).toBe(false);
    // Future-dated articles are not published before their date...
    expect(
      isArticlePublished({ draft: false, publishedAt: "2099-01-01" }, ANCIENT),
    ).toBe(false);
    // ...but become eligible after it, with no redeploy or content change.
    expect(
      isArticlePublished(
        { draft: false, publishedAt: "2099-01-01" },
        Date.UTC(2099, 0, 1) - 2 * 3600_000,
      ),
    ).toBe(true);
  });

  it("keeps publishedAt required (missing dates fail loudly, never hide)", () => {
    const raw = `---
title: "Test Article"
slug: "test-article"
description: "A test description."
---
Body.
`;
    expect(() => parseArticleFile("test-article.mdx", raw)).toThrow(
      /publishedAt/,
    );
  });
});

describe("articles — scheduled exclusion from public surfaces", () => {
  it("excludes not-yet-published articles from the default listing", () => {
    // Before any article's publication date, the public list is empty.
    expect(getAllArticles({ nowMs: ANCIENT })).toEqual([]);
    // Well after every current date, all eight articles are visible.
    const slugs = getAllArticles({ nowMs: FAR_FUTURE }).map((a) => a.slug);
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs).toContain("web-development-in-the-brits-area");
  });

  it("keeps existing published articles visible", () => {
    for (const slug of [
      "core-web-vitals-guide",
      "google-business-profile-guide",
      "landing-page-conversion",
      "local-seo-clinic-guide",
      "local-seo-pretoria-2026",
      "restaurant-website-bookings-guide",
      "web-development-in-the-brits-area",
    ]) {
      expect(getArticleBySlug(slug, { nowMs: FAR_FUTURE })).toBeDefined();
    }
  });

  it("hides direct access to unpublished articles (no content leak)", () => {
    expect(
      getArticleBySlug("web-development-in-the-brits-area", {
        nowMs: ANCIENT,
      }),
    ).toBeUndefined();
    expect(
      getArticleBySlug("web-development-in-the-brits-area", {
        nowMs: FAR_FUTURE,
      }),
    ).toBeDefined();
  });

  it("gates the detail route (notFound before the MDX body can render)", () => {
    const route = readSource("app/articles/[slug]/page.tsx");
    expect(route).toContain("getArticleBySlug");
    expect(route).toContain("notFound()");
    // The 404 guard runs before the dynamic MDX import, so a scheduled
    // article's body can never render early.
    expect(route.indexOf("notFound()")).toBeLessThan(
      route.indexOf("await import"),
    );
  });

  it("never leaks scheduled titles via route metadata", () => {
    const route = readSource("app/articles/[slug]/page.tsx");
    // Unknown/unpublished slugs get a generic title — never frontmatter.
    expect(route).toContain("Article not found");
  });
});
