import type { Metadata } from "next";
import GrowthAuditResults from "@/components/mogen/growth-audit-results";

export const metadata: Metadata = {
  title: "Growth Audit Results",
  description:
    "Your personalised Mogen Growth Audit result. Run a free audit to see your score.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GrowthAuditResultsPage() {
  return <GrowthAuditResults numbering={11} />;
}
