/**
 * Normalize article frontmatter + validate required lengths.
 *
 * Fixes the recurring manual edits authors make:
 *   1. `date:` -> `publishedAt:` and `update:` -> `updatedAt:` (in MDX frontmatter).
 *   2. kebab-case tags (`digital-marketing`) -> spaced, quoted tags
 *      (`"digital marketing"`).
 *   3. Validates that `title` and `description` are within the required
 *      lengths (title <= 60 chars, description <= 160 chars) and non-empty.
 *      Length violations cannot be auto-fixed, so they are reported and the
 *      script exits non-zero (deployment must be rejected).
 *
 * Runs alongside tag syncing (`pnpm articles:link`) and during the build
 * (`prebuild`/`predev`) so un-normalised files never reach production.
 *
 * Usage:
 *   node scripts/normalize-articles.mjs            # dry-run report
 *   node scripts/normalize-articles.mjs --apply    # write files
 *   node scripts/normalize-articles.mjs --check     # exit 1 if changes/violations
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");

const TITLE_MAX = 52; // frontmatter title max so final title (with " | Mogen") ≤ 60
const DESCRIPTION_MAX = 160;

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(repoRoot, "articles");

function detectEol(raw) {
  return raw.includes("\r\n") ? "\r\n" : "\n";
}

const files = fs.readdirSync(articlesDir).filter((f) => f.endsWith(".mdx")).sort();

let changed = 0;
let pending = 0;
const violations = [];

for (const f of files) {
  const filePath = path.join(articlesDir, f);
  const raw = fs.readFileSync(filePath, "utf8");
  const eol = detectEol(raw);
  const norm = raw.replace(/\r\n/g, "\n");
  const m = norm.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) {
    console.log(`${f}: NO FRONTMATTER, skipped`);
    continue;
  }
  let fm = m[1];
  const body = norm.slice(m[0].length);
  const originalFm = fm;
  const actions = [];

  // 1. Rename date/update keys (only when canonical key absent).
  const hasPublishedAt = /^publishedAt:/m.test(fm);
  const hasUpdatedAt = /^updatedAt:/m.test(fm);
  if (!hasPublishedAt) {
    fm = fm.replace(/^date:[ \t]*(.*)$/m, (_l, v) => {
      actions.push("rename date -> publishedAt");
      return `publishedAt: ${v.trim()}`;
    });
  }
  if (!hasUpdatedAt) {
    let renamed = false;
    fm = fm.replace(/^update:[ \t]*(.*)$/m, (_l, v) => {
      renamed = true;
      actions.push("rename update -> updatedAt");
      return `updatedAt: ${v.trim()}`;
    });
    if (!renamed) {
      fm = fm.replace(/^updated:[ \t]*(.*)$/m, (_l, v) => {
        actions.push("rename updated -> updatedAt");
        return `updatedAt: ${v.trim()}`;
      });
    }
  }

  // 2. Normalize kebab-case tags to spaced, quoted tags.
  const tagsBlockRe = /^tags:\n((?:[ \t]*- .*\n?)+)/m;
  const tm = fm.match(tagsBlockRe);
  if (tm) {
    const indent = (tm[1].match(/^([ \t]*)- /m) || [])[1] || "  ";
    const newItems = tm[1].replace(/^([ \t]*- )(.*)$/gm, (line, prefix, value) => {
      let v = value.trim();
      // strip surrounding quotes
      const quoted = /^["'](.*)["']$/.exec(v);
      if (quoted) v = quoted[1];
      // kebab-case -> spaced
      if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(v)) {
        const spaced = v.replace(/-/g, " ");
        actions.push(`tag ${JSON.stringify(v)} -> ${JSON.stringify(spaced)}`);
        return `${prefix}"${spaced}"`;
      }
      // ensure quoting for unquoted multi-word tags (house style)
      if (!/^["']/.test(value.trim())) {
        return `${prefix}"${v}"`;
      }
      return line;
    });
    fm = fm.replace(tagsBlockRe, () => `tags:\n${newItems}`);
  }

  // 3. Validate title / description lengths.
  const titleM = fm.match(/^title:\s*"([^"]*)"/m);
  const descM = fm.match(/^description:\s*"([^"]*)"/m);
  const title = titleM ? titleM[1] : null;
  const description = descM ? descM[1] : null;
  if (title === null || title.trim().length === 0) {
    violations.push({ file: f, rule: "title must be non-empty" });
  } else if (title.length > TITLE_MAX) {
    violations.push({
      file: f,
      rule: `title is ${title.length} characters (max ${TITLE_MAX})`,
    });
  }
  if (description === null || description.trim().length === 0) {
    violations.push({
      file: f,
      rule: "description must be non-empty",
    });
  } else if (description.length > DESCRIPTION_MAX) {
    violations.push({
      file: f,
      rule: `description is ${description.length} characters (max ${DESCRIPTION_MAX})`,
    });
  }

  const changedThis = fm !== originalFm;
  if (changedThis) {
    pending += 1;
    console.log(`${f}:`);
    // dedupe action noise
    const uniq = [...new Set(actions)];
    uniq.forEach((a) => console.log(`    ${a}`));
  }

  if (APPLY && changedThis) {
    const out = `---\n${fm}\n---\n${body}`;
    // invariant: body unchanged
    fs.writeFileSync(filePath, eol === "\r\n" ? out.replace(/\n/g, "\r\n") : out, "utf8");
    changed += 1;
  }
}

if (violations.length > 0) {
  console.error("\nnormalize-articles: VALIDATION FAILED — deployment rejected");
  console.error("The following files violate required title/description lengths:\n");
  for (const v of violations) {
    console.error(`  ${v.file}: ${v.rule}`);
  }
  process.exit(1);
}

if (APPLY) console.log(`\nAPPLIED normalization to ${changed} file(s)`);
else console.log(`\nDRY-RUN: ${pending} file(s) would change (pass --apply to write)`);
if (CHECK) process.exit(pending > 0 ? 1 : 0);
