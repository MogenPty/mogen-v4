/**
 * Read-only database target inspection.
 *
 * Development: node scripts/inspect-database-target.mjs --target=development
 * Production:  node scripts/inspect-database-target.mjs --target=production
 */
import { neon } from "@neondatabase/serverless";
import { loadDatabaseEnvironment } from "./lib/database-environment.mjs";

const database = loadDatabaseEnvironment({ operation: "Database inspection" });
const sql = neon(database.databaseUrl);

try {
  const [identity] = await sql`
    SELECT current_database() AS database_name, current_user AS database_user
  `;
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'web_packages',
        'web_location_offers',
        'web_package_prices',
        'web_promotions',
        'web_promotion_prices'
      )
    ORDER BY table_name
  `;

  console.log(`Database target verified: ${database.target}`);
  console.log(`Environment file: ${database.fileName}`);
  console.log(`Neon host: ${database.host}`);
  console.log(`Database: ${identity?.database_name ?? "unknown"}`);
  console.log(`Catalogue tables: ${tables.length}/5`);
  console.table(tables);
} catch (error) {
  console.error(`Could not inspect the verified ${database.target} database target.`);
  console.error(error instanceof Error ? error.message.replace(/postgresql:\/\/\S+/g, "[REDACTED_CONNECTION]") : String(error));
  process.exitCode = 1;
}
