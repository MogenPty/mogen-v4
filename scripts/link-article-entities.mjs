/**
 * Link article entities (locations, services, tags) inside `articles/*.mdx`.
 *
 * Why this exists: internal links were added by hand and drifted (dead
 * `/services/*` slugs, stale tag links, new tags never backfilled into old
 * articles). Run `pnpm articles:link` after adding or editing articles
 * instead of linking manually.
 *
 * What it does per file (first plain-text occurrence each, never removes):
 *
 *   normalize — repoints body links to dead/renamed targets:
 *     - `[Service Name](/articles/tag/...)` whose text is exactly a canonical
 *       service name becomes a service link (house style: service names point
 *       at service pages; tag archives are reached via tag chips).
 *     - known dead service slugs (digital-services, website-development)
 *       are repaired to their canonical targets.
 *   locations — office place names (Maboloka, Soshanguve, Centurion) link to
 *     `/locations/<slug>`. Place names NEVER link to tag archives.
 *   services  — canonical service names link to `/services/<slug>`. The
 *     `services:` frontmatter field is NEVER touched (it drives the
 *     related-articles sections on service pages).
 *   tags      — any known tag mentioned in the body links to
 *     `/articles/tag/<slug>`. If the tag is missing from that file's
 *     frontmatter it is appended (lowercase, quoted) so the article joins the
 *     archive it links to — bidirectionality is guaranteed, which also
 *     backfills old articles when new tags appear.
 *
 * Protected spans (never link targets): existing markdown links, fenced code
 * blocks, inline code, HTML tags, headings, MDX import/export lines.
 * Matching is case-insensitive; original casing is kept as link text.
 *
 * Vocabulary sources (single source of truth, parsed — not duplicated):
 *   - services:  `data/services.ts`  (top-level SERVICES slug/name pairs)
 *   - locations: `data/locations.ts` (LOCATION_DETAILS slug/name pairs)
 *   - tags:      every article's own `tags:` frontmatter list
 *
 * Safety: dry-run by default; `--apply` writes. Every written file keeps its
 * exact line count, ignoring added frontmatter tag lines (blank-line loss
 * aborts that file). Run `pnpm articles:sync` afterwards — the generated
 * index embeds raw MDX.
 *
 * Usage:
 *   node scripts/link-article-entities.mjs                 # dry-run report
 *   node scripts/link-article-entities.mjs --apply        # write files
 *   node scripts/link-article-entities.mjs --apply --no-backfill
 *     # link only; never writes frontmatter tags (breaks bidirectionality
 *     # for newly linked tags — prefer the default, then trim frontmatter
 *     # by hand if an archive grouping looks wrong)
 *   node scripts/link-article-entities.mjs --only=tags --apply
 *   node scripts/link-article-entities.mjs --check         # exit 1 if pending
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");
const NO_BACKFILL = process.argv.includes("--no-backfill");

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
// Max frontmatter tags per article. The script may only ADD tags up to this
// total; manually added tags beyond the limit stay untouched (and block
// further additions). Override with ARTICLES_MAX_TAGS (see .env.example).
const MAX_TAGS = parsePositiveInt(process.env.ARTICLES_MAX_TAGS, 8);
const onlyArg = (process.argv.find((a) => a.startsWith("--only=")) || "")
  .slice("--only=".length)
  .split(",")
  .filter(Boolean);
const ONLY = new Set(onlyArg);
const runPhase = (name) => ONLY.size === 0 || ONLY.has(name);

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(repoRoot, "articles");

function slugifyTag(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phrasePattern(phrase) {
  return new RegExp(
    `(?<!\\w)${escapeRegExp(phrase).replace(/\s+/g, "\\s+")}(?!\\w)`,
    "i",
  );
}

// --- Vocabulary -----------------------------------------------------------

function readRepo(relative) {
  return fs.readFileSync(path.join(repoRoot, relative), "utf8").replace(/\r\n/g, "\n");
}

const SERVICES = Array.from(
  readRepo(path.join("data", "services.ts")).matchAll(
    /^    slug: "([^"]+)",\n    name: "([^"]+)",/gm,
  ),
).map((m) => ({ slug: m[1], name: m[2] }));
if (SERVICES.length === 0) {
  console.error("link-article-entities: no services parsed — aborting.");
  process.exit(1);
}

const LOCATIONS = Array.from(
  readRepo(path.join("data", "locations.ts")).matchAll(
    /^  ([a-z0-9-]+): \{\n    slug: "\1",\n    name: "([^"]+)",/gm,
  ),
).map((m) => ({ slug: m[0].split(":")[0].trim(), name: m[1] }));
if (LOCATIONS.length === 0) {
  console.error("link-article-entities: no locations parsed — aborting.");
  process.exit(1);
}
const OFFICE_SLUGS = new Set(LOCATIONS.map((l) => l.slug));

// Dead service targets observed in the wild -> canonical target.
const SERVICE_REPAIRS = {
  "digital-services": "digital-marketing",
  "website-development": "web-development",
};

// --- Service inference mirror ------------------------------------------------
// Tags drive service inference (lib/articles/related.ts) when an article has
// no explicit `services:` frontmatter. The keyword table is loaded from the
// source of truth — never duplicated — so the drift check below cannot rot.
function loadServiceKeywords() {
  const src = readRepo(path.join("lib", "articles", "related.ts"));
  const m = src.match(
    /const SERVICE_KEYWORDS: Record<string, string\[\]> = (\{[\s\S]*?\n\});/,
  );
  if (!m) throw new Error("link-article-entities: SERVICE_KEYWORDS not found");
  return new Function(`return (${m[1]});`)();
}
const SERVICE_KEYWORDS = loadServiceKeywords();

function inferServices(tags, category) {
  const hay = [category ?? "", ...tags].map((s) => s.toLowerCase());
  const matched = new Set();
  for (const [slug, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    if (keywords.some((kw) => hay.some((h) => h === kw || h.includes(kw)))) {
      matched.add(slug);
    }
  }
  return matched;
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

// --- Span splitting -------------------------------------------------------

function splitSpans(body) {
  const spans = [];
  const push = (text, plain) => spans.push({ text, plain });
  const lines = body.split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isFence = /^\s*```/.test(line);
    if (isFence) inFence = !inFence;
    if (isFence || inFence) {
      push(line, false);
      if (i < lines.length - 1) push("\n", false);
      continue;
    }
    if (/^\s*#{1,6}\s/.test(line) || /^\s*(import|export)\s/.test(line)) {
      push(line, false);
      if (i < lines.length - 1) push("\n", false);
      continue;
    }
    const re = /(\[[^\]]*\]\([^)]*\)|`[^`]*`|<[^>\n]+>)/g;
    let lastIdx = 0;
    let m;
    let emitted = false;
    while ((m = re.exec(line)) !== null) {
      if (m.index > lastIdx) {
        push(line.slice(lastIdx, m.index), true);
        emitted = true;
      }
      push(m[0], false);
      emitted = true;
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < line.length) {
      push(line.slice(lastIdx), true);
      emitted = true;
    }
    if (!emitted) push("", true);
    if (i < lines.length - 1) push("\n", false);
  }
  return spans;
}

// --- Per-file state (frontmatter + body, reconstructed as fm + body) ------

function loadState(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  return { filePath, fm: m[0], body: raw.slice(m[0].length) };
}

// A tags block may use any consistent item indent (2-space, 4-space or
// none have all been observed) — appends reuse the block's own indent.
const TAGS_BLOCK_RE = /^tags:\n((?:[ \t]*- .*\n?)+)/m;

function parseTags(fm) {
  const tm = fm.match(TAGS_BLOCK_RE);
  if (!tm) return null;
  return Array.from(tm[1].matchAll(/-\s*["']?([^"'\n]+?)["']?\s*$/gm)).map((x) =>
    x[1].trim(),
  );
}

function addTagToFrontmatter(state, tag) {
  const block = state.fm.match(TAGS_BLOCK_RE);
  if (block) {
    // Reuse the block's own item indent (2-space, 4-space or none).
    const indent = block[1].match(/^([ \t]*)- /m)[1];
    state.fm = state.fm.replace(
      TAGS_BLOCK_RE,
      (m0, items) => `tags:\n${items}${indent}- "${tag}"\n`,
    );
  } else if (/^category:.*$/m.test(state.fm)) {
    state.fm = state.fm.replace(/(^category:.*$\n)/m, `$1tags:\n  - "${tag}"\n`);
  } else {
    state.fm = `${state.fm.slice(0, -4)}tags:\n  - "${tag}"\n---\n`;
  }
}

/** Replace the first plain-text match of pattern with a link. Returns text or null. */
function linkFirst(state, pattern, href) {
  const spans = splitSpans(state.body);
  for (const span of spans) {
    if (!span.plain) continue;
    const m = span.text.match(pattern);
    if (m && m.index !== undefined) {
      span.text =
        span.text.slice(0, m.index) +
        `[${m[0]}](${href})` +
        span.text.slice(m.index + m[0].length);
      state.body = spans.map((s) => s.text).join("");
      return m[0];
    }
  }
  state.body = spans.map((s) => s.text).join("");
  return null;
}

