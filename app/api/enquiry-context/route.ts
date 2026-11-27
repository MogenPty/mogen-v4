import { getEffectiveStatus } from "@/data/promotions";
import { getPackage } from "@/data/packages";
import { databaseCatalogueEnabled, loadPublicWebPriceOptions } from "@/lib/catalogue/server";
import { loadPromotionBySlug } from "@/lib/catalogue/promotions-server";
import { getPublishedWebPackage } from "@/db/catalogue";
import { buildAuditEnquiryMessage, parseEnquiryContext, resolveEnquiryDetails } from "@/lib/enquiry/enquiry";
import type { PopupEnquiry } from "@/components/mogen/enquiry-popup-host";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const input = parseEnquiryContext(params);
  const details = resolveEnquiryDetails({ ...input, promotion: undefined });
  const candidate = input.promotion ? await loadPromotionBySlug(input.promotion) : undefined;
  const promotion = candidate && getEffectiveStatus(candidate) === "active" ? candidate : undefined;
  const packageId = promotion?.relatedPackage ?? input.package;
  const catalogueEnabled = databaseCatalogueEnabled();
  const dbPackage = catalogueEnabled && packageId &&
    (!details.package || details.package.serviceSlug === "web-development" || promotion?.source === "database")
    ? await getPublishedWebPackage(packageId)
    : undefined;
  const knownPackage = promotion ? getPackage(packageId) : details.package;
  const staticPackage = knownPackage?.serviceSlug === "web-development" && catalogueEnabled
    ? undefined : knownPackage;
  const selectedPackage = dbPackage ?? staticPackage;
  const serviceSlug = promotion?.relatedService ?? (dbPackage ? "web-development" : details.service?.slug);
  const prices = dbPackage
    ? (await loadPublicWebPriceOptions() ?? []).flatMap(({ id, packageId, billingMode, amountCents, setupFeeCents }) =>
        packageId === dbPackage.id && amountCents !== null ? [{ id, packageId, billingMode, amountCents, setupFeeCents }] : [])
    : [];

  const payload: PopupEnquiry = {
    context: promotion ? { type: "promotion", promotion }
      : selectedPackage ? { type: "package", packageId: selectedPackage.id }
      : serviceSlug ? { type: "service", serviceSlug } : { type: "general" },
    packageName: selectedPackage?.name,
    prices,
    attribution: details.attribution,
    initialPriceOptionId: params.get("priceOption") ?? promotion?.targetPriceOptionId,
    initialMessage: promotion ? undefined : buildAuditEnquiryMessage(details.website),
  };
  return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
}
