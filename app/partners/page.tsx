import AuditGrid from "@/components/mogen/audit-grid";
import PageShell from "@/components/mogen/page-shell";
import PartnersGrid from "@/components/mogen/partners-grid";

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
