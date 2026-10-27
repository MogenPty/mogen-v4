/**
 * Normalize article frontmatter + validate required lengths.
 *
 * Fixes the recurring manual edits authors make:
 *   1. Missing frontmatter markers (`---`) on legacy/flat MDX files — the
 *      leading `key: value` block up to the `content:` separator is wrapped
 *      in `---` ... `---`.
 *   2. The `content: |` block scalar and any leading H1 that duplicates the
 *      frontmatter title are removed from the body (the frontmatter title is
 *      the page header).
 *   3. `date:` -> `publishedAt:` and `updated:`/`update:` -> `updatedAt:`.
 *   4. kebab-case tags (`digital-marketing`) -> spaced, quoted tags
 *      (`"digital marketing"`).
 *   5. A category hero image is attached when none is defined, using a random
 *      image matching the category's glob in `public/images/articles/`.
 *
 * Validates that `title` and `description` are within the required lengths
 * (title <= 60 chars incl. " | Mogen" suffix => 52 here, description <= 160)
 * and non-empty. Length violations cannot be auto-fixed, so they are
 * reported and the script exits non-zero (deployment must be rejected).
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

// Comma-separated filenames whose title/description length violations are
// reported as warnings instead of build failures. Use when you need to ship a
// post on time and will tidy the title/description later:
//   node scripts/normalize-articles.mjs --apply --ignore-length-check=foo.mdx,bar.mdx
const ignoreLengthFlag = process.argv.find((a) => a.startsWith("--ignore-length-check="));
const IGNORE_LENGTH = ignoreLengthFlag
  ? new Set(ignoreLengthFlag.slice("--ignore-length-check=".length).split(",").map((s) => s.trim()).filter(Boolean))
  : new Set();

const TITLE_MAX = 52; // frontmatter title max so final title (with " | Mogen") ≤ 60
const DESCRIPTION_MAX = 160;

// Category -> glob of candidate hero images in public/images/articles/.
// The build picks a random match and attaches it to any article of that
// category that does not already define a heroImage, so dropping in new
// images requires no script change beyond adding the glob here.
const CATEGORY_IMAGE_GLOBS = {
  "Web Development": "*web-development-workspace*.png",
  "SEO": "*seo*.png",
  "Digital Marketing": "*digital-marketing*.png",
  "Business Documentation": "*business-documentation*.png",
};

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(repoRoot, "articles");
const imagesDir = path.join(repoRoot, "public", "images", "articles");

function detectEol(raw) {
  return raw.includes("\r\n") ? "\r\n" : "\n";
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function globToRegex(glob) {
  let re = "";
  for (const ch of glob) {
    if (ch === "*") re += ".*";
    else if (ch === "?") re += ".";
    else re += escapeRegExp(ch);
  }
  return new RegExp(`^${re}$`);
}

function imageAltFromFile(file) {
  let name = file.replace(/\.[^/.]+$/, ""); // strip extension
  name = name.replace(/-/g, " ").replace(/_/g, " ");
  name = name.replace(/\s+\d+$/, ""); // drop trailing "-1", "-2", ...
  return name
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function insertAfterKey(fm, key, lines) {
  const re = new RegExp(`(^${escapeRegExp(key)}:.*$\n)`, "m");
  if (re.test(fm)) return fm.replace(re, (m) => m + lines);
  return (fm.endsWith("\n") ? fm : fm + "\n") + lines;
}

function frontmatterTitle(fm) {
  const m = fm.match(/^title:[ \t]*"([^"]*)"/m);
  return m ? m[1] : null;
}

function dedentBody(text) {
  const lines = text.split("\n");
  let start = 0;
  while (start < lines.length && lines[start].trim() === "") start++;
  const nonEmpty = lines.slice(start).filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return lines.slice(start).join("\n");
  const minIndent = Math.min(
    ...nonEmpty.map((l) => {
      const m = /^[ \t]*/.exec(l);
      return m ? m[0].length : 0;
    }),
  );
  return lines.slice(start).map((l) => l.slice(minIndent)).join("\n");
}

