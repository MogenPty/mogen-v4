import { ArrowRight, Compass, ShieldCheck, Target, Zap } from "lucide-react";
import BlueprintGrid from "@/components/mogen/blueprint-grid";
import MagneticButton from "@/components/mogen/magnet-button";
import PageShell from "@/components/mogen/page-shell";

const VALUES = [
  {
    icon: Target,
    title: "Outcomes over output",
    desc: "We measure success in bookings, enquiries and revenue — not vanity metrics.",
  },
  {
    icon: Compass,
    title: "Local first",
    desc: "We know Pretoria, Maboloka, Soshanguve and Gauteng. We build for the customers next door.",
  },
  {
    icon: ShieldCheck,
    title: "Built to last",
    desc: "Fast, secure, well-engineered sites that keep ranking and converting for years.",
  },
  {
    icon: Zap,
    title: "Momentum compounds",
    desc: "SEO and content stack on each other. We engineer growth that accelerates over time.",
  },
];

const TEAM = [
  { name: "Solly Motsoane", role: "Founder & Lead Developer", initials: "SM" },
  { name: "Valencia Mabika", role: "Search Intelligence", initials: "VM" },
  { name: "Neo Li", role: "Content & Local SEO", initials: "NL" },
  { name: "Aazelliah Johns", role: "Brand & Design", initials: "AJ" },
  { name: "Theophilus Leruo", role: "SEO Technical", initials: "TL" },
  { name: "Tshepiso Rorisang", role: "SEO Authority", initials: "TR" },
  { name: "Prosper Lebeko", role: "Growth Strategist", initials: "PL" },
];

export default function About() {
  return (
    <PageShell
      index="// 10 — About"
      label="About Mogen"
      title={
        <>
          We build growth engines for{" "}
          <span className="text-catalyst">local business.</span>
        </>
      }
      intro="Mogen is a Pretoria-based growth agency. We build stunning websites, killer brands and rank-winning SEO for local businesses across Gauteng."
    >
      {/* Origin story */}
      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <span className="small-caps text-ink/50">Our story</span>
              <h2 className="mt-4 font-display text-3xl font-black leading-tight text-ink lg:text-4xl text-balance">
                Started in a Pretoria back office. Built for the businesses big
                agencies ignore.
              </h2>
            </div>
            <div className="space-y-5 text-lg leading-relaxed text-ink/70">
              <p>
                Mogen began when our founders noticed the same problem again and
                again: brilliant local businesses — restaurants, clinics,
                retailers — were invisible online. Not because they weren&apos;t
                good, but because the tools to get found on Google were locked
                behind expensive agencies and confusing software.
              </p>
              <p>
                We set out to change that. We combined real engineering with
                deep local SEO knowledge to build growth engines that any local
                business could afford and understand. No jargon, no vanity
                dashboards — just more customers.
              </p>
              <p>
                Today we serve businesses across Pretoria, Maboloka, Soshanguve
                and greater Gauteng, and we&apos;ve helped over 50 local brands
                get found, look stunning and grow.
              </p>
            </div>
          </div>
        </div>
      </BlueprintGrid>

      {/* Mission */}
      <BlueprintGrid className="bg-ink py-24 text-bone">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <span className="small-caps text-catalyst">Our mission</span>
          <p className="mt-6 max-w-4xl font-display text-3xl font-black leading-tight lg:text-5xl text-balance">
            To give every local South African business the digital presence of a
            major brand — and the customers to match.
          </p>
        </div>
      </BlueprintGrid>

      {/* Values */}
      <BlueprintGrid className="bg-bone py-24">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <h2 className="mb-12 font-display text-3xl font-black text-ink lg:text-4xl">
            What we stand for
          </h2>
          <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="bg-bone p-8">
                  <Icon
                    className="h-8 w-8 text-catalyst"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <h3 className="mt-6 font-display text-xl font-black text-ink">
                    {v.title}
                  </h3>
                  <p className="mt-3 text-sm text-ink/70">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </BlueprintGrid>

      {/* Team */}
      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <h2 className="mb-12 font-display text-3xl font-black text-ink lg:text-4xl">
            The experts behind the work
          </h2>
          <div className="grid grid-cols-2 gap-px bg-ink/10 md:grid-cols-3 lg:grid-cols-6">
            {TEAM.map((m) => (
              <div
                key={m.name}
                className="flex flex-col items-center bg-bone p-6 text-center"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ink font-display text-xl font-black text-catalyst">
                  {m.initials}
                </div>
                <h3 className="mt-4 font-display text-base font-black text-ink">
                  {m.name}
                </h3>
                <p className="mt-1 small-caps text-ink/60">{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </BlueprintGrid>

      {/* CTA */}
      <BlueprintGrid className="bg-catalyst py-20 text-white">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-6 px-6 lg:flex-row lg:items-center lg:px-10">
          <h2 className="font-display text-3xl font-black lg:text-4xl text-balance">
            Let&apos;s grow your business together.
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <MagneticButton
              as="a"
              href="/#audit"
              variant="solid"
              className="bg-ink text-bone hover:bg-bone hover:text-ink"
            >
              Get Free Audit
            </MagneticButton>
            <MagneticButton
              as="a"
              href="/contact"
              variant="outline"
              className="border-white/60 text-white hover:bg-white hover:text-ink"
            >
              Contact Us <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </div>
        </div>
      </BlueprintGrid>
    </PageShell>
  );
}
