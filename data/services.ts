import {
  Code2,
  FileText,
  type LucideProps,
  Megaphone,
  Search,
} from "lucide-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

interface Process {
  position: string;
  title: string;
  description: string;
}

interface Pricing {
  name: string;
  /** Package identifier from the central registry (`data/packages.ts`). */
  packageId: string;
  price: string;
  cadence: string;
  featured?: boolean;
  features: string[];
}

interface AddOn {
  name: string;
  price: string;
  description: string;
}

interface Faq {
  question: string;
  answer: string;
}

interface Service {
  slug: string;
  name: string;
  action: string;
  icon: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
  tagline: string;
  intro: string;
  deliverables?: string[];
  process?: Process[];
  pricing?: Pricing[];
  addons?: AddOn[];
  faq?: Faq[];
}

export const SERVICES: Service[] = [
  {
    slug: "web-development",
    name: "Web Development",
    action: "build",
    icon: Code2,
    tagline: "Custom websites engineered to convert visitors into customers.",
    intro:
      "We design and build fast, secure, responsive websites that work flawlessly on every device — structured for Google, optimised for speed, and built to turn visitors into real enquiries.",
    deliverables: [
      "Custom responsive design",
      "Mobile-first build",
      "On-page SEO foundation",
      "Core Web Vitals optimised",
      "Lead capture & WhatsApp integration",
      "Analytics & Search Console setup",
    ],
    process: [
      {
        position: "01",
        title: "Discovery",
        description:
          "We map your goals, audience and competitors to define the right site structure.",
      },
      {
        position: "02",
        title: "Design",
        description:
          "Blueprint wireframes and a high-converting visual system tailored to your brand.",
      },
      {
        position: "03",
        title: "Build",
        description:
          "Pixel-perfect, fast, responsive development with clean semantic code.",
      },
      {
        position: "04",
        title: "Launch",
        description:
          "SEO setup, cross-device testing, analytics and a smooth go-live.",
      },
    ],
    pricing: [
      {
        name: "Seed",
        packageId: "seed",
        price: "R199",
        cadence: "once-off",
        features: [
          "Starter website structure tailored to your business",
          "Mobile-first, fast and structured for discovery",
          "Contact / enquiry path set up",
          "Clear next steps for SEO and growth",
        ],
      },
      {
        name: "Sprout",
        packageId: "sprout",
        price: "R399",
        cadence: "/ month",
        featured: true,
        features: [
          "R1,200 once-off setup fee",
          "Professionally designed starter website",
          "Hosting, maintenance and ongoing support",
          "Up to 5 email accounts",
          "Launch-ready structure for SEO and growth",
        ],
      },
      {
        name: "Vegetative",
        packageId: "vegetative",
        price: "R1,500",
        cadence: "/ month",
        features: [
          "R2,000 once-off setup fee",
          "Unlimited pages",
          "E-commerce / booking",
          "Schema & structured data",
          "A/B test ready",
          "Priority support",
          "Dedicated project lead",
          "Hosting, maintenance and ongoing support",
          "Up to 5 email accounts",
        ],
      },
    ],
    addons: [
      {
        name: "Extra page",
        price: "R650",
        description:
          "Additional bespoke page beyond your package. Once-off cost — not a monthly charge.",
      },
      {
        name: "Blog setup",
        price: "R1,500",
        description: "Blog with categories, tags and RSS feed.",
      },
      {
        name: "E-commerce add-on",
        price: "R6,500",
        description: "Up to 50 products, cart and checkout.",
      },
      {
        name: "Copywriting",
        price: "R450 / page",
        description: "SEO-optimised copy written for you.",
      },
    ],
    faq: [
      {
        question: "How long does a website take to build?",
        answer:
          "A Seed site typically launches in 2 weeks, Sprout in 3–4 weeks, and Vegetative depends on scope. We confirm a timeline after the discovery call.",
      },
      {
        question: "Is SEO included?",
        answer:
          "Every site ships with on-page SEO foundations and Google Search Console setup. For ongoing ranking work, see our SEO service.",
      },
      {
        question: "Will my site work on mobile?",
        answer:
          "Yes — every build is mobile-first and tested across devices, with Core Web Vitals optimised for speed.",
      },
      {
        question: "Do you offer hosting?",
        answer:
          "We can set up and manage hosting or hand off to your provider. Ask about our monthly care plans.",
      },
      {
        question: "Can I edit the site myself?",
        answer:
          "Yes — Sprout and Vegetative builds include a CMS and a training session so you can edit content.",
      },
    ],
  },
  {
    slug: "seo",
    name: "SEO",
    action: "rank",
    icon: Search,
    tagline:
      "Local SEO that gets you found on Google — and brings real enquiries from nearby customers.",
    intro:
      "We run Mogen's proprietary 37-step, 4-band SEO framework — scoring every issue for importance and urgency, then sequencing the remedy. The result: more local visibility, more enquiries, and rankings that compound.",
    deliverables: [
      "Local SEO & grid mapping",
      "Google Business Profile optimisation",
      "On-page & technical SEO",
      "Core Web Vitals remediation",
      "Content & link building",
      "Triple-lens reporting",
    ],
    process: [
      {
        position: "01",
        title: "Audit",
        description:
          "We run the 37-step technical and content audit across your site.",
      },
      {
        position: "02",
        title: "Prioritise",
        description:
          "Issues are banded into Critical, Reactive, Strategic and Deferred.",
      },
      {
        position: "03",
        title: "Remedy",
        description:
          "We fix, optimise and build — starting with the highest-impact band.",
      },
      {
        position: "04",
        title: "Compound",
        description:
          "Ongoing content, links and reporting that grow rankings over time.",
      },
    ],
    pricing: [
      {
        name: "Ignition",
        packageId: "ignition",
        price: "R8,500",
        cadence: "/ month",
        features: [
          "Core 17 of 37 steps",
          "Q1 Critical band",
          "Q2 Reactive band",
          "Local grid mapping (Pretoria)",
          "Core Web Vitals remediation",
          "Single-persona reporting",
        ],
      },
      {
        name: "Scale",
        packageId: "scale",
        price: "R16,500",
        cadence: "/ month",
        featured: true,
        features: [
          "All 37 steps across 4 bands",
          "Triple-persona reporting",
          "Q3 Strategic band",
          "Schema & structured data",
          "Competitor backlink work",
          "Bi-weekly strategy review",
        ],
      },
      {
        name: "Dominance",
        packageId: "dominance",
        price: "R32,000",
        cadence: "/ month",
        features: [
          "Aggressive remedy",
          "Executive briefs",
          "Backlink infiltration",
          "Multi-location SEO",
          "Dedicated strategist",
          "Weekly reporting",
        ],
      },
    ],
    addons: [
      {
        name: "Extra location",
        price: "R2,500 / mo",
        description: "Add another location to your local SEO.",
      },
      {
        name: "Landing page",
        price: "R2,900",
        description: "SEO-optimised landing page per service area.",
      },
      {
        name: "Content writing",
        price: "R650 / article",
        description: "SEO content written and optimised.",
      },
      {
        name: "Backlink audit",
        price: "R3,500",
        description: "Toxic link remediation and disavow.",
      },
    ],
    faq: [
      {
        question: "How long until I see results?",
        answer:
          "Technical fixes can lift rankings within weeks; compounding content and authority work typically shows clear movement in 3–6 months.",
      },
      {
        question: "Do you guarantee #1 rankings?",
        answer:
          "No reputable SEO guarantees #1 — Google's algorithm changes. We guarantee a rigorous process, transparent reporting and measurable progress.",
      },
      {
        question: "Is this for local or national SEO?",
        answer:
          "Both. Ignition focuses on local Pretoria visibility; Scale and Dominance expand to national and multi-location.",
      },
      {
        question: "What's the 37-step framework?",
        answer:
          "Our proprietary process covering crawl, indexation, content, links, technical, local and reporting — explore it on seo.mogen.co.za.",
      },
      {
        question: "Do you write the content?",
        answer:
          "Yes — SEO content writing is included in Scale and Dominance, and available as an add-on for Ignition.",
      },
    ],
  },
  {
    slug: "digital-marketing",
    name: "Digital Marketing",
    action: "manage",
    icon: Megaphone,
    tagline:
      "Get found online with content and campaigns that bring in new customers.",
    intro:
      "We run content, social and paid campaigns that put your business in front of the right people — and nurture them into enquiries. Transparent reporting, no vanity metrics.",
    deliverables: [
      "Content strategy",
      "Social media management",
      "Paid ad campaigns",
      "Email marketing",
      "Lead nurture",
      "Monthly reporting",
    ],
    process: [
      {
        position: "01",
        title: "Audit",
        description: "We review your channels, audience and competitors.",
      },
      {
        position: "02",
        title: "Plan",
        description: "A content and campaign calendar aligned to your goals.",
      },
      {
        position: "03",
        title: "Execute",
        description: "We create, schedule and run campaigns across platforms.",
      },
      {
        position: "04",
        title: "Optimise",
        description: "Monthly reporting and continuous improvement.",
      },
    ],
    pricing: [
      {
        name: "Starter",
        packageId: "starter",
        price: "R3,500",
        cadence: "/ month",
        features: [
          "2 social posts / week",
          "1 platform",
          "Monthly report",
          "Basic content plan",
          "Community management",
        ],
      },
      {
        name: "Growth",
        packageId: "growth",
        price: "R7,500",
        cadence: "/ month",
        featured: true,
        features: [
          "4 posts / week",
          "2 platforms",
          "Paid ad management",
          "1 email campaign",
          "Monthly report",
          "Strategy review",
        ],
      },
      {
        name: "Dominate",
        packageId: "dominate",
        price: "R15,000",
        cadence: "/ month",
        features: [
          "Daily posting",
          "3+ platforms",
          "Full paid ad management",
          "Content & email automation",
          "Bi-weekly strategy",
          "Dedicated manager",
        ],
      },
    ],
    addons: [
      {
        name: "Extra platform",
        price: "R1,500 / mo",
        description: "Add another social platform to your plan.",
      },
      {
        name: "Influencer outreach",
        price: "R3,500",
        description: "Identify and brief local influencers.",
      },
      {
        name: "Landing page",
        price: "R2,900",
        description: "Conversion-focused landing page for a campaign.",
      },
      {
        name: "Extra ad spend mgmt",
        price: "15% of spend",
        description: "Management fee for additional ad budget.",
      },
    ],
    faq: [
      {
        question: "Which platforms do you manage?",
        answer:
          "Facebook, Instagram, X, LinkedIn, TikTok and Google. We recommend the channels where your customers actually are.",
      },
      {
        question: "Is ad spend included?",
        answer:
          "Packages cover management. Ad budget is separate and we advise on the right spend for your goals.",
      },
      {
        question: "Do you create the content?",
        answer:
          "Yes — we handle design, copy and scheduling. You approve everything before it goes live.",
      },
      {
        question: "Is there a minimum contract?",
        answer:
          "We work month-to-month after an initial 3-month setup period, so campaigns have time to compound.",
      },
      {
        question: "How do you report?",
        answer:
          "A clear monthly report covering reach, engagement, leads and cost-per-result — no vanity metrics.",
      },
    ],
  },
  {
    slug: "business-documentation",
    name: "Business Documentation",
    action: "prepare",
    icon: FileText,
    tagline:
      "Professional business documents — policies, procedures, forms and templates that keep your operations clear and consistent.",
    intro:
      "We create professional business documentation — policies, procedures, forms and templates structured for clarity and consistency. Clean formatting, logical structure, and documents your team can actually use. Where specialist design is needed, we coordinate with trusted external providers.",
    deliverables: [
      "Policies & procedures",
      "Forms & templates",
      "Professional formatting",
      "Document structure",
      "Version-ready files",
      "Print & digital delivery",
    ],
    process: [
      {
        position: "01",
        title: "Brief",
        description:
          "We gather your requirements, existing documents and how the documents will be used.",
      },
      {
        position: "02",
        title: "Structure",
        description:
          "We define the document structure, sections and formatting approach.",
      },
      {
        position: "03",
        title: "Draft",
        description:
          "We draft the content with clear language and consistent formatting.",
      },
      {
        position: "04",
        title: "Deliver",
        description:
          "Final documents delivered as print-ready and editable files with a usage guide.",
      },
    ],
    pricing: [
      {
        name: "Essential",
        packageId: "essential",
        price: "R1,900",
        cadence: "once-off",
        features: [
          "Single document (up to 10 pages)",
          "Professional formatting",
          "2 revisions",
          "Print-ready PDF",
          "Editable source file",
          "3–5 day delivery",
        ],
      },
      {
        name: "Standard",
        packageId: "standard",
        price: "R4,500",
        cadence: "once-off",
        featured: true,
        features: [
          "Up to 3 documents",
          "Policies / procedures / forms",
          "Consistent document system",
          "Professional formatting",
          "Unlimited revisions",
          "1 week delivery",
        ],
      },
      {
        name: "Complete",
        packageId: "complete",
        price: "From R4,900",
        cadence: "once-off",
        features: [
          "Document pack (from 4 documents)",
          "Full template system",
          "Version control setup",
          "Team usage guide",
          "Professional formatting",
          "2 week delivery",
        ],
      },
    ],
    addons: [
      {
        name: "Additional document",
        price: "R750",
        description: "Extra document with consistent formatting.",
      },
      {
        name: "Template conversion",
        price: "R650",
        description: "Convert existing document to professional template.",
      },
      {
        name: "Procedure manual",
        price: "R2,500",
        description:
          "Detailed procedure manual with steps and responsibilities.",
      },
      {
        name: "Form design",
        price: "R550",
        description: "Professional form with logical fields and branding.",
      },
    ],
    faq: [
      {
        question: "What types of documents do you create?",
        answer:
          "Policies, procedures, forms, templates, manuals and related business documents — structured for clarity and consistency.",
      },
      {
        question: "Do you handle specialist logo or graphic design?",
        answer:
          "Business Documentation focuses on structured documents. Where specialist brand or graphic design is needed, we coordinate with trusted external providers.",
      },
      {
        question: "What files do I receive?",
        answer:
          "You receive a print-ready PDF and an editable source file, formatted consistently across your document set.",
      },
      {
        question: "Can you work from my existing documents?",
        answer:
          "Yes — we can refine and reformat existing documents into a consistent, professional system.",
      },
      {
        question: "Do you include printing?",
        answer:
          "We deliver print-ready files. Printing can be arranged via a partner provider if required.",
      },
    ],
  },
];

export const getService = (slug: string) =>
  SERVICES.find((s) => s.slug === slug);

export type { AddOn, Faq, Pricing, Process, Service };
