/**
 * Read-only verification of 0004 draft commercial option templates.
 * Requires DATABASE_URL pointing to Neon DEVELOPMENT. Does not modify rows.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must point to the Neon DEVELOPMENT branch.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
const packages = ["sprout", "seedling", "vegetative", "budding", "flowering"];
const modes = ["managed_monthly", "once_off", "self_hosted"];
const ids = ["seed-once-off", ...packages.flatMap(p => modes.map(m => `${p}-${m.replaceAll("_", "-")}`))];

try {
  const rows = await sql`
    SELECT id, package_id, billing_mode, status, amount_cents, setup_fee_cents,
           minimum_months, initial_hosting_months, hosting_responsibility, maintenance_responsibility
    FROM public.web_package_prices ORDER BY package_id, billing_mode
  `;
  const byId = new Map(rows.map(row => [row.id, row]));
  const issues = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) { issues.push(`Missing draft option: ${id}`); continue; }
    if (row.status !== "draft" || row.amount_cents !== null || row.setup_fee_cents !== null ||
        row.minimum_months !== null || row.initial_hosting_months !== null) {
      issues.push(`Draft has unexpected price, contract term or status: ${id}`);
    }
  }
  const seed = byId.get("seed-once-off");
  if (seed && (seed.billing_mode !== "once_off" ||
      seed.hosting_responsibility !== "not_applicable" ||
      seed.maintenance_responsibility !== "not_applicable")) {
    issues.push("Seed must be Once-Off without website hosting or maintenance.");
  }
  if (rows.some(r => r.package_id === "seed" && r.billing_mode !== "once_off")) {
    issues.push("Seed has an invalid extra payment mode.");
  }
  if (rows.some(r => r.package_id === "ripening" && r.id.startsWith("ripening-") && r.status === "published")) {
    issues.push("Ripening has a published fixed price: custom quotation was expected.");
  }
  console.table(rows.filter(r => ids.includes(r.id)).map(r => ({
    package: r.package_id, mode: r.billing_mode, status: r.status,
    amount: r.amount_cents === null ? "unapproved" : "set",
  })));
  if (issues.length) {
    for (const issue of issues) console.error("ERROR:", issue);
    process.exitCode = 1;
  } else {
    console.log("All 16 development pricing templates verified; amounts remain unapproved.");
  }
  const otherPublished = rows.filter(r => r.status === "published");
  if (otherPublished.length) console.warn(`Note: ${otherPublished.length} other published price row(s) already exist in this branch; inspect separately.`);
} catch (error) {
  console.error("Pricing draft verification failed. Check development branch and SQL migration order.");
  console.error(error instanceof Error ? error.message.replace(/postgresql:\/\/\S+/g, "[REDACTED_CONNECTION]") : String(error));
  process.exitCode = 1;
}
