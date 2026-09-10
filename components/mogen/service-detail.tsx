"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import BlueprintGrid, { SectionLabel } from "@/components/mogen/blueprint-grid";
import ConversionBar from "@/components/mogen/conversation-bar";
import Footer from "@/components/mogen/footer";
import MagneticButton from "@/components/mogen/magnet-button";
import Nav from "@/components/mogen/nav";
import ServiceFAQ from "@/components/mogen/service-faq";
import ServicePricing from "@/components/mogen/service-pricing";
import ServiceQuoteForm from "@/components/mogen/service-quote-form";
import { getService, SERVICES } from "@/data/services";

interface Props {
  serviceSlug: string;
}

export default function ServiceDetail({ serviceSlug }: Readonly<Props>) {
  const service = getService(serviceSlug);

  useEffect(() => {
    if (!service) return;
    document.title = `${service.name} | Mogen — Pretoria Web, Brand & SEO Agency`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", service.tagline);

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.name,
      serviceType: service.name,
      provider: {
        "@type": "Organization",
        name: "Mogen",
        url: "https://www.mogen.co.za",
      },
      areaServed: "Pretoria, Gauteng, South Africa",
      description: service.tagline,
    });
    document.head.appendChild(ld);
    return () => {
      ld.remove();
    };
  }, [service]);

  if (!service) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bone px-6 text-center">
        <h1 className="font-display text-4xl font-black text-ink">
          Service not found
        </h1>
        <p className="mt-4 text-ink/60">We couldn&apos;t find that service.</p>
        <MagneticButton as="a" href="/" variant="catalyst" className="mt-8">
          Back home
        </MagneticButton>
      </div>
    );
  }

  const Icon = service.icon;
  const related = SERVICES.filter((s) => s.slug !== service.slug);

  return (
    <div className="bg-bone">
      <Nav />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-bone pt-32 pb-16 lg:pt-40">
          <div
            className="pointer-events-none absolute inset-0 z-0 blueprint-grid opacity-50"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-[1600px] px-6 lg:px-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 small-caps text-muted-foreground hover:text-catalyst"
            >
              <ArrowLeft className="h-4 w-4" /> All services
            </Link>
            <div className="mt-8 flex items-center gap-3">
              <Icon
                className="h-8 w-8 text-catalyst"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="small-caps text-muted-foreground">
                {service.name}
              </span>
            </div>
            <h1 className="mt-6 max-w-4xl font-display text-5xl font-black leading-[1.02] text-ink lg:text-7xl text-balance">
              {service.tagline}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink/70">
              {service.intro}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <MagneticButton as="a" href="#quote" variant="catalyst">
                Get a Quote
              </MagneticButton>
              <MagneticButton as="a" href="#pricing" variant="outline">
                View Pricing
              </MagneticButton>
            </div>
          </div>
        </section>

        {/* WHAT'S INCLUDED */}
        {service.deliverables && (
          <BlueprintGrid className="bg-bone py-20">
            <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
              <SectionLabel index="// 01 — Included" title="What you get" />
              <div className="grid grid-cols-1 gap-px bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">
                {service.deliverables.map((d) => (
                  <div key={d} className="flex items-center gap-3 bg-bone p-6">
                    <Check
                      className="h-5 w-5 shrink-0 text-catalyst"
                      aria-hidden="true"
                    />
                    <span className="text-ink/80">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </BlueprintGrid>
        )}

        {/* PROCESS */}
        {service.process && (
          <BlueprintGrid className="bg-secondary py-20">
            <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
              <SectionLabel index="// 02 — Process" title="How we work" />
              <div className="grid grid-cols-1 gap-px bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
                {service.process.map((p) => (
                  <div key={p.n} className="bg-bone p-8">
                    <span className="font-display text-4xl font-black text-catalyst">
                      {p.n}
                    </span>
                    <h3 className="mt-4 font-display text-xl font-black text-ink">
                      {p.t}
                    </h3>
                    <p className="mt-2 text-sm text-ink/70">{p.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </BlueprintGrid>
        )}

        {/* PRICING */}
        {service.pricing && (
          <BlueprintGrid id={"pricing"} className="bg-bone py-20 lg:py-28">
            <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
              <SectionLabel index="// 03 — Investment" title="Pricing" />
              <div className="mb-12 max-w-2xl">
                <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-5xl text-balance">
                  {service.name} packages
                </h2>
                <p className="mt-4 text-lg text-ink/70">
                  Transparent rates, no lock-in surprises. Pick the tier that
                  matches your stage — add-ons let you scale on demand.
                </p>
              </div>
              <ServicePricing
                pricing={service.pricing}
                serviceSlug={service.slug}
              />
            </div>
          </BlueprintGrid>
        )}

        {/* ADD-ONS */}
        {service.addons && service.addons.length > 0 && (
          <BlueprintGrid className="bg-secondary py-20">
            <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
              <SectionLabel index="// 04 — Optional" title="Add-ons" />
              <div className="grid grid-cols-1 gap-px bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
                {service.addons.map((a) => (
                  <div key={a.name} className="bg-bone p-6">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-display text-lg font-black text-ink">
                        {a.name}
                      </h3>
                      <span className="small-caps text-catalyst">
                        {a.price}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ink/60">{a.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </BlueprintGrid>
        )}

        {/* FAQ */}
        {service.faq && (
          <BlueprintGrid className="bg-bone py-20 lg:py-28">
            <div className="mx-auto max-w-225 px-6 lg:px-10">
              <SectionLabel index="// 05 — Questions" title="FAQ" />
              <h2 className="mb-10 font-display text-4xl font-black leading-[1.05] text-ink lg:text-5xl text-balance">
                Frequently asked questions
              </h2>
              <ServiceFAQ faq={service.faq} />
            </div>
          </BlueprintGrid>
        )}

        {/* QUOTE FORM */}
        <BlueprintGrid id={"quote"} className="bg-ink py-20 text-bone lg:py-28">
          <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
              <div>
                <span className="small-caps text-catalyst">
                  {"// 06 — Start"}
                </span>
                <h2 className="mt-6 font-display text-4xl font-black leading-[1.05] lg:text-6xl text-balance">
                  Let&apos;s build your
                  <br />
                  <span className="text-catalyst">
                    {service.name.toLowerCase()}.
                  </span>
                </h2>
                <p className="mt-6 max-w-md text-lg text-bone/70">
                  Send us your details and we&apos;ll prepare a tailored
                  proposal within 24 hours — no obligation.
                </p>
              </div>
              <ServiceQuoteForm serviceName={service.name} />
            </div>
          </div>
        </BlueprintGrid>

        {/* RELATED */}
        <BlueprintGrid className="bg-bone py-20">
          <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
            <SectionLabel index="// 07 — More" title="Other services" />
            <div className="grid grid-cols-1 gap-px bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((s) => {
                const RIcon = s.icon;
                return (
                  <Link
                    key={s.slug}
                    href={`/services/${s.slug}`}
                    className="group bg-bone p-6 transition-colors hover:bg-ink hover:text-bone"
                  >
                    <RIcon
                      className="h-7 w-7 text-catalyst"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <h3 className="mt-4 font-display text-lg font-black">
                      {s.name}
                    </h3>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <span className="small-caps">View service</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </BlueprintGrid>
      </main>
      <Footer />
      <ConversionBar />
    </div>
  );
}
