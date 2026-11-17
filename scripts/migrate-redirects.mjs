import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadDatabaseEnvironment } from "./lib/database-environment.mjs";

const apply = process.argv.includes("--apply");
const database = loadDatabaseEnvironment({ operation: "Redirect management migration" });
const confirmation = process.argv.find(value => value.startsWith("--confirm="))?.slice("--confirm=".length);
const expectedConfirmation = `apply-redirects-${database.target}`;

if (database.host.includes("-pooler")) {
  throw new Error("[database-safety] Redirect migrations require a direct, non-pooled Neon connection.");
}

const sql = neon(database.databaseUrl);
const tableNames = [
  "redirect_rules",
  "gone_resource_rules",
  "redirect_history",
  "redirect_cache_state",
  "not_found_paths",
  "search_console_imports",
  "search_console_import_rows",
];

const expectedSeeds = [
  ["10000000-0000-4000-8000-000000000001", "/blog", "/articles", "exact", 308],
  ["10000000-0000-4000-8000-000000000002", "/blog/:segment", "/articles/:segment", "segment", 308],
  ["10000000-0000-4000-8000-000000000003", "/news/:path*", "/articles", "splat", 308],
  ["10000000-0000-4000-8000-000000000004", "/services/brand-identity", "/services/business-documentation", "exact", 308],
  ["10000000-0000-4000-8000-000000000005", "/services/seo-services", "/services/seo", "exact", 308],
  ["10000000-0000-4000-8000-000000000006", "/services/mobile-development", "/services", "exact", 307],
  ["10000000-0000-4000-8000-000000000007", "/locations/brits", "/locations", "exact", 308],
  ["10000000-0000-4000-8000-000000000008", "/portfolio", "/success-stories", "exact", 308],
  ["10000000-0000-4000-8000-000000000009", "/portfolio/:segment", "/success-stories", "segment", 308],
  ["10000000-0000-4000-8000-000000000010", "/terms-conditions", "/terms-of-service", "exact", 308],
  ["10000000-0000-4000-8000-000000000011", "/terms-conditions/:segment", "/terms-of-service", "segment", 308],
];

const requiredColumns = {
  redirect_rules: ["id", "source_path", "destination_path", "match_type", "status_code", "is_active", "is_automatic", "preserve_query", "entity_type", "entity_id", "description", "created_at", "updated_at", "created_by", "expires_at", "hit_count", "last_hit_at"],
  gone_resource_rules: ["id", "source_path", "match_type", "is_active", "description", "created_at", "updated_at", "created_by", "expires_at", "hit_count", "last_hit_at"],
  redirect_history: ["id", "redirect_id", "gone_rule_id", "action", "actor", "before_state", "after_state", "created_at"],
  redirect_cache_state: ["key", "generation", "updated_at"],
  not_found_paths: ["id", "requested_path", "first_seen_at", "last_seen_at", "hit_count", "referrer", "user_agent_class", "resolution_status", "resolution_redirect_id", "retain_until"],
  search_console_imports: ["id", "filename", "imported_by", "row_count", "created_at"],
  search_console_import_rows: ["id", "import_id", "source_path", "status", "suggested_destination", "suggestion_reason", "created_redirect_id", "created_at"],
};

const requiredConstraints = [
  "redirect_rules_status_code_check", "redirect_rules_match_type_check", "redirect_rules_source_shape_check",
  "redirect_rules_destination_shape_check", "redirect_rules_entity_check", "redirect_rules_exact_loop_check",
  "gone_rules_match_type_check", "gone_rules_source_shape_check", "redirect_history_action_check",
  "not_found_paths_status_check", "not_found_paths_ua_check", "search_console_imports_row_count_check",
  "search_console_rows_status_check",
];

const requiredIndexes = [
  "redirect_rules_active_source_unique", "redirect_rules_lookup_idx", "redirect_rules_entity_idx", "redirect_rules_updated_idx",
  "gone_rules_active_source_unique", "gone_rules_lookup_idx", "redirect_history_redirect_idx", "redirect_history_gone_idx",
  "redirect_history_created_idx", "not_found_paths_requested_unique", "not_found_paths_open_hits_idx",
  "not_found_paths_retention_idx", "search_console_rows_import_source_unique", "search_console_rows_status_idx",
];

