import Link from "next/link";
import AdminCard, { adminCardClass, adminFieldClass, adminPrimaryClass } from "@/components/mogen/admin-card";
import { asc } from "drizzle-orm";
import { requireCatalogueAdmin } from "@/lib/admin/access";
import { getCatalogueDb } from "@/db/client";
import { webPackages, webPackagePrices } from "@/db/schema";
import { createPackageAction } from "@/lib/admin/catalogue-actions";

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
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Edit published catalogue content and manage price approvals. Package IDs and growth stages are immutable here to preserve live enquiry links and location recommendations.
        </p>
        <form action={createPackageAction} className={`mt-8 grid gap-4 ${adminCardClass} p-6 sm:grid-cols-4 sm:items-end`}>
          <div><label htmlFor="new-package-name" className="block text-sm font-semibold">New package name</label>
            <input id="new-package-name" name="name" required minLength={2} className={adminFieldClass} /></div>
          <div><label htmlFor="new-package-id" className="block text-sm font-semibold">Identifier</label>
            <input id="new-package-id" name="id" required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={adminFieldClass} /></div>
          <div><label htmlFor="new-package-stage" className="block text-sm font-semibold">Stage (unique)</label>
            <input id="new-package-stage" name="stage" type="number" min="1" max="50" required className={adminFieldClass} /></div>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold"><input type="checkbox" name="websiteIncluded" defaultChecked className="mr-2" />Includes website</label>
            <button className={adminPrimaryClass}>Create draft</button>
          </div>
        </form>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map(pkg => (
            <AdminCard key={pkg.id} as="article" className="p-6">
              <p className="small-caps text-catalyst">Stage {pkg.stage} · {pkg.status}</p>
              <h2 className="mt-3 font-display text-2xl font-bold">{pkg.name}</h2>
              <p className="mt-3 min-h-14 text-sm text-muted-foreground">{pkg.summary}</p>
              <p className="mt-4 text-sm font-semibold">{prices.filter(price => price.packageId === pkg.id).length} payment choices</p>
              <Link className="mt-5 inline-block rounded bg-catalyst px-5 py-3 font-semibold text-white hover:opacity-90" href={`/admin/packages/${pkg.id}`}>
                Edit package
              </Link>
            </AdminCard>
          ))}
        </div>
      </div>
    </main>
  );
}
