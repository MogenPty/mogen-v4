import type { Metadata } from "next";
import AuditGrid from "@/components/mogen/audit-grid";
import PageShell from "@/components/mogen/page-shell";
import PartnersGrid from "@/components/mogen/partners-grid";
import { pageMetadata } from "@/lib/seo";
import { STATIC_META } from "@/lib/seo/metadata-registry";

export const metadata: Metadata = pageMetadata({
  path: "/partners",
  title: STATIC_META["/partners"].title,
  description: STATIC_META["/partners"].description,
});

export default function Partners() {
  return (
    <PageShell
      index="// 13 — Partners"
      label="Partner Network"
      barVariant="journey"
      title={
        <>
          Tools we trust,{" "}
          <span className="text-catalyst">growth we build.</span>
        </>
      }
      intro="The software partners and recommended tools we use alongside our services to compound your results."
    >
      <PartnersGrid />

      <AuditGrid />
    </PageShell>
  );
}
