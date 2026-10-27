#!/usr/bin/env node
/**
 * Single build hook that fixes every article and attaches images.
 *
 * Runs, in order:
 *   1. scripts/normalize-articles.mjs --apply
 *        Frontmatter schema (`---` markers, `publishedAt`/`updatedAt`,
 *        spaced quoted tags), removes legacy `content: |` + duplicate-title
 *        H1, attaches a category hero image when missing, validates lengths.
 *   2. scripts/link-article-entities.mjs --apply
 *        Rewrites body links (locations, services, tags) and backfills tags.
 *   3. scripts/generate-articles-index.mjs
 *        Rebuilds the bundled article index used at runtime.
 *
 * Hooked into `prebuild`/`predev`/`articles:sync` so that even an MDX file
 * dropped straight into GitHub (or missed by an author) is fixed and given
 * the appropriate image before the build bundles it.
 *
 * Usage:
 *   node scripts/fix-articles.mjs
 */
import { spawnSync } from "node:child_process";

const SCRIPTS = [
  ["scripts/normalize-articles.mjs", "--apply"],
  ["scripts/link-article-entities.mjs", "--apply"],
  ["scripts/generate-articles-index.mjs"],
];

let ok = true;
for (const [script, ...args] of SCRIPTS) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    ok = false;
    break;
  }
}

process.exit(ok ? 0 : 1);
