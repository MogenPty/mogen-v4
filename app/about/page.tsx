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

const APPROACH = [
  {
    title: "Engineering-led",
    desc: "We build fast, secure, well-structured websites with clean code and strong technical foundations.",
  },
  {
    title: "Local expertise",
    desc: "We focus on how local customers search and decide — from Google Business Profile to local content.",
  },
  {
    title: "Practical process",
    desc: "Clear scopes, transparent pricing, and a defined process from discovery through launch and growth.",
  },
  {
    title: "Specialist partners",
    desc: "Where a project needs specialist input, we work with trusted external partners and keep you informed throughout.",
  },
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
      intro="Mogen is a Pretoria-based growth agency. We build websites, business documentation and SEO for local businesses across Gauteng — with specialist partners where needed."
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
                and greater Gauteng — helping local businesses get found and
                present themselves professionally online.
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

      {/* How we work */}
      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <h2 className="mb-12 font-display text-3xl font-black text-ink lg:text-4xl">
            How Mogen works
          </h2>
          <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-2 lg:grid-cols-4">
            {APPROACH.map((a) => (
              <div key={a.title} className="bg-bone p-8">
                <h3 className="font-display text-xl font-black text-ink">
                  {a.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">
                  {a.desc}
                </p>
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