function splitSqlStatements(source) {
  const cleaned = source.split("\n").filter(line => !line.trimStart().startsWith("--")).join("\n");
  const statements = [];
  let current = "";
  let singleQuoted = false;
  let doubleQuoted = false;
  let dollarTag = null;
  for (let index = 0; index < cleaned.length; index += 1) {
    const character = cleaned[index];
    if (!singleQuoted && !doubleQuoted && character === "$") {
      const tag = cleaned.slice(index).match(/^\$[A-Za-z0-9_]*\$/)?.[0];
      if (tag && (dollarTag === null || dollarTag === tag)) {
        dollarTag = dollarTag === null ? tag : null;
        current += tag;
        index += tag.length - 1;
        continue;
      }
    }
    if (dollarTag === null && !doubleQuoted && character === "'") {
      if (singleQuoted && cleaned[index + 1] === "'") {
        current += "''";
        index += 1;
        continue;
      }
      singleQuoted = !singleQuoted;
    } else if (dollarTag === null && !singleQuoted && character === '"') {
      doubleQuoted = !doubleQuoted;
    }
    if (character === ";" && !singleQuoted && !doubleQuoted && dollarTag === null) {
      if (current.trim()) statements.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements.filter(statement => statement !== "BEGIN" && statement !== "COMMIT");
}

async function inspect() {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY(${tableNames})
    ORDER BY table_name
  `;
  const redirectTableExists = tables.some(row => row.table_name === "redirect_rules");
  const [ruleCount] = redirectTableExists
    ? await sql`SELECT count(*)::integer AS count FROM public.redirect_rules`
    : [{ count: 0 }];
  const notFoundTableExists = tables.some(row => row.table_name === "not_found_paths");
  const [notFoundCount] = notFoundTableExists
    ? await sql`SELECT count(*)::integer AS count FROM public.not_found_paths`
    : [{ count: 0 }];
  const columns = await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ANY(${tableNames})
  `;
  const constraints = await sql`
    SELECT conname AS name
    FROM pg_constraint constraint_record
    JOIN pg_namespace namespace_record ON namespace_record.oid = constraint_record.connamespace
    WHERE namespace_record.nspname = 'public' AND conname = ANY(${requiredConstraints})
  `;
  const indexes = await sql`
    SELECT indexname AS name
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = ANY(${requiredIndexes})
  `;
  const triggers = await sql`
    SELECT trigger_name AS name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND trigger_name IN ('redirect_rules_source_exclusivity', 'gone_rules_source_exclusivity')
  `;
  const seedRows = redirectTableExists
    ? await sql`
        SELECT id::text, source_path, destination_path, match_type, status_code
        FROM public.redirect_rules
        WHERE id::text = ANY(${expectedSeeds.map(seed => seed[0])})
      `
    : [];

  const actualColumns = new Set(columns.map(row => `${row.table_name}.${row.column_name}`));
  const missingColumns = Object.entries(requiredColumns).flatMap(([table, names]) =>
    names.filter(name => !actualColumns.has(`${table}.${name}`)).map(name => `${table}.${name}`),
  );
  const constraintNames = new Set(constraints.map(row => row.name));
  const indexNames = new Set(indexes.map(row => row.name));
  const triggerNames = new Set(triggers.map(row => row.name));
  const seedById = new Map(seedRows.map(row => [row.id, row]));
  const invalidSeeds = expectedSeeds.filter(([id, sourcePath, destinationPath, matchType, statusCode]) => {
    const row = seedById.get(id);
    return !row || row.source_path !== sourcePath || row.destination_path !== destinationPath ||
      row.match_type !== matchType || row.status_code !== statusCode;
  }).map(seed => seed[0]);
  const missingConstraints = requiredConstraints.filter(name => !constraintNames.has(name));
  const missingIndexes = requiredIndexes.filter(name => !indexNames.has(name));
  const missingTriggers = ["redirect_rules_source_exclusivity", "gone_rules_source_exclusivity"]
    .filter(name => !triggerNames.has(name));

  console.log(`Verified target: ${database.target} (${database.host})`);
  console.log(`Redirect tables: ${tables.length}/${tableNames.length}`);
  console.log(`Redirect rules: ${ruleCount?.count ?? 0}`);
  console.log(`Tracked 404 paths: ${notFoundCount?.count ?? 0}`);
  console.log(`Verified seed rules: ${expectedSeeds.length - invalidSeeds.length}/${expectedSeeds.length}`);
  console.log(`Required columns: ${Object.values(requiredColumns).flat().length - missingColumns.length}/${Object.values(requiredColumns).flat().length}`);
  console.log(`Required constraints: ${requiredConstraints.length - missingConstraints.length}/${requiredConstraints.length}`);
  console.log(`Required indexes: ${requiredIndexes.length - missingIndexes.length}/${requiredIndexes.length}`);
  console.log(`Cross-table triggers: ${2 - missingTriggers.length}/2`);
  console.table(tables);
  return {
    tableCount: tables.length,
    ruleCount: ruleCount?.count ?? 0,
    missingColumns,
    missingConstraints,
    missingIndexes,
    missingTriggers,
    invalidSeeds,
  };
}

await inspect();

if (!apply) {
  console.log(`No database changes made. Apply requires --apply --confirm=${expectedConfirmation}`);
  process.exit(0);
}
if (confirmation !== expectedConfirmation) {
  throw new Error(`[database-safety] Refusing database write without --confirm=${expectedConfirmation}.`);
}

const source = await readFile(resolve(process.cwd(), "drizzle", "0012_redirect_management.sql"), "utf8");
const statements = splitSqlStatements(source);

await sql.transaction(statements.map(statement => sql.query(statement)), {
  isolationLevel: "Serializable",
});

const verified = await inspect();
if (
  verified.tableCount !== tableNames.length || verified.ruleCount < expectedSeeds.length ||
  verified.missingColumns.length || verified.missingConstraints.length || verified.missingIndexes.length ||
  verified.missingTriggers.length || verified.invalidSeeds.length
) {
  throw new Error(`[migration] Redirect schema verification failed: ${JSON.stringify(verified)}`);
}
console.log("Redirect management migration committed and verified.");
