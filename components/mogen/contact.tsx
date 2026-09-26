"use client";

import { Clock, type LucideProps, Mail, MapPin } from "lucide-react";
import type React from "react";
import BlueprintGrid, { SectionLabel } from "@/components/mogen/blueprint-grid";
import { formatNumber } from "@/lib/utils";
import { siteConfig } from "@/data/site";
import ContactForm from "@/components/mogen/contact-form";
import ConversionBar from "@/components/mogen/conversation-bar";
import Footer from "@/components/mogen/footer";
import Nav from "@/components/mogen/nav";

interface Props {
  numbering?: number;
}

export default function Contact({ numbering = 1 }: Readonly<Props>) {
  return (
    <div className="bg-bone">
      <Nav />
      <main>
        <BlueprintGrid className="bg-bone pt-32 pb-20 lg:pt-40 lg:pb-28">
          <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
            <SectionLabel
              index={`// ${formatNumber(numbering)} — Contact`}
              title="Start a Conversation"
            />

            <div className="mb-14 max-w-2xl">
              <h1 className="font-display text-5xl font-black leading-[1.02] text-ink lg:text-7xl text-balance">
                Let&apos;s build
                <br />
                <span className="text-catalyst">something that lasts.</span>
              </h1>
              <p className="mt-6 text-lg text-ink/70">
                This is Mogen. Explain what you need — Mogen will review your
                enquiry and reply within one business day with a practical next
                step. No pushy sales calls.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-px bg-ink/10 lg:grid-cols-2">
              <div className="bg-bone p-8 lg:p-12">
                <h2 className="font-display text-2xl font-black text-ink">
                  Contact details
                </h2>
                <ul className="mt-8 space-y-6">
                  <Detail
                    icon={Mail}
                    label="Email"
                    value={siteConfig.email}
                    href={`mailto:${siteConfig.email}`}
                  />
                  <Detail
                    icon={MapPin}
                    label="Areas served"
                    value="Maboloka · Soshanguve · South Africa"
                  />
                  <Detail
                    icon={Clock}
                    label="Hours"
                    value="Mon-Fri, 08:00-17:00 SAST"
                  />
                </ul>

                <p className="mt-10 border-t border-ink/10 pt-8 text-sm leading-relaxed text-ink/60">
                  Prefer email? Write to{" "}
                  <a
                    href={`mailto:${siteConfig.email}`}
                    className="font-semibold text-ink hover:text-catalyst"
                  >
                    {siteConfig.email}
                  </a>{" "}
                  with a few lines about your business and what you need.
                </p>
              </div>

              <div className="bg-bone p-8 lg:p-12">
                <ContactForm />
              </div>
            </div>
          </div>
        </BlueprintGrid>
      </main>
      <Footer />
      <ConversionBar />
    </div>
  );
}

interface DetailProps {
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
  label: string;
  value: string;
  href?: string;
}

function Detail({ icon: Icon, label, value, href }: Readonly<DetailProps>) {
  const content = (
    <div className="flex items-start gap-4">
      <Icon
        className="h-5 w-5 text-catalyst"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <div>
        <div className="small-caps text-ink/50">{label}</div>
        <div className="mt-1 font-display text-lg font-bold text-ink">
          {value}
        </div>
      </div>
    </div>
  );
  return href ? (
    <a href={href} className="block transition-opacity hover:opacity-70">
      {content}
    </a>
  ) : (
    content
  );
}
