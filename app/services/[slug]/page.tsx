import ServiceDetail from "@/components/mogen/service-detail";
import { parseEnquiryAttribution } from "@/lib/enquiry/enquiry";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ServiceDetailPage({
  params,
  searchParams,
}: Readonly<Props>) {
  const { slug } = await params;
  // Carry allowlisted attribution (utm_*) from the service page URL into
  // enquiry CTAs — explicit service context always wins (see lib/enquiry).
  const attribution = parseEnquiryAttribution((await searchParams) ?? {});

  return (
    <ServiceDetail
      serviceSlug={slug}
      numbering={1}
      attribution={attribution}
    />
  );
}
