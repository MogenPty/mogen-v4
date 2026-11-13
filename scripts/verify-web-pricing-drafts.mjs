/**
 * Read-only verification of 0004–0008 draft commercial option templates.
 * Requires DATABASE_URL pointing to Neon DEVELOPMENT. Does not modify rows.
 */
import { neon } from "@neondatabase/serverless";
import { loadDatabaseEnvironment } from "./lib/database-environment.mjs";

const database = loadDatabaseEnvironment({
  operation: "Draft pricing verification",
  allowedTargets: ["development"],
});
const sql = neon(database.databaseUrl);
const packages = ["sprout", "seedling", "vegetative", "budding", "flowering"];
const modes = ["managed_monthly", "managed_annual", "self_hosted"];
// Legacy stable IDs survive the billing-model correction to preserve references.
const optionId = (p, mode) => `${p}-${mode === "managed_annual" ? "once-off" : mode.replaceAll("_", "-")}`;
const ids = ["seed-once-off", ...packages.flatMap(p => modes.map(m => optionId(p, m)))];

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
    const expectedPackage = id === "seed-once-off" ? "seed" :
      packages.find(p => id.startsWith(`${p}-`));
    const expectedMode = id === "seed-once-off" ? "once_off" :
      modes.find(m => id === optionId(expectedPackage, m));
    if (!expectedPackage || !expectedMode ||
        row.package_id !== expectedPackage || row.billing_mode !== expectedMode) {
      issues.push(`Incorrect package or billing mode for template ${id}`);
    }
    if (id !== "seed-once-off") {
      const expectedHosting = expectedMode === "self_hosted" ? "customer" : "mogen";
      const expectedMaintenance = expectedMode === "self_hosted" ? "customer" : "mogen";
      if (row.hosting_responsibility !== expectedHosting ||
          row.maintenance_responsibility !== expectedMaintenance) {
        issues.push(`Incorrect responsibilities for template ${id}`);
      }
    }
    const pricing = {
      "seed-once-off": [49900, 0, null],
      "sprout-managed-monthly": [19900, 0, 6],
      "sprout-once-off": [149900, 0, 12],
      "sprout-self-hosted": [179900, 0, null],
      "seedling-managed-monthly": [44900, 99900, null],
      "seedling-once-off": [349900, 99900, null],
      "seedling-self-hosted": [549900, 0, null],
      "vegetative-managed-monthly": [79900, 199900, null],
      "vegetative-once-off": [649900, 199900, null],
      "vegetative-self-hosted": [999900, 0, null],
      "budding-managed-monthly": [119900, 299900, null],
      "budding-once-off": [999900, 299900, null],
      "budding-self-hosted": [1499900, 0, null],
      "flowering-managed-monthly": [179900, 499900, null],
      "flowering-once-off": [1499900, 499900, null],
      "flowering-self-hosted": [2299900, 0, null],
    };
    const [expectedAmount, expectedSetup, expectedMonths] = pricing[id] ?? [null, null, null];
    if (row.status !== "draft" ||
        row.amount_cents !== expectedAmount ||
        row.setup_fee_cents !== expectedSetup ||
        row.minimum_months !== expectedMonths ||
        row.initial_hosting_months !== null) {
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
    amount: r.amount_cents === null ? "unpriced" : "draft proposal",
  })));
  if (issues.length) {
    for (const issue of issues) console.error("ERROR:", issue);
    process.exitCode = 1;
  } else {
    console.log("All 16 draft website pricing options verified across Seed through Flowering; Ripening remains quotation-only. Nothing published.");
  }
  const otherPublished = rows.filter(r => r.status === "published");
  if (otherPublished.length) console.warn(`Note: ${otherPublished.length} other published price row(s) already exist in this branch; inspect separately.`);
} catch (error) {
  console.error("Pricing draft verification failed. Check development branch and SQL migration order.");
  console.error(error instanceof Error ? error.message.replace(/postgresql:\/\/\S+/g, "[REDACTED_CONNECTION]") : String(error));
  process.exitCode = 1;
}
