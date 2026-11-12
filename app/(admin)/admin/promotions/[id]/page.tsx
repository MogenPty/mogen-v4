import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireCatalogueAdmin } from "@/lib/admin/access";
import {
  savePromotionTargetAction, setPromotionStatusAction, updatePromotionAction,
} from "@/lib/admin/catalogue-actions";
import { getCatalogueDb } from "@/db/client";
import { webPackages, webPackagePrices, webPromotions, webPromotionPrices } from "@/db/schema";

export const dynamic = "force-dynamic";
const fieldStyle = "mt-2 w-full rounded border border-ink/20 bg-white px-4 py-3 text-ink";
const labelStyle = "block text-sm font-semibold text-ink";
const lines = (value: unknown) => Array.isArray(value) ? value.filter((s): s is string => typeof s === "string").join("\n") : "";
const isoLocal = (value: Date | null) => value ? new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

export default async function EditPromotionPage({ params, searchParams }: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}>) {
  await requireCatalogueAdmin();
  const { id } = await params;
  const db = getCatalogueDb();
  const [campaign] = await db.select().from(webPromotions).where(eq(webPromotions.id, id)).limit(1);
  if (!campaign) notFound();
  const [targets, options, packages] = await Promise.all([
    db.select().from(webPromotionPrices).where(eq(webPromotionPrices.promotionId, id)),
    db.select().from(webPackagePrices),
    db.select().from(webPackages),
  ]);
  const presentation = campaign.presentation && typeof campaign.presentation === "object" && !Array.isArray(campaign.presentation)
    ? campaign.presentation as Record<string, unknown> : {};
  const { saved } = await searchParams;
  const optionsByPackage = options.filter(p => p.status === "published" && packages.some(pkg => pkg.id === p.packageId && pkg.status === "published"));
  return (
    <main className="min-h-screen bg-bone px-6 py-14 text-ink lg:px-10">
      <div className="mx-auto max-w-5xl">
        <nav className="flex gap-5 text-sm font-semibold text-catalyst">
          <Link href="/admin">Admin</Link><Link href="/admin/promotions">All promotions</Link>
          <Link href="/admin/packages">Packages</Link>
          {campaign.slug && <Link href={`/promotions/${campaign.slug}`} target="_blank">Public page</Link>}
        </nav>
        <p className="small-caps mt-10 text-catalyst">{campaign.status} · {campaign.id}</p>
        <h1 className="mt-3 font-display text-4xl font-black">{campaign.name}</h1>
        {saved === "1" && <p role="status" className="mt-5 rounded border border-catalyst p-4 font-semibold">Changes saved.</p>}
        {(campaign.status === "active" || campaign.status === "scheduled") && (
          <form action={setPromotionStatusAction} className="mt-6">
            <input type="hidden" name="id" value={campaign.id} />
            <input type="hidden" name="status" value="expired" />
            <button className="rounded border border-red-600 bg-white px-5 py-3 font-semibold text-red-700">Expire this promotion now</button>
          </form>
        )}
        <form action={updatePromotionAction} className="mt-8 grid gap-5 rounded-xl border border-ink/15 bg-white p-6 sm:grid-cols-2">
          <input type="hidden" name="id" value={campaign.id} />
          <div><label htmlFor="promotion-name" className={labelStyle}>Name</label>
            <input id="promotion-name" name="name" required className={fieldStyle} defaultValue={campaign.name} /></div>
          <div><label htmlFor="promotion-order" className={labelStyle}>Display order</label>
            <input id="promotion-order" name="sortOrder" type="number" min="0" className={fieldStyle} defaultValue={campaign.sortOrder} /></div>
          <div className="sm:col-span-2"><label htmlFor="promotion-description" className={labelStyle}>Description</label>
            <textarea id="promotion-description" name="description" rows={3} className={fieldStyle} defaultValue={campaign.description} /></div>
          <div className="sm:col-span-2"><label htmlFor="promotion-short" className={labelStyle}>Short description</label>
            <input id="promotion-short" name="shortDescription" maxLength={300} className={fieldStyle} defaultValue={String(presentation.shortDescription ?? "")} /></div>
          <div><label htmlFor="promotion-cta" className={labelStyle}>CTA label</label>
            <input id="promotion-cta" name="ctaLabel" className={fieldStyle} defaultValue={String(presentation.ctaLabel ?? "")} /></div>
          <div><label htmlFor="promotion-location" className={labelStyle}>Location eligibility</label>
            <select id="promotion-location" name="locationSlug" className={fieldStyle} defaultValue={campaign.locationSlug ?? ""}>
              <option value="">All locations</option><option value="maboloka">Maboloka</option>
              <option value="soshanguve">Soshanguve</option><option value="centurion">Centurion</option>
            </select></div>
          <div><label htmlFor="promotion-start" className={labelStyle}>Starts (local browser time)</label>
            <input id="promotion-start" name="startsAt" type="datetime-local" className={fieldStyle} defaultValue={isoLocal(campaign.startsAt)} /></div>
          <div><label htmlFor="promotion-end" className={labelStyle}>Ends (local browser time)</label>
            <input id="promotion-end" name="endsAt" type="datetime-local" className={fieldStyle} defaultValue={isoLocal(campaign.endsAt)} /></div>
          <div><label htmlFor="promotion-cap" className={labelStyle}>Maximum customers (empty = no cap)</label>
            <input id="promotion-cap" name="maximumCustomers" type="number" min="1" className={fieldStyle} defaultValue={campaign.maximumCustomers ?? ""} /></div>
          <label className="flex items-center gap-3 self-end pb-3 text-sm font-semibold">
            <input type="checkbox" name="isFeatured" defaultChecked={campaign.isFeatured} /> Featured on homepage
          </label>
          {(["terms", "eligibility", "included"] as const).map(key => (
            <div key={key} className="sm:col-span-2">
              <label className={labelStyle} htmlFor={`promotion-${key}`}>{key[0].toUpperCase() + key.slice(1)} — one per line</label>
              <textarea id={`promotion-${key}`} name={key} rows={5} className={fieldStyle}
                defaultValue={lines(presentation[key]) || (key === "eligibility" ? campaign.eligibility : "")} />
            </div>
          ))}
          <div className="sm:col-span-2"><button className="rounded bg-catalyst px-6 py-3 font-semibold text-white">Save campaign details</button></div>
        </form>
        <h2 className="mt-12 font-display text-3xl font-black">Discount and target</h2>
        <p className="mt-2 text-ink/70">Choose an approved published payment choice. For a fixed discount, enter cents; for a percentage, enter basis points (500 = 5%). Only one target per campaign is supported in this editor.</p>
        {targets.length > 0 && (
          <div className="mt-5 rounded-lg border border-ink/15 bg-white p-5">
            {targets.map(t => <p key={`${t.packagePriceId}:${t.appliesTo}`} className="text-sm">
              {t.packagePriceId} · {t.appliesTo} · {t.discountKind} · {t.discountKind === "fixed" ? `R${(t.discountAmountCents ?? 0) / 100}` : `${(t.discountPercentBps ?? 0) / 100}%`} · {t.discountedMonths ?? "no"} limited months
            </p>)}
          </div>
        )}
        <form action={savePromotionTargetAction} className="mt-6 grid gap-5 rounded-xl border border-ink/15 bg-white p-6 sm:grid-cols-2">
          <input type="hidden" name="promotionId" value={campaign.id} />
          <div className="sm:col-span-2"><label htmlFor="promotion-target" className={labelStyle}>Published package payment option</label>
            <select id="promotion-target" name="packagePriceId" required className={fieldStyle} defaultValue={targets[0]?.packagePriceId ?? ""}>
              <option value="">Select a published option</option>
              {optionsByPackage.map(option => <option key={option.id} value={option.id}>
                {packages.find(pkg => pkg.id === option.packageId)?.name ?? option.packageId} · {option.billingMode} · {option.id}
              </option>)}
            </select>
          </div>
          <div><label htmlFor="promotion-applies" className={labelStyle}>Discount applies to</label>
            <select id="promotion-applies" name="appliesTo" className={fieldStyle} defaultValue={targets[0]?.appliesTo ?? "recurring"}>
              <option value="recurring">Recurring price</option><option value="setup">Setup fee</option><option value="project">Project price</option>
            </select>
          </div>
          <div><label htmlFor="promotion-kind" className={labelStyle}>Discount type</label>
            <select id="promotion-kind" name="discountKind" className={fieldStyle} defaultValue={targets[0]?.discountKind ?? "fixed"}>
              <option value="fixed">Fixed amount (cents)</option><option value="percent">Percentage (basis points)</option>
            </select>
          </div>
          <div><label htmlFor="promotion-value" className={labelStyle}>Discount value</label>
            <input id="promotion-value" name="discountValue" type="number" min="1" required className={fieldStyle}
              defaultValue={targets[0]?.discountKind === "percent" ? targets[0].discountPercentBps ?? "" : targets[0]?.discountAmountCents ?? ""} />
          </div>
          <div><label htmlFor="promotion-months" className={labelStyle}>Discounted months (monthly recurring only)</label>
            <input id="promotion-months" name="discountedMonths" type="number" min="1" className={fieldStyle}
              defaultValue={targets[0]?.discountedMonths ?? ""} />
          </div>
          <div className="sm:col-span-2"><button className="rounded bg-catalyst px-6 py-3 font-semibold text-white">Save discount target</button></div>
        </form>
        <h2 className="mt-12 font-display text-3xl font-black">Publication</h2>
        <p className="mt-2 text-ink/70">Save campaign details and discount target before activating. Publication verifies approved terms, linked pricing and effective dates.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {(["draft", "scheduled", "active", "expired", "archived"] as const).map(status => (
            <form key={status} action={setPromotionStatusAction}>
              <input type="hidden" name="id" value={campaign.id} />
              <input type="hidden" name="status" value={status} />
              <button disabled={campaign.status === status}
                className={`rounded border px-4 py-3 text-sm font-semibold disabled:opacity-40 ${status === "expired" ? "border-red-600 text-red-700" : "border-ink/25"}`}>
                {status === "active" ? "Publish active" : status === "scheduled" ? "Schedule" : status === "expired" ? "Expire now" : status === "archived" ? "Archive" : "Move to draft"}
              </button>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