// --- Main -------------------------------------------------------------------

const files = fs.readdirSync(articlesDir).filter((f) => f.endsWith(".mdx")).sort();

// Global tag vocabulary across all articles.
const globalTags = new Map(); // slug -> first-seen label
const fileTags = new Map(); // file -> string[]
for (const f of files) {
  const state = loadState(path.join(articlesDir, f));
  const tags = state ? (parseTags(state.fm) ?? []) : [];
  fileTags.set(f, tags);
  for (const t of tags) {
    const slug = slugifyTag(t);
    if (slug && !globalTags.has(slug)) globalTags.set(slug, t);
  }
}

console.log(
  `vocabulary: ${SERVICES.length} services, ${LOCATIONS.length} locations, ` +
    `${globalTags.size} tags across ${files.length} articles`,
);

let changed = 0;
let pending = 0;

for (const f of files) {
  const filePath = path.join(articlesDir, f);
  const nl = fs.readFileSync(filePath, "utf8").includes("\r\n") ? "\r\n" : "\n";
  const state = loadState(filePath);
  if (!state) {
    console.log(`${f}: NO FRONTMATTER, skipped`);
    continue;
  }
  const beforeBodyLines = state.body.split("\n").length;
  const beforeFmTagLines = (state.fm.match(/^  - /gm) || []).length;
  const actions = [];
  // Skips are reported but never count as pending changes.

  // Phase 1: normalize — service-named tag links become service links.
  if (runPhase("normalize")) {
    state.body = state.body.replace(
      /\[([^\]]*)\]\(\/articles\/tag\/([^)]+)\)/g,
      (full, text) => {
        const svc = SERVICES.find(
          (s) => s.name.toLowerCase() === text.trim().toLowerCase(),
        );
        if (!svc) return full;
        actions.push(`normalize "${text}" tag link -> /services/${svc.slug}`);
        return `[${text}](/services/${svc.slug})`;
      },
    );
  }

  // Phase 2: repair dead service targets.
  if (runPhase("repair")) {
    for (const [dead, fixed] of Object.entries(SERVICE_REPAIRS)) {
      if (!SERVICES.some((s) => s.slug === fixed)) continue;
      const re = new RegExp(`\\(/services/${dead}\\)`, "g");
      if (re.test(state.body)) {
        state.body = state.body.replace(re, `(/services/${fixed})`);
        actions.push(`repair /services/${dead} -> /services/${fixed}`);
      }
    }
  }

  // Phase 3: locations.
  if (runPhase("locations")) {
    const ordered = [...LOCATIONS].sort((a, b) => b.name.length - a.name.length);
    for (const loc of ordered) {
      if (state.body.includes(`/locations/${loc.slug}`)) continue;
      const hit = linkFirst(state, phrasePattern(loc.name), `/locations/${loc.slug}`);
      if (hit) actions.push(`location "${hit}" -> /locations/${loc.slug}`);
    }
  }

  // Phase 4: services.
  if (runPhase("services")) {
    const ordered = [...SERVICES].sort((a, b) => b.name.length - a.name.length);
    for (const svc of ordered) {
      if (state.body.includes(`/services/${svc.slug}`)) continue;
      const hit = linkFirst(state, phrasePattern(svc.name), `/services/${svc.slug}`);
      if (hit) actions.push(`service "${hit}" -> /services/${svc.slug}`);
    }
  }

  // Phase 5: tags (global vocabulary; backfill frontmatter when missing).
  // Two guards bound the backfill: (a) the drift check — a new tag must not
  // change service inference, so related sections stay stable; (b) the tag
  // budget — at most MAX_TAGS total via script additions, manual tags beyond
  // the limit stay untouched and block further additions.
  if (runPhase("tags")) {
    const category =
      state.fm.match(/^category:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1] ?? "";
    const explicitServices = (() => {
      const sm = state.fm.match(/^services:\n((?:[ \t]*- .*\n?)+)/m);
      if (!sm) return null;
      return Array.from(sm[1].matchAll(/-\s*["']?([^"'\n]+?)["']?\s*$/gm)).map(
        (x) => x[1].trim(),
      );
    })();
    const baseline = explicitServices
      ? new Set(explicitServices.map((s) => s.toLowerCase()))
      : inferServices(fileTags.get(f) ?? [], category);
    // Order by first plain-text occurrence (topical prominence), longest
    // first on ties so "local seo" wins over "seo" at the same position.
    const searchable = splitSpans(state.body)
      .filter((s) => s.plain)
      .map((s) => s.text)
      .join("\n");
    const firstIndex = (label) => {
      const m = phrasePattern(label).exec(searchable);
      return m ? m.index : Number.POSITIVE_INFINITY;
    };
    const candidates = Array.from(globalTags.entries())
      .filter(([slug]) => !OFFICE_SLUGS.has(slug))
      .filter(
        ([, label]) =>
          !SERVICES.some((s) => s.name.toLowerCase() === label.toLowerCase()),
      )
      .map(([slug, label]) => ({ slug, label, at: firstIndex(label) }))
      .filter((c) => c.at !== Number.POSITIVE_INFINITY)
      .sort((a, b) => a.at - b.at || b.label.length - a.label.length);
    const originalLabels = [...(fileTags.get(f) ?? [])];
    const current = new Set(originalLabels.map(slugifyTag));
    let budget = Math.max(0, MAX_TAGS - current.size);
    // Drift check helper: a candidate tag must not pull the article into a
    // service it was not already associated with (explicit services bypass
    // this — their mapping is fixed by hand). Tested against the ORIGINAL
    // labels; inference is monotone, so individually-safe tags stay safe
    // in combination.
    const drifts = (label) =>
      !explicitServices &&
      !sameSet(baseline, inferServices([...originalLabels, label], category));
    for (const { slug, label } of candidates) {
      if (state.body.includes(`/articles/tag/${slug}`)) continue;
      if (!current.has(slug)) {
        if (drifts(label)) {
          actions.push(`skip "${label}" (would change service mapping)`);
          continue;
        }
        if (budget <= 0) {
          actions.push(`skip "${label}" (tag budget of ${MAX_TAGS} reached)`);
          continue;
        }
      }
      const hit = linkFirst(state, phrasePattern(label), `/articles/tag/${slug}`);
      if (hit) {
        actions.push(`tag "${hit}" -> /articles/tag/${slug}`);
        if (!current.has(slug) && !NO_BACKFILL) {
          // Backfill so the article joins the archive it links to.
          const clean = label.toLowerCase();
          addTagToFrontmatter(state, clean);
          current.add(slug);
          budget -= 1;
          actions.push(`frontmatter += "${clean}"`);
        }
      }
    }
  }

  if (actions.length > 0) {
    // Only real mutations count as pending — pure "skip" reports do not.
    if (!actions.some((a) => !a.startsWith("skip "))) continue;
    pending += 1;
    console.log(`${f}:`);
    actions.forEach((a) => console.log(`    ${a}`));
    if (APPLY) {
      const out = state.fm + state.body;
      // Invariant: body line count unchanged; frontmatter may only GAIN lines.
      const outBodyLines = state.body.split("\n").length;
      const outFmTagLines = (state.fm.match(/^  - /gm) || []).length;
      if (outBodyLines !== beforeBodyLines || outFmTagLines < beforeFmTagLines) {
        console.log(`    !! INVARIANT VIOLATION, skipping ${f}`);
        continue;
      }
      // Frontmatter must still parse (catches duplicate keys, bad indent).
      try {
        matter(out);
      } catch (e) {
        console.log(`    !! FRONTMATTER INVALID, skipping ${f}: ${String(e.message).split("\n")[0]}`);
        continue;
      }
      fs.writeFileSync(
        filePath,
        nl === "\r\n" ? out.replace(/\n/g, "\r\n") : out,
        "utf8",
      );
      changed += 1;
    }
  }
}

if (APPLY) console.log(`APPLIED changes to ${changed} file(s)`);
else console.log(`DRY-RUN: ${pending} file(s) would change (pass --apply to write)`);
if (CHECK) process.exit(pending > 0 ? 1 : 0);
