import Link from "next/link";
import { adminCardClass, adminFieldClass, adminLabelClass, adminPrimaryClass } from "@/components/mogen/admin-card";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireCatalogueAdmin } from "@/lib/admin/access";
import { updatePackageAction, updatePriceAction, createPriceAction } from "@/lib/admin/catalogue-actions";
import { getCatalogueDb } from "@/db/client";
import { webPackages, webPackagePrices } from "@/db/schema";

export const dynamic = "force-dynamic";
const input = adminFieldClass;
const label = adminLabelClass;

export default async function EditPackagePage({ params, searchParams }: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}>) {
  await requireCatalogueAdmin();
  const { id } = await params;
  const db = getCatalogueDb();
  const [pkg] = await db.select().from(webPackages).where(eq(webPackages.id, id)).limit(1);
  if (!pkg) notFound();
  const prices = await db.select().from(webPackagePrices).where(eq(webPackagePrices.packageId, id));
  const { saved } = await searchParams;
  return (
    <main className="min-h-screen bg-bone px-6 py-14 text-ink lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap gap-5 text-sm font-semibold text-catalyst">
          <Link href="/admin">Admin</Link><Link href="/admin/packages">All packages</Link>
          <Link href="/admin/promotions">Promotions</Link>
          <Link href="/services/web-development#pricing" target="_blank">Public pricing</Link>
        </div>
        <p className="small-caps mt-10 text-catalyst">Stage {pkg.stage} · {pkg.id}</p>
        <h1 className="mt-3 font-display text-4xl font-black">Edit {pkg.name}</h1>
        {saved === "1" && <p role="status" className="mt-5 rounded border border-catalyst p-4 font-semibold">Changes saved.</p>}
        <form action={updatePackageAction} className={`mt-8 grid gap-5 ${adminCardClass} p-6 sm:grid-cols-2`}>
          <input type="hidden" name="id" value={pkg.id} />
          <div><label className={label} htmlFor="pkg-name">Display name</label><input className={input} id="pkg-name" name="name" required defaultValue={pkg.name} /></div>
          <div><label className={label} htmlFor="pkg-status">Publication status</label>
            <select className={input} id="pkg-status" name="status" defaultValue={pkg.status}>
              <option value="draft">Draft</option><option value="published">Published</option><option value="retired">Retired</option>
            </select>
          </div>
          <div className="sm:col-span-2"><label className={label} htmlFor="pkg-summary">Summary</label><textarea className={input} id="pkg-summary" name="summary" rows={2} defaultValue={pkg.summary} /></div>
          <div className="sm:col-span-2"><label className={label} htmlFor="pkg-description">Description</label><textarea className={input} id="pkg-description" name="description" rows={4} defaultValue={pkg.description} /></div>
          <div><label className={label} htmlFor="pkg-max">Maximum pages (empty = not specified)</label><input className={input} id="pkg-max" name="maxPages" type="number" min="0" defaultValue={pkg.maxPages ?? ""} /></div>
          <div><label className={label} htmlFor="pkg-pricing-label">Pricing label</label><input className={input} id="pkg-pricing-label" name="pricingLabel" required defaultValue={pkg.pricingLabel} /></div>
          {([
            ["features", "Included features", pkg.features],
            ["seoScope", "SEO scope", pkg.seoScope],
            ["exclusions", "Exclusions", pkg.exclusions],
          ] as const).map(([key, heading, values]) => (
            <div key={key} className="sm:col-span-2">
              <label htmlFor={`pkg-${key}`} className={label}>{heading} — one per line</label>
              <textarea className={input} id={`pkg-${key}`} name={key} rows={5} defaultValue={values.join("\n")} />
            </div>
          ))}
          <div className="sm:col-span-2">
            <button className={adminPrimaryClass}>Save package</button>
          </div>
        </form>
        <h2 className="mt-12 font-display text-3xl font-black">Payment choices</h2>
        <p className="mt-2 text-muted-foreground">Amounts are in South African rand. Only publish a price after checking package eligibility and contract terms.</p>
        <form action={createPriceAction} className={`mt-6 flex flex-wrap items-end gap-4 ${adminCardClass} p-6`}>
          <input type="hidden" name="packageId" value={pkg.id} />
          <div className="min-w-56 flex-1">
            <label className={label} htmlFor="new-billing-mode">Add payment mode (starts as draft)</label>
            <select id="new-billing-mode" name="billingMode" className={input}>
              {pkg.id === "seed" ? <option value="once_off">Once-Off</option> : <>
                <option value="managed_monthly">Managed Monthly</option>
                <option value="managed_annual">Managed Annually</option>
                <option value="self_hosted">Self-Hosted</option>
              </>}
            </select>
          </div>
          <button className={adminPrimaryClass}>Create draft price</button>
        </form>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {prices.map(price => (
            <form key={price.id} action={updatePriceAction} className={`${adminCardClass} p-6`}>
              <input type="hidden" name="id" value={price.id} />
              <h3 className="font-display text-xl font-bold">{price.billingMode.replaceAll("_", " ")}</h3>
              <p className="mt-1 break-all text-xs text-muted-foreground">{price.id}</p>
              <div className="mt-4">
                <label className={label} htmlFor={`amount-${price.id}`}>Price (ZAR cents)</label>
                <input className={input} name="amountCents" id={`amount-${price.id}`} type="number" min="0" defaultValue={price.amountCents ?? ""} />
              </div>
              <div className="mt-4">
                <label className={label} htmlFor={`setup-${price.id}`}>Setup fee (ZAR cents)</label>
                <input className={input} name="setupFeeCents" id={`setup-${price.id}`} type="number" min="0" defaultValue={price.setupFeeCents ?? ""} />
              </div>
              <div className="mt-4">
                <label className={label} htmlFor={`status-${price.id}`}>Status</label>
                <select className={input} name="status" id={`status-${price.id}`} defaultValue={price.status}>
                  <option value="draft">Draft</option><option value="published">Published</option><option value="retired">Retired</option>
                </select>
              </div>
              <div className="mt-4">
                <label className={label} htmlFor={`min-${price.id}`}>Minimum contract months</label>
                <input className={input} name="minimumMonths" id={`min-${price.id}`} type="number" min="0" defaultValue={price.minimumMonths ?? ""} />
              </div>
              <div className="mt-4">
                <label className={label} htmlFor={`deposit-${price.id}`}>Deposit percentage</label>
                <input className={input} name="depositPercent" id={`deposit-${price.id}`} type="number" min="0" max="100" defaultValue={price.depositPercent ?? ""} />
              </div>
              <div className="mt-4">
                <label className={label} htmlFor={`handover-${price.id}`}>Handover terms</label>
                <textarea className={input} name="handoverPolicy" id={`handover-${price.id}`} rows={2} defaultValue={price.handoverPolicy} />
              </div>
              <div className="mt-4">
                <label className={label} htmlFor={`notes-${price.id}`}>Internal/commercial notes</label>
                <textarea className={input} name="notes" id={`notes-${price.id}`} rows={2} defaultValue={price.notes} />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Hosting: {price.hostingResponsibility} · Maintenance: {price.maintenanceResponsibility}</p>
              <button className="mt-5 rounded bg-catalyst px-5 py-3 font-semibold text-white">Save payment choice</button>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
