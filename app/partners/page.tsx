import type { Metadata } from "next";
import AuditGrid from "@/components/mogen/audit-grid";
import PageShell from "@/components/mogen/page-shell";
import PartnersGrid from "@/components/mogen/partners-grid";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/partners",
  title: "Partners",
  description:
    "Software partners and recommended tools Mogen uses alongside its services to compound client results.",
});

export default function Partners() {
  return (
    <PageShell
      index="// 13 — Partners"
      label="Partner Network"
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
