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

  console.log(`Verified target: ${database.target} (${database.host})`);
  console.log(`Redirect tables: ${tables.length}/${tableNames.length}`);
  console.log(`Redirect rules: ${ruleCount?.count ?? 0}`);
  console.table(tables);
  return { tableCount: tables.length, ruleCount: ruleCount?.count ?? 0 };
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
const statements = source
  .split("\n")
  .filter(line => !line.trimStart().startsWith("--"))
  .join("\n")
  .split(/;\s*(?:\r?\n|$)/)
  .map(statement => statement.trim())
  .filter(statement => statement && statement !== "BEGIN" && statement !== "COMMIT");

await sql.transaction(statements.map(statement => sql.query(statement)), {
  isolationLevel: "Serializable",
});

const verified = await inspect();
if (verified.tableCount !== tableNames.length || verified.ruleCount < 11) {
  throw new Error(`[migration] Redirect schema verification failed: ${verified.tableCount}/${tableNames.length} tables, ${verified.ruleCount}/11 seed rules.`);
}
console.log("Redirect management migration committed and verified.");

