import BlueprintGrid from "@/components/mogen/blueprint-grid";
import PageShell from "@/components/mogen/page-shell";

const SECTIONS = [
  {
    h: "1. Who we are",
    p: 'Mogen ("we", "us") is a digital growth agency based in Pretoria, Gauteng, South Africa. This Privacy Policy explains how we collect, use and protect your personal information when you use our website, complete our lead generation forms, or run our Growth Audit.',
  },
  {
    h: "2. Information we collect",
    p: "When you submit a form (contact, quote request, Growth Audit, resource download or newsletter) we collect the details you provide: your name, email address, phone number, business name, website URL, and any message you include. We also collect your Growth Audit score and the service you're interested in. We may collect limited technical data such as browser type and pages visited through standard analytics tools.",
  },
  {
    h: "3. How we use your information",
    p: "We use your information to respond to your enquiry, send you audit results and proposals, provide the services you request, and improve our website and offerings. With your consent we may send you relevant marketing communications; you can unsubscribe at any time using the link in any email or by contacting us.",
  },
  {
    h: "4. Sharing your information",
    p: "We do not sell your personal information. We share it only with trusted service providers who help us operate (such as hosting, email delivery and analytics providers) under contractual obligations of confidentiality, or where required by law.",
  },
  {
    h: "5. Data security",
    p: "We take reasonable technical and organisational measures to protect your personal information against unauthorised access, loss or misuse. No method of transmission over the internet is completely secure, but we work to protect your data in line with South Africa's Protection of Personal Information Act (POPIA).",
  },
  {
    h: "6. Data retention",
    p: "We keep your personal information only for as long as necessary to provide our services and to meet legal or accounting requirements. You may ask us to delete your data at any time, subject to lawful retention obligations.",
  },
  {
    h: "7. Your rights",
    p: "Under POPIA you have the right to access, correct or delete your personal information, and to object to certain processing. To exercise these rights, contact us at hello@mogen.co.za.",
  },
  {
    h: "8. Cookies",
    p: "Our website uses cookies and similar technologies to operate and to understand how visitors use the site. You can control cookies through your browser settings. Disabling some cookies may affect site functionality.",
  },
  {
    h: "9. Changes to this policy",
    p: "We may update this Privacy Policy from time to time. We will post any changes on this page with a revised effective date.",
  },
  {
    h: "10. Contact us",
    p: "If you have any questions about this Privacy Policy or how we handle your data, email hello@mogen.co.za.",
  },
];

export default function PrivacyPolicy() {
  return (
    <PageShell
      index="// 12 — Legal"
      label="Privacy Policy"
      title={
        <>
          Your data, <span className="text-catalyst">handled with care.</span>
        </>
      }
      intro="How Mogen collects, uses and protects the personal information you share through our forms and Growth Audit."
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
