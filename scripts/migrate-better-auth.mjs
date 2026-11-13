import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadDatabaseEnvironment } from "./lib/database-environment.mjs";

const apply = process.argv.includes("--apply");
const database = loadDatabaseEnvironment({ operation: "Better Auth migration" });
const confirmation = process.argv.find(value => value.startsWith("--confirm="))?.slice("--confirm=".length);
const expectedConfirmation = `create-better-auth-${database.target}`;

if (database.host.includes("-pooler")) {
  throw new Error("[database-safety] Auth migrations require a direct, non-pooled Neon connection.");
}

const sql = neon(database.databaseUrl);
const tables = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'better_auth'
  ORDER BY table_name
`;

console.log(`Verified target: ${database.target} (${database.host})`);
console.log(`Existing Better Auth tables: ${tables.length}/4`);
console.table(tables);

if (!apply) {
  console.log(`No database changes made. Apply requires --apply --confirm=${expectedConfirmation}`);
  process.exit(0);
}
if (confirmation !== expectedConfirmation) {
  throw new Error(`[database-safety] Refusing database write without --confirm=${expectedConfirmation}.`);
}

const source = await readFile(resolve(process.cwd(), "drizzle", "0011_better_auth.sql"), "utf8");
const statements = source
  .split(/;\s*(?:\r?\n|$)/)
  .map(statement => statement.trim())
  .filter(Boolean);

await sql.transaction(statements.map(statement => sql.query(statement)), {
  isolationLevel: "Serializable",
});

const [verified] = await sql`
  SELECT count(*)::integer AS table_count
  FROM information_schema.tables
  WHERE table_schema = 'better_auth'
    AND table_name IN ('user', 'session', 'account', 'verification')
`;
if (verified?.table_count !== 4) {
  throw new Error(`[migration] Better Auth schema verification failed: ${verified?.table_count ?? "unknown"}/4 tables.`);
}
console.log("Better Auth schema migration committed and verified: 4/4 tables.");
