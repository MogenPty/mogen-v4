/**
 * Read-only commercial schema verification.
 * Usage: node scripts/verify-web-commercial.mjs --target=development|production
 * Does not print credentials or write any rows.
 */
import { neon } from "@neondatabase/serverless";
import { loadDatabaseEnvironment } from "./lib/database-environment.mjs";

const database = loadDatabaseEnvironment({ operation: "Commercial schema verification" });
const sql = neon(database.databaseUrl);
try {
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('web_package_prices', 'web_promotions', 'web_promotion_prices')
    ORDER BY table_name
  `;
  const required = ["web_package_prices", "web_promotion_prices", "web_promotions"];
  const existing = new Set(tables.map(row => row.table_name));
  for (const name of required) {
    if (!existing.has(name)) console.error(`MISSING: public.${name}`);
  }
  if (existing.size !== required.length) {
    console.error(`Run drizzle/0001_web_commercial_options.sql on the verified ${database.target} Neon branch.`);
    process.exitCode = 1;
  } else {
    const options = await sql`
      SELECT billing_mode, status, COUNT(*)::integer AS count
      FROM web_package_prices GROUP BY billing_mode, status ORDER BY billing_mode, status
    `;
    const promotions = await sql`SELECT status, COUNT(*)::integer AS count FROM web_promotions GROUP BY status ORDER BY status`;
    const targets = await sql`SELECT COUNT(*)::integer AS count FROM web_promotion_prices`;
    console.log("Commercial schema verification PASSED (read-only).");
    console.table(options);
    console.table(promotions);
    console.log("Promotion target rows:", targets[0]?.count ?? 0);
    if (options.length === 0) console.log("No payment options yet: expected until commercial prices and terms are approved.");
  }
} catch (error) {
  console.error(`Commercial schema verification failed. Confirm the Neon ${database.target} branch and SQL migration.`);
  console.error(error instanceof Error ? error.message.replace(/postgresql:\/\/\S+/g, "[REDACTED_CONNECTION]") : String(error));
  process.exitCode = 1;
}
