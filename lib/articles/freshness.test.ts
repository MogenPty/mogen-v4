import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getPost, getPosts } from "@/data/blog";
import { getAllArticles } from "@/lib/articles/loader";

let dirs: string[] = [];

afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

function makeArticlesRoot(): string {
  const cwd = mkdtempSync(join(tmpdir(), "mogen-fresh-"));
  mkdirSync(join(cwd, "articles"));
  dirs.push(cwd);
  return cwd;
}

function writeArticle(cwd: string, slug: string, extra = ""): void {
  writeFileSync(
    join(cwd, "articles", `${slug}.mdx`),
    `---\ntitle: "Title for ${slug}"\nslug: "${slug}"\ndescription: "Description for ${slug}."\npublishedAt: "2026-10-07"\n${extra}---\n\nBody for ${slug}.\n`,
  );
}

describe("articles — newly added files are picked up without restarts", () => {
  it("loader sees a file added between reads", () => {
    const cwd = makeArticlesRoot();
    writeArticle(cwd, "first-post");
    expect(getAllArticles({ cwd }).map((a) => a.slug)).toEqual(["first-post"]);
    writeArticle(cwd, "second-post");
    expect(getAllArticles({ cwd }).map((a) => a.slug).sort()).toEqual(
      ["first-post", "second-post"].sort(),
    );
  });

  it("getPosts/getPost see newly added files (listing uses these)", () => {
    const cwd = makeArticlesRoot();
    writeArticle(cwd, "alpha");
    expect(getPosts({ cwd }).map((p) => p.slug)).toEqual(["alpha"]);
    expect(getPost("beta", { cwd })).toBeUndefined();
    writeArticle(cwd, "beta");
    expect(getPosts({ cwd }).map((p) => p.slug).sort()).toEqual(["alpha", "beta"]);
    expect(getPost("beta", { cwd })?.title).toBe("Title for beta");
  });

  it("a malformed new file fails loudly instead of vanishing", () => {
    const cwd = makeArticlesRoot();
    writeArticle(cwd, "good-post");
    writeFileSync(
      join(cwd, "articles", "bad-post.mdx"),
      `---\nslug: "bad-post"\n---\nNo title or description.\n`,
    );
    expect(() => getPosts({ cwd })).toThrow(/bad-post\.mdx/);
  });

  it("listing components read fresh data (no stale module snapshot)", () => {
    const block = readSourceSafe("components/mogen/blog-block.tsx");
    expect(block).not.toMatch(/getLatestFeaturedPost\(POSTS\)/);
    const preview = readSourceSafe("components/mogen/articles-preview.tsx");
    expect(preview).not.toContain("POSTS");
    const detail = readSourceSafe("components/mogen/blog-post-block.tsx");
    expect(detail).not.toContain("POSTS");
  });
});

function readSourceSafe(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}
