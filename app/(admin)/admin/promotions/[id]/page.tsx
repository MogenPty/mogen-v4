import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import PromotionEditorWizard, { type PromotionEditorValues, type PromotionTargetDraft } from "@/components/mogen/promotion-editor-wizard";
import { getCatalogueDb } from "@/db/client";
import { webPackages, webPackagePrices, webPromotions, webPromotionPrices } from "@/db/schema";
import { requireCatalogueAdmin } from "@/lib/admin/access";
import { setPromotionStatusAction } from "@/lib/admin/catalogue-actions";

export const dynamic = "force-dynamic";
const lines = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join("\n") : "";
const isoLocal = (value: Date | null) => value ? new Date(value.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16) : "";

export default async function EditPromotionPage({ params, searchParams }: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}>) {
  await requireCatalogueAdmin();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
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
  const optionsByPackage = options.filter(option =>
    option.status === "published" && packages.some(pkg => pkg.id === option.packageId && pkg.status === "published"));
  const target = targets[0];
  const targetOption = options.find(option => option.id === target?.packagePriceId);
  const editorTargets: PromotionTargetDraft[] = targets.map(item => ({
    packagePriceId: item.packagePriceId,
    appliesTo: item.appliesTo as PromotionTargetDraft["appliesTo"],
    discountKind: item.discountKind as PromotionTargetDraft["discountKind"],
    discountValue: item.discountKind === "percent"
      ? String((item.discountPercentBps ?? 0) / 100)
      : String((item.discountAmountCents ?? 0) / 100),
    discountedMonths: item.discountedMonths === null ? "" : String(item.discountedMonths),
  }));
  const initialValues: PromotionEditorValues = {
    name: campaign.name,
    sortOrder: String(campaign.sortOrder),
    description: campaign.description,
    shortDescription: String(presentation.shortDescription ?? ""),
    ctaLabel: String(presentation.ctaLabel ?? ""),
    locationSlug: campaign.locationSlug ?? "",
    maximumCustomers: campaign.maximumCustomers === null ? "" : String(campaign.maximumCustomers),
    pricingPackageId: targetOption?.packageId ?? "",
    targets: editorTargets,
    terms: lines(presentation.terms),
    eligibility: lines(presentation.eligibility) || campaign.eligibility,
    included: lines(presentation.included),
    startsAt: isoLocal(campaign.startsAt),
    endsAt: isoLocal(campaign.endsAt),
    isFeatured: campaign.isFeatured,
    status: campaign.status as PromotionEditorValues["status"],
  };

  return (
    <main className="min-h-screen bg-bone px-6 py-14 text-ink lg:px-10">
      <div className="mx-auto max-w-5xl">
        <nav className="flex gap-5 text-sm font-semibold text-catalyst">
          <Link href="/admin">Admin</Link><Link href="/admin/promotions">All promotions</Link>
          <Link href="/admin/packages">Packages</Link>
          {campaign.slug && <Link href={`/promotions/${campaign.slug}`} target="_blank">Public page</Link>}
        </nav>
        <p className="small-caps mt-10 text-catalyst">{campaign.status} · {campaign.id}</p>
        <h1 className="mt-3 font-display text-4xl font-black">{created === "1" ? "Create promotion" : campaign.name}</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          {created === "1"
            ? "Complete each step in order. Your progress is saved whenever you choose Save & next."
            : "Open any saved step. If you change something, save or reset it before moving elsewhere."}
        </p>
        {(campaign.status === "active" || campaign.status === "scheduled") && (
          <form action={setPromotionStatusAction} className="mt-6">
            <input type="hidden" name="id" value={campaign.id} />
            <input type="hidden" name="status" value="expired" />
            <button className="rounded border border-red-500 bg-card px-5 py-3 font-semibold text-red-600 hover:bg-muted dark:text-red-300">Expire this promotion now</button>
          </form>
        )}
        <PromotionEditorWizard
          campaignId={campaign.id}
          mode={created === "1" ? "create" : "edit"}
          initialValues={initialValues}
          priceOptions={optionsByPackage.map(option => ({
            id: option.id,
            packageId: option.packageId,
            packageName: packages.find(pkg => pkg.id === option.packageId)?.name ?? option.packageId,
            billingMode: option.billingMode as "managed_monthly" | "managed_annual" | "once_off" | "self_hosted",
            amountCents: option.amountCents ?? 0,
            setupFeeCents: option.setupFeeCents,
          }))}
        />
      </div>
    </main>
  );
}