function stripDuplicateTitleH1(body, title) {
  if (!title) return body;
  const lines = body.split("\n");
  const idx = lines.findIndex((l) => l.trim().length > 0);
  if (idx === -1) return body;
  const m = lines[idx].match(/^#{1,6}[ \t]+(.*)$/);
  if (m && m[1].trim() === title.trim()) lines[idx] = "";
  return lines.join("\n");
}

/** Convert a legacy flat MDX file (no `---` markers) to frontmatter + body. */
function convertLegacyFormat(norm) {
  const lines = norm.split("\n");
  const contentIdx = lines.findIndex((l) => /^content:[ \t]*\|?[ \t]*$/.test(l));
  if (contentIdx === -1) return null;
  const fm = lines.slice(0, contentIdx).join("\n");
  let body = lines.slice(contentIdx + 1).join("\n");
  body = dedentBody(body);
  body = stripDuplicateTitleH1(body, frontmatterTitle(fm));
  return { fm, body };
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

  // --- Split into frontmatter + body -------------------------------------
  let fm, body;
  const fmMatch = norm.match(/^---\n([\s\S]*?)\n---\n/);
  if (fmMatch) {
    fm = fmMatch[1];
    body = norm.slice(fmMatch[0].length);
  } else {
    // Legacy flat format: key: value frontmatter at the top, a `content:`
    // separator line, then the body (often indented under a block scalar).
    const converted = convertLegacyFormat(norm);
    if (!converted) {
      console.log(`${f}: NO FRONTMATTER OR CONTENT SEPARATOR, skipped`);
      continue;
    }
    fm = converted.fm;
    body = converted.body;
  }

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
      const quoted = /^["'](.*)["']$/.exec(v);
      if (quoted) v = quoted[1];
      if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(v)) {
        const spaced = v.replace(/-/g, " ");
        actions.push(`tag ${JSON.stringify(v)} -> ${JSON.stringify(spaced)}`);
        return `${prefix}"${spaced}"`;
      }
      if (!/^["']/.test(value.trim())) {
        return `${prefix}"${v}"`;
      }
      return line;
    });
    fm = fm.replace(tagsBlockRe, () => `tags:\n${newItems}`);
  }

  // 3. Attach a category hero image when none is defined.
  const categoryM = fm.match(/^category:[ \t]*"([^"]*)"/m);
  const category = categoryM ? categoryM[1] : null;
  const glob = category ? CATEGORY_IMAGE_GLOBS[category] : null;
  const hasHeroImage = /^heroImage:/m.test(fm);
  if (glob && !hasHeroImage && fs.existsSync(imagesDir)) {
    const candidates = fs
      .readdirSync(imagesDir)
      .filter((file) => globToRegex(glob).test(file));
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const alt = imageAltFromFile(pick);
      fm = insertAfterKey(
        fm,
        "featured",
        `heroImage: "/images/articles/${pick}"\nheroImageAlt: "${alt}"\n`,
      );
      actions.push(`attach image /images/articles/${pick} for category "${category}"`);
    } else {
      console.log(
        `${f}: no image matching "${glob}" for category "${category}"`,
      );
    }
  }

  // 4. Validate title / description lengths.
  const titleM = fm.match(/^title:\s*"([^"]*)"/m);
  const descM = fm.match(/^description:\s*"([^"]*)"/m);
  const title = titleM ? titleM[1] : null;
  const description = descM ? descM[1] : null;
  if (title === null || title.trim().length === 0) {
    violations.push({ file: f, rule: "title must be non-empty" });
  } else if (title.length > TITLE_MAX) {
    const rule = `title is ${title.length} characters (max ${TITLE_MAX})`;
    if (IGNORE_LENGTH.has(f)) {
      console.warn(`${f}: LENGTH WARNING (ignored): ${rule}`);
    } else {
      violations.push({ file: f, rule });
    }
  }
  if (description === null || description.trim().length === 0) {
    violations.push({ file: f, rule: "description must be non-empty" });
  } else if (description.length > DESCRIPTION_MAX) {
    const rule = `description is ${description.length} characters (max ${DESCRIPTION_MAX})`;
    if (IGNORE_LENGTH.has(f)) {
      console.warn(`${f}: LENGTH WARNING (ignored): ${rule}`);
    } else {
      violations.push({ file: f, rule });
    }
  }

  const changedThis = fm !== originalFm;
  if (changedThis) {
    pending += 1;
    console.log(`${f}:`);
    const uniq = [...new Set(actions)];
    uniq.forEach((a) => console.log(`    ${a}`));
  }

  if (APPLY && changedThis) {
    const out = `---\n${fm}\n---\n${body}`;
    // invariant: body unchanged apart from legacy dedent/H1 removal
    fs.writeFileSync(
      filePath,
      eol === "\r\n" ? out.replace(/\n/g, "\r\n") : out,
      "utf8",
    );
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
