import Link from "next/link";
import AdminCard, { adminCardClass, adminFieldClass, adminPrimaryClass } from "@/components/mogen/admin-card";
import { asc } from "drizzle-orm";
import { requireCatalogueAdmin } from "@/lib/admin/access";
import { createPromotionAction, setPromotionStatusAction } from "@/lib/admin/catalogue-actions";
import { getCatalogueDb } from "@/db/client";
import { webPromotions } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  await requireCatalogueAdmin();
  const campaigns = await getCatalogueDb().select().from(webPromotions).orderBy(asc(webPromotions.sortOrder));
  return (
    <main className="min-h-screen bg-bone px-6 py-14 text-ink lg:px-10">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-8 flex gap-5 text-sm font-semibold text-catalyst">
          <Link href="/admin">Admin</Link><Link href="/admin/packages">Packages</Link>
        </nav>
        <h1 className="font-display text-4xl font-black">Promotions</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Create draft campaigns, link approved payment choices, then publish on a schedule. Only active promotions are claimable. Customer caps require manual monitoring.
        </p>
        <form action={createPromotionAction} className="mt-8 grid gap-4 rounded-xl border border-ink/15 bg-white p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div><label className="block text-sm font-semibold" htmlFor="promo-new-name">New campaign name</label>
            <input id="promo-new-name" name="name" required minLength={3} placeholder="Spring launch" className={adminFieldClass} />
          </div>
          <div><label className="block text-sm font-semibold" htmlFor="promo-new-slug">URL slug</label>
            <input id="promo-new-slug" name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required placeholder="spring-launch" className={adminFieldClass} />
          </div>
          <button className={adminPrimaryClass}>Create draft</button>
        </form>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {campaigns.map(campaign => (
            <article key={campaign.id} className={`${adminCardClass} p-6">
              <p className="small-caps text-catalyst">{campaign.status} · {campaign.locationSlug ?? "All locations"}</p>
              <h2 className="mt-3 font-display text-2xl font-bold">{campaign.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{campaign.description || "No description yet"}</p>
              <p className="mt-2 text-xs text-muted-foreground">Slug: {campaign.slug ?? "not assigned"} {campaign.isFeatured ? "· Featured" : ""}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link className={adminPrimaryClass} href={`/admin/promotions/${campaign.id}`}>Edit promotion</Link>
                {campaign.status === "active" || campaign.status === "scheduled" ? (
                  <form action={setPromotionStatusAction}>
                    <input type="hidden" name="id" value={campaign.id} />
                    <input type="hidden" name="status" value="expired" />
                    <button className="rounded border border-red-600 px-5 py-3 font-semibold text-red-700">Expire now</button>
                  </form>
                ) : null}
              </div>
            </AdminCard>
          ))}
          {!campaigns.length && <p className={`${adminCardClass} p-6 text-muted-foreground`}>No campaigns have been created yet.</p>}
        </div>
      </div>
    </main>
  );
}
