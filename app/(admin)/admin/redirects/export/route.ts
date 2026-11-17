import { desc } from "drizzle-orm";
import { getCatalogueDb } from "@/db/client";
import { redirectRules } from "@/db/schema";
import { requireCatalogueAdmin } from "@/lib/admin/access";
import { spreadsheetSafeDescription, toCsv } from "@/lib/redirects/csv";

export async function GET() {
  await requireCatalogueAdmin();
  const rules = await getCatalogueDb().select().from(redirectRules).orderBy(desc(redirectRules.updatedAt));
  const headers = ["sourcePath", "destinationPath", "statusCode", "isActive", "isAutomatic", "preserveQuery", "description", "expiresAt", "hitCount", "lastHitAt"];
  const body = toCsv(headers, rules.map(rule => ({
    ...rule,
    description: spreadsheetSafeDescription(rule.description),
    expiresAt: rule.expiresAt?.toISOString() ?? "",
    lastHitAt: rule.lastHitAt?.toISOString() ?? "",
  })));
  return new Response(`\uFEFF${body}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="mogen-redirects-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
