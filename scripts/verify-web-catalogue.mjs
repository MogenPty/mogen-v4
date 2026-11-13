/**
 * Read-only catalogue verification.
 * Usage: node scripts/verify-web-catalogue.mjs --target=development|production
 */
import { neon } from "@neondatabase/serverless";
import { loadDatabaseEnvironment } from "./lib/database-environment.mjs";

const database = loadDatabaseEnvironment({ operation: "Catalogue verification" });
const sql = neon(database.databaseUrl);
const required = ["seed", "sprout", "seedling", "vegetative", "budding", "flowering", "ripening"];
const expected = { maboloka: "sprout", soshanguve: "vegetative", centurion: "flowering" };

try {
  const packages = await sql`
    SELECT id, name, stage, status, website_included, pricing_label
    FROM web_packages ORDER BY stage
  `;
  const locations = await sql`
    SELECT location_slug, featured_package_id, slots
    FROM web_location_offers ORDER BY location_slug
  `;
  const actual = packages.map(p => p.id);
  const issues = [];
  if (actual.length !== 7 || required.some((id, index) => actual[index] !== id)) {
    issues.push("Expected seven package stages ordered Seed through Ripening.");
  }
  if (packages.find(p => p.id === "seed")?.website_included !== false) {
    issues.push("Seed should have website_included=false.");
  }
  if (locations.length !== 3) issues.push("Expected exactly three location offers.");
  for (const [location, featured] of Object.entries(expected)) {
    const row = locations.find(l => l.location_slug === location);
    if (!row) issues.push(`Missing location ${location}.`);
    else if (row.featured_package_id !== featured) issues.push(`Wrong featured package for ${location}.`);
    else if (!Array.isArray(row.slots) || row.slots.length !== 4) issues.push(`Wrong slot count for ${location}.`);
  }
  console.table(packages.map(p => ({ stage: p.stage, id: p.id, status: p.status, price: p.pricing_label })));
  console.table(locations.map(l => ({ location: l.location_slug, featured: l.featured_package_id, slots: l.slots.length })));
  if (issues.length) {
    issues.forEach(issue => console.error("ERROR:", issue));
    process.exitCode = 1;
  } else {
    console.log("Read-only catalogue verification PASSED.");
    if (packages.some(p => p.status !== "published")) {
      console.log("Some packages remain unpublished; website catalogue mode will show only published records.");
    }
  }
} catch (error) {
  console.error("Catalogue verification failed; confirm the selected Neon branch and migration status.");
  console.error(error instanceof Error ? error.message.replace(/postgresql:\/\/\S+/g, "[REDACTED_CONNECTION]") : String(error));
  process.exitCode = 1;
}
