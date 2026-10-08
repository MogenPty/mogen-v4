/**
 * Generate the canonical article metadata index.
 *
 * Scans `articles/*.mdx` and embeds each file verbatim into
 * `lib/articles/generated-index.json` as `{ fileName, raw }` entries.
 *
 * Why this exists: `/articles` is dynamically rendered (it reads
 * `searchParams` for pagination), so in production it executes on a
 * serverless function where the loose `articles/*.mdx` files are NOT
 * guaranteed to be present on the runtime filesystem (Next.js output
 * file-tracing cannot follow the variable `fs.readdir`/`readFileSync`
 * paths in the loader). The individual `/articles/[slug]` routes kept
 * working because they are statically prerendered at build time (when
 * the full filesystem IS available) and their MDX bodies are bundled
 * by webpack — while the index silently scanned an absent directory
 * and returned `[]`.
 *
 * The generated JSON is statically imported by `lib/articles/loader.ts`,
 * so webpack bundles it into every server function: the same MDX source
 * of truth, but available at runtime without filesystem access.
 *
 * Validation is deliberately NOT duplicated here. Frontmatter is validated
 * by `parseArticleFile()` in the loader at build time (via
 * `generateStaticParams` and the sitemap), which fails fast with the exact
 * filename. This script only embeds raw file content, deterministically
 * (sorted by filename, stable JSON) so re-running it never dirties git.
 *
 * Runs automatically via `prebuild`/`predev` (see package.json) and
 * manually via `pnpm articles:sync`.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = join(repoRoot, "articles");
const outFile = join(repoRoot, "lib", "articles", "generated-index.json");

if (!existsSync(articlesDir)) {
  console.error(
    `generate-articles-index: directory not found: ${articlesDir}\n` +
      `The MDX articles must live in <repo>/articles/ relative to the project root.`,
  );
  process.exit(1);
}

const files = readdirSync(articlesDir)
  .filter((f) => f.endsWith(".mdx"))
  .sort((a, b) => a.localeCompare(b));

const entries = files.map((fileName) => ({
  fileName,
  raw: readFileSync(join(articlesDir, fileName), "utf8"),
}));

writeFileSync(outFile, `${JSON.stringify(entries, null, 2)}\n`);

console.log(
  `generate-articles-index: ${entries.length} article(s) -> lib/articles/generated-index.json`,
);
