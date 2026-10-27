import type { ReactNode } from "react";
import type { Promotion } from "@/data/promotions";
import type { EnquiryAttribution } from "@/lib/enquiry/enquiry";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import ConversionBar from "./conversation-bar";
import Footer from "./footer";
import Nav from "./nav";

interface Props {
  index: string | number;
  label: string;
  title: ReactNode;
  intro?: string;
  children: ReactNode;
  /** Optional media rendered in the header, behind/under the title on the right. */
  headerMedia?: ReactNode;
  /** Optional content rendered at the bottom of the header (e.g. "Back to articles"). */
  headerFooter?: ReactNode;
  /**
   * Page service context (service pages pass their slug — always wins).
   * Omitted on generic pages (site-wide Web Development default).
   */
  serviceSlug?: string;
  /**
   * Fallback service identity for pages without a service context.
   * Defaults to Web Development (the site-wide default).
   */
  defaultServiceSlug?: string;
  /**
   * Authoritative featured promotion (promotions routes behave like the
   * homepage). Omitted everywhere else — no promotion applies.
   */
  featuredPromotion?: Promotion | null;
  /** UTM attribution forwarded into enquiry destinations. */
  attribution?: EnquiryAttribution;
  /**
   * ConversionBar variant. `journey` shows a Page Journey progress
   * indicator instead of an enquiry CTA — for informational/company/legal
   * pages. Defaults to `conversion`.
   */
  barVariant?: "conversion" | "journey";
}

export default function PageShell({
  index,
  label,
  title,
  intro,
  children,
  headerMedia,
  headerFooter,
  serviceSlug,
  defaultServiceSlug,
  featuredPromotion,
  attribution,
  barVariant = "conversion",
}: Readonly<Props>) {
  return (
    <div id={"top"} className="bg-bone">
      <Nav
        serviceSlug={serviceSlug}
        defaultServiceSlug={defaultServiceSlug}
        attribution={attribution}
        featuredPromotion={featuredPromotion}
      />
      <main>
        <BlueprintGrid className="bg-bone min-h-140 pt-32 pb-16 lg:min-h-180 lg:pt-40 lg:pb-20">
          <div className="relative mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
            <div className="relative z-10">
              <SectionLabel index={index} title={label} />
              <div className="mb-14 max-w-3xl">
                <h1 className="font-display text-4xl font-black leading-[1.02] text-ink lg:text-7xl text-balance">
                  {title}
                </h1>
                {intro && <p className="mt-6 text-lg text-ink/70">{intro}</p>}
              </div>
              {headerFooter ? (
                <div className="relative z-10 mt-6">{headerFooter}</div>
              ) : null}
            </div>
            {headerMedia ? (
              <div
                aria-hidden="true"
                className="pointer-events-none relative -mx-4 mt-8 h-64 overflow-hidden sm:-mx-6 lg:absolute lg:right-0 lg:top-0 lg:mx-0 lg:mt-0 lg:h-full lg:w-3/4"
              >
                {headerMedia}
              </div>
            ) : null}
          </div>
        </BlueprintGrid>
        {children}
      </main>
      <Footer
        serviceSlug={serviceSlug}
        defaultServiceSlug={defaultServiceSlug}
        attribution={attribution}
        featuredPromotion={featuredPromotion}
      />
      <ConversionBar
        variant={barVariant}
        serviceSlug={serviceSlug}
        defaultServiceSlug={defaultServiceSlug}
        attribution={attribution}
        featuredPromotion={featuredPromotion}
      />
    </div>
  );
}
