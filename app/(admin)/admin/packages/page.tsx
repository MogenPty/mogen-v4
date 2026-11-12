import Link from "next/link";
import { asc } from "drizzle-orm";
import { requireCatalogueAdmin } from "@/lib/admin/access";
import { getCatalogueDb } from "@/db/client";
import { webPackages, webPackagePrices } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminPackagesPage() {
  await requireCatalogueAdmin();
  const db = getCatalogueDb();
  const [packages, prices] = await Promise.all([
    db.select().from(webPackages).orderBy(asc(webPackages.stage)),
    db.select().from(webPackagePrices).orderBy(asc(webPackagePrices.packageId)),
  ]);
  return (
    <main className="min-h-screen bg-bone px-6 py-14 text-ink lg:px-10">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-8 flex gap-5 text-sm font-semibold text-catalyst">
          <Link href="/admin">Admin</Link>
          <Link href="/admin/promotions">Promotions</Link>
        </nav>
        <h1 className="font-display text-4xl font-black">Website packages</h1>
        <p className="mt-3 max-w-3xl text-ink/70">
          Edit published catalogue content and manage price approvals. Package IDs and growth stages are immutable here to preserve live enquiry links and location recommendations.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map(pkg => (
            <article key={pkg.id} className="rounded-xl border border-ink/15 bg-white p-6">
              <p className="small-caps text-catalyst">Stage {pkg.stage} · {pkg.status}</p>
              <h2 className="mt-3 font-display text-2xl font-bold">{pkg.name}</h2>
              <p className="mt-3 min-h-14 text-sm text-ink/70">{pkg.summary}</p>
              <p className="mt-4 text-sm font-semibold">{prices.filter(price => price.packageId === pkg.id).length} payment choices</p>
              <Link className="mt-5 inline-block rounded bg-catalyst px-5 py-3 font-semibold text-white hover:opacity-90" href={`/admin/packages/${pkg.id}`}>
                Edit package
              </Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
