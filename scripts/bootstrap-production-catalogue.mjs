/**
 * One-time production bootstrap for an empty web catalogue.
 *
 * Dry run: node scripts/bootstrap-production-catalogue.mjs
 * Apply:   node scripts/bootstrap-production-catalogue.mjs --apply --confirm=bootstrap-empty-production-catalogue
 */
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadDatabaseEnvironment } from "./lib/database-environment.mjs";

const MIGRATIONS = [
  "0000_web_catalogue.sql",
  "0001_web_commercial_options.sql",
  "0002_seed_once_off_only.sql",
  "0003_seed_not_applicable_responsibilities.sql",
  "0004_draft_web_payment_options.sql",
  "0005_managed_annual_sprout_pricing.sql",
  "0006_sprout_remaining_draft_prices.sql",
  "0008_website_pricing_drafts.sql",
  "0009_publish_web_catalogue_AFTER_APPROVAL.sql",
  "0010_web_promotion_content.sql",
];

const CONFIRMATION = "bootstrap-empty-production-catalogue";
const apply = process.argv.includes("--apply");
const confirmation = process.argv.find((value) => value.startsWith("--confirm="))?.slice("--confirm=".length);
const database = loadDatabaseEnvironment({
  operation: "Production catalogue bootstrap",
  allowedTargets: ["production"],
  defaultTarget: "production",
});

if (database.host.includes("-pooler")) {
  throw new Error("[database-safety] Production migrations require a direct, non-pooled Neon connection.");
}

function splitSql(source) {
  const statements = [];
  let current = "";
  let index = 0;
  let state = "normal";
  let dollarTag = "";
  let blockDepth = 0;

  const push = () => {
    const statement = current.trim();
    current = "";
    if (statement && !/^(BEGIN|COMMIT)$/i.test(statement.replace(/^(?:\s*--[^\n]*\n)*/, "").trim())) {
      statements.push(statement);
    }
  };

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (state === "line-comment") {
      current += char;
      index += 1;
      if (char === "\n") state = "normal";
      continue;
    }
    if (state === "block-comment") {
      current += char;
      if (char === "/" && next === "*") {
        current += next;
        blockDepth += 1;
        index += 2;
      } else if (char === "*" && next === "/") {
        current += next;
        blockDepth -= 1;
        index += 2;
        if (blockDepth === 0) state = "normal";
      } else {
        index += 1;
      }
      continue;
    }
    if (state === "single-quote" || state === "double-quote") {
      current += char;
      const quote = state === "single-quote" ? "'" : '"';
      if (char === quote && next === quote) {
        current += next;
        index += 2;
      } else {
        index += 1;
        if (char === quote) state = "normal";
      }
      continue;
    }
    if (state === "dollar-quote") {
      if (source.startsWith(dollarTag, index)) {
        current += dollarTag;
        index += dollarTag.length;
        state = "normal";
      } else {
        current += char;
        index += 1;
      }
      continue;
    }

    if (char === "-" && next === "-") {
      current += "--";
      index += 2;
      state = "line-comment";
    } else if (char === "/" && next === "*") {
      current += "/*";
      index += 2;
      blockDepth = 1;
      state = "block-comment";
    } else if (char === "'") {
      current += char;
      index += 1;
      state = "single-quote";
    } else if (char === '"') {
      current += char;
      index += 1;
      state = "double-quote";
    } else if (char === "$") {
      const match = source.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        index += dollarTag.length;
        state = "dollar-quote";
      } else {
        current += char;
        index += 1;
      }
    } else if (char === ";") {
      push();
      index += 1;
    } else {
      current += char;
      index += 1;
    }
  }

  if (state !== "normal" && state !== "line-comment") {
    throw new Error(`[migration] Unterminated ${state} in SQL source.`);
  }
  push();
  return statements;
}

const migrationStatements = [];
for (const fileName of MIGRATIONS) {
  const source = await readFile(resolve(process.cwd(), "drizzle", fileName), "utf8");
  const statements = splitSql(source);
  migrationStatements.push(...statements.map((statement) => ({ fileName, statement })));
}

console.log(`Verified target: ${database.target} (${database.host})`);
console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
console.log(`Migrations: ${MIGRATIONS.length}`);
console.log(`SQL statements: ${migrationStatements.length}`);
for (const fileName of MIGRATIONS) console.log(`- drizzle/${fileName}`);
console.log("- drizzle/0007_private_documents.sql (intentionally excluded)");

if (!apply) {
  console.log(`No database changes made. Apply requires --apply --confirm=${CONFIRMATION}`);
  process.exit(0);
}
if (confirmation !== CONFIRMATION) {
  throw new Error(`[database-safety] Refusing production write without --confirm=${CONFIRMATION}.`);
}

const sql = neon(database.databaseUrl);
const [existing] = await sql`
  SELECT count(*)::integer AS table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'web_packages',
      'web_location_offers',
      'web_package_prices',
      'web_promotions',
      'web_promotion_prices'
    )
`;
if (existing?.table_count !== 0) {
  throw new Error(`[database-safety] Expected an empty production catalogue; found ${existing?.table_count ?? "unknown"}/5 tables.`);
}

await sql.transaction(
  migrationStatements.map(({ statement }) => sql.query(statement)),
  { isolationLevel: "Serializable" },
);
console.log("Production catalogue bootstrap transaction committed.");
