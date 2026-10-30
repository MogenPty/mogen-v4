import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SERVICES } from "@/data/services";
import { getAllArticles } from "@/lib/articles/loader";
import { getTagArchives, slugifyTag } from "@/lib/articles/tags";

/**
 * Guards the `pnpm articles:link` contract: every `/articles/tag/*` link in
 * an article body must (a) match one of that file's own frontmatter tags and
 * (b) resolve to a non-empty published archive — so an article that links to
 * a tag always appears in that tag's listing.
 */
describe("entity links — tag bidirectionality", () => {
  it("links only to own frontmatter tags with live archives", () => {
    const dir = join(process.cwd(), "articles");
    const archives = getTagArchives(getAllArticles());
    const problems: string[] = [];
    for (const f of readdirSync(dir)
      .filter((x) => x.endsWith(".mdx"))
      .sort()) {
      const src = readFileSync(join(dir, f), "utf8").replace(/\r\n/g, "\n");
      const fm = src.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
      const tagsBlock = fm.match(/^tags:\n((?:[ \t]*- .*\n?)+)/m);
      const tags = tagsBlock
        ? Array.from(
            tagsBlock[1].matchAll(/-\s*["']?([^"'\n]+?)["']?\s*$/gm),
          ).map((x) => x[1].trim())
        : [];
      const own = new Set(tags.map(slugifyTag));
      const body = src.slice(src.indexOf(fm) + fm.length);
      const linked = new Set(
        Array.from(
          body.matchAll(/\(["']?\/articles\/tag\/([^)"']+)["']?\)/g),
        ).map((x) => decodeURIComponent(x[1]).replace(/\/$/, "")),
      );
      for (const slug of linked) {
        if (!own.has(slug))
          problems.push(`${f}: links to "${slug}" (missing from frontmatter)`);
        const archive = archives.get(slug);
        if (!archive || archive.articles.length === 0)
          problems.push(`${f}: "${slug}" has no published archive`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("has no dead /services/* links in article bodies", () => {
    const valid = new Set(SERVICES.map((s) => s.slug));
    const dir = join(process.cwd(), "articles");
    const dead: string[] = [];
    for (const f of readdirSync(dir)
      .filter((x) => x.endsWith(".mdx"))
      .sort()) {
      const body = readFileSync(join(dir, f), "utf8").replace(/\r\n/g, "\n");
      for (const m of body.matchAll(/\(["']?\/services\/([^)"']+)["']?\)/g)) {
        // Strip a trailing fragment/anchor (e.g. /services/seo#audit) so
        // anchor links to a valid service page don't get flagged as dead.
        const slug = m[1].split("#")[0].replace(/\/+$/, "");
        if (!valid.has(slug)) dead.push(`${f}: /services/${m[1]}`);
      }
    }
    expect(dead).toEqual([]);
  });
});
