import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import BlueprintGrid, { SectionLabel } from "@/components/mogen/blueprint-grid";
import ConversionBar from "@/components/mogen/conversation-bar";
import Footer from "@/components/mogen/footer";
import Nav from "@/components/mogen/nav";
import { SERVICES } from "@/data/services";

export const metadata: Metadata = {
  title: "Pricing — Mogen Services & Pricing",
  description:
    "Mogen Services & Pricing — each service has its own three-tier pricing. View Web Development, SEO, Digital Marketing and Business Documentation pricing on their authoritative service pages.",
};

export default function PricingDirectoryPage() {
  return (
    <div className="bg-bone">
      <Nav />
      <main>
        <BlueprintGrid className="bg-bone pt-32 pb-16 lg:pt-40 lg:pb-20">
          <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
            <SectionLabel index="// — Pricing" title="Mogen Services & Pricing" />
            <div className="max-w-3xl">
              <h1 className="font-display text-5xl font-black leading-[1.02] text-ink lg:text-7xl text-balance">
                Services &<br />
                <span className="text-catalyst">pricing.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-ink/70">
                Each service has its own three-tier pricing, detailed on its
                authoritative service page. Select a service below to view its
                current packages, add-ons and FAQs. No generic bundles — you
                pay only for the service you need.
              </p>
            </div>
          </div>
        </BlueprintGrid>

        <BlueprintGrid className="bg-bone pb-24">
          <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
            <div className="grid grid-cols-1 gap-px bg-ink/10 sm:grid-cols-2 lg:grid-cols-2">
              {SERVICES.map((svc) => {
                const Icon = svc.icon;
                return (
                  <div
                    key={svc.slug}
                    className="flex flex-col bg-bone p-8"
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className="h-7 w-7 text-catalyst"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span className="small-caps text-muted-foreground">
                        {svc.name}
                      </span>
                    </div>
                    <h2 className="mt-4 font-display text-2xl font-black text-ink">
                      {svc.name}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-ink/70">
                      {svc.tagline}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <Link
                        href={`/services/${svc.slug}#pricing`}
                        className="inline-flex items-center gap-2 small-caps text-catalyst hover:text-ink"
                      >
                        View {svc.name} pricing
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <span className="text-ink/20" aria-hidden="true">
                        ·
                      </span>
                      <Link
                        href={`/services/${svc.slug}`}
                        className="small-caps text-ink/60 hover:text-catalyst"
                      >
                        Service overview
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-10 max-w-2xl text-sm text-ink/50">
              Pricing is maintained on each service page. The tables on those
              pages are authoritative — this directory does not duplicate them.
            </p>
          </div>
        </BlueprintGrid>
      </main>
      <Footer />
      <ConversionBar />
    </div>
  );
}
