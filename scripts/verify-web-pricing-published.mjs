/**
 * Read-only verification of the *published* seven-stage website catalogue.
 * Use only with DATABASE_URL pointing at the Neon branch under examination.
 * Does not migrate, update, publish, or send email.
 *
 * Usage: node --env-file=.env scripts/verify-web-pricing-published.mjs
 */
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Set it for the specific Neon branch being verified.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const expected = [
  ["seed-once-off", "seed", "once_off", 49900, 0],
  ["sprout-managed-monthly", "sprout", "managed_monthly", 19900, 0],
  ["sprout-once-off", "sprout", "managed_annual", 149900, 0],
  ["sprout-self-hosted", "sprout", "self_hosted", 179900, 0],
  ["seedling-managed-monthly", "seedling", "managed_monthly", 44900, 99900],
  ["seedling-once-off", "seedling", "managed_annual", 349900, 99900],
  ["seedling-self-hosted", "seedling", "self_hosted", 549900, 0],
  ["vegetative-managed-monthly", "vegetative", "managed_monthly", 79900, 199900],
  ["vegetative-once-off", "vegetative", "managed_annual", 649900, 199900],
  ["vegetative-self-hosted", "vegetative", "self_hosted", 999900, 0],
  ["budding-managed-monthly", "budding", "managed_monthly", 119900, 299900],
  ["budding-once-off", "budding", "managed_annual", 999900, 299900],
  ["budding-self-hosted", "budding", "self_hosted", 1499900, 0],
  ["flowering-managed-monthly", "flowering", "managed_monthly", 179900, 499900],
  ["flowering-once-off", "flowering", "managed_annual", 1499900, 499900],
  ["flowering-self-hosted", "flowering", "self_hosted", 2299900, 0],
];
const expectedIds = new Set(expected.map(row => row[0]));
const packageIds = new Set(["seed", "sprout", "seedling", "vegetative", "budding", "flowering", "ripening"]);
const expectedFeatured = new Map([["maboloka", "sprout"], ["soshanguve", "vegetative"], ["centurion", "flowering"]]);

try {
  const [packages, prices, offers] = await Promise.all([
    sql`SELECT id, status FROM public.web_packages ORDER BY stage`,
    sql`SELECT id, package_id, billing_mode, status, currency, amount_cents, setup_fee_cents
         FROM public.web_package_prices ORDER BY package_id, billing_mode`,
    sql`SELECT location_slug, featured_package_id FROM public.web_location_offers ORDER BY location_slug`,
  ]);
  const errors = [];
  if (packages.length !== 7) errors.push(`Expected 7 packages, found ${packages.length}.`);
  for (const p of packages) {
    if (!packageIds.has(p.id) || p.status !== "published") errors.push(`Unexpected/unpublished package: ${p.id} (${p.status}).`);
  }
  if (prices.length !== expected.length) errors.push(`Expected exactly 16 pricing options, found ${prices.length}.`);
  const byId = new Map(prices.map(p => [p.id, p]));
  for (const [id, packageId, mode, amount, setup] of expected) {
    const row = byId.get(id);
    if (!row) { errors.push(`Missing option: ${id}`); continue; }
    if (row.package_id !== packageId || row.billing_mode !== mode ||
        row.status !== "published" || row.currency !== "ZAR" ||
        row.amount_cents !== amount || row.setup_fee_cents !== setup) {
      errors.push(`Incorrect publication or price: ${id}`);
    }
  }
  for (const row of prices) if (!expectedIds.has(row.id)) errors.push(`Unexpected option: ${row.id}`);
  const byLocation = new Map(offers.map(o => [o.location_slug, o.featured_package_id]));
  if (offers.length !== 3) errors.push(`Expected 3 location offers, found ${offers.length}.`);
  for (const [slug, featured] of expectedFeatured) {
    if (byLocation.get(slug) !== featured) errors.push(`Incorrect featured package for ${slug}.`);
  }
  console.table(prices.map(p => ({
    package: p.package_id, mode: p.billing_mode, status: p.status,
    priceZar: p.amount_cents / 100, setupZar: p.setup_fee_cents / 100
  })));
  if (errors.length > 0) {
    for (const error of errors) console.error("ERROR:", error);
    process.exitCode = 1;
  } else {
    console.log("Published catalogue verification PASSED: 7 packages, 16 prices, 3 featured locations. Ripening remains quotation-only.");
    console.log("This verifies this DATABASE_URL only, NOT deployment or production website visibility.");
  }
} catch (e) {
  console.error("Published pricing verification failed: check DATABASE_URL and migration state.");
  console.error(e instanceof Error ? e.message.replace(/postgresql:\/\/\S+/g, "[REDACTED_CONNECTION]") : String(e));
  process.exitCode = 1;
}
