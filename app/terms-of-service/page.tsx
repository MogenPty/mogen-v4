import BlueprintGrid from "@/components/mogen/blueprint-grid";
import PageShell from "@/components/mogen/page-shell";

const SECTIONS = [
  {
    h: "1. Introduction",
    p: 'These Terms of Service ("Terms") govern your use of the growth, design and SEO services provided by Mogen ("we", "us"). By engaging our services or using our website, you agree to these Terms.',
  },
  {
    h: "2. Our services",
    p: 'Mogen provides website design and development, brand identity, search engine optimisation, digital marketing and related growth services. The specific scope, deliverables and pricing for any engagement are set out in a separate proposal or agreement agreed between us and you (the "Client").',
  },
  {
    h: "3. Engagements and fees",
    p: "Fees, payment schedules and project timelines are defined in your proposal. Unless otherwise stated, invoices are payable within seven days of issue. Late payments may result in the suspension of work. Quotes are valid for 30 days from the date of issue.",
  },
  {
    h: "4. Client responsibilities",
    p: "You agree to provide timely access to accounts, assets and information required to deliver the services, to respond to requests promptly, and to ensure all content and materials you supply do not infringe the rights of any third party.",
  },
  {
    h: "5. Intellectual property",
    p: "On receipt of full payment, ownership of final deliverables (such as website code, designs and brand assets) transfers to the Client, except for third-party components, fonts and stock media licensed separately. We retain the right to display completed work in our portfolio and marketing materials unless agreed otherwise in writing.",
  },
  {
    h: "6. Confidentiality",
    p: "Both parties agree to keep confidential any non-public information shared during an engagement, and to use it only for the purposes of the project. This obligation survives the end of the engagement.",
  },
  {
    h: "7. Warranties and disclaimers",
    p: "We warrant that our services will be performed with reasonable skill and care. SEO and marketing outcomes depend on many factors outside our control, including search engine algorithms and market conditions, so we do not guarantee specific rankings, traffic levels or business results.",
  },
  {
    h: "8. Limitation of liability",
    p: "To the fullest extent permitted by law, our total liability for any claim arising from our services is limited to the fees paid by the Client for the relevant engagement. We are not liable for indirect, incidental or consequential losses.",
  },
  {
    h: "9. Termination",
    p: "Either party may terminate an engagement with written notice if the other party materially breaches these Terms and fails to remedy the breach within 14 days. Fees for work completed up to the date of termination remain payable.",
  },
  {
    h: "10. Governing law",
    p: "These Terms are governed by the laws of the Republic of South Africa. Any disputes will be subject to the exclusive jurisdiction of the South African courts, unless we agree otherwise in writing.",
  },
  {
    h: "11. Contact",
    p: "Questions about these Terms can be sent to hello@mogen.co.za.",
  },
];

export default function TermsOfService() {
  return (
    <PageShell
      index="// 12 — Legal"
      label="Terms of Service"
      title={
        <>
          The terms of <span className="text-catalyst">growing together.</span>
        </>
      }
      intro="The agreements that govern clients using Mogen's agency growth services."
    >
      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-[760px] px-6 lg:px-10">
          <p className="small-caps text-ink/50">
            Last updated: 1 September 2026
          </p>
          <div className="mt-8 space-y-8">
            {SECTIONS.map((s) => (
              <section key={s.h}>
                <h2 className="font-display text-xl font-black text-ink">
                  {s.h}
                </h2>
                <p className="mt-3 leading-relaxed text-ink/70">{s.p}</p>
              </section>
            ))}
          </div>
        </div>
      </BlueprintGrid>
    </PageShell>
  );
}
