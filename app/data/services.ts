import { Code2, Megaphone, Palette, Search, Smartphone } from "lucide-react";

export const SERVICES = [
  {
    slug: "web-development",
    name: "Web Development",
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
        n: "01",
        t: "Discovery",
        d: "We map your goals, audience and competitors to define the right site structure.",
      },
      {
        n: "02",
        t: "Design",
        d: "Blueprint wireframes and a high-converting visual system tailored to your brand.",
      },
      {
        n: "03",
        t: "Build",
        d: "Pixel-perfect, fast, responsive development with clean semantic code.",
      },
      {
        n: "04",
        t: "Launch",
        d: "SEO setup, cross-device testing, analytics and a smooth go-live.",
      },
    ],
    pricing: [
      {
        name: "Starter",
        price: "R4,900",
        cadence: "once-off",
        features: [
          "3-page custom website",
          "Mobile-first responsive",
          "Basic on-page SEO",
          "WhatsApp / contact form",
          "1 round of revisions",
          "2-week delivery",
        ],
      },
      {
        name: "Business",
        price: "R12,900",
        cadence: "once-off",
        featured: true,
        features: [
          "Up to 8 pages",
          "Custom design system",
          "Advanced on-page SEO",
          "Blog setup",
          "Lead capture + analytics",
          "3 rounds of revisions",
        ],
      },
      {
        name: "Premium",
        price: "R24,900",
        cadence: "once-off",
        features: [
          "Unlimited pages",
          "E-commerce / booking",
          "Schema & structured data",
          "A/B test ready",
          "Priority support",
          "Dedicated project lead",
        ],
      },
    ],
    addons: [
      {
        name: "Extra page",
        price: "R650",
        desc: "Additional bespoke page beyond your package.",
      },
      {
        name: "Blog setup",
        price: "R1,500",
        desc: "Blog with categories, tags and RSS feed.",
      },
      {
        name: "E-commerce add-on",
        price: "R6,500",
        desc: "Up to 50 products, cart and checkout.",
      },
      {
        name: "Copywriting",
        price: "R450 / page",
        desc: "SEO-optimised copy written for you.",
      },
    ],
    faq: [
      {
        q: "How long does a website take to build?",
        a: "A Starter site typically launches in 2 weeks, Business in 3–4 weeks, and Premium depends on scope. We confirm a timeline after the discovery call.",
      },
      {
        q: "Is SEO included?",
        a: "Every site ships with on-page SEO foundations and Google Search Console setup. For ongoing ranking work, see our SEO Services.",
      },
      {
        q: "Will my site work on mobile?",
        a: "Yes — every build is mobile-first and tested across devices, with Core Web Vitals optimised for speed.",
      },
      {
        q: "Do you offer hosting?",
        a: "We can set up and manage hosting or hand off to your provider. Ask about our monthly care plans.",
      },
      {
        q: "Can I edit the site myself?",
        a: "Yes — Business and Premium builds include a CMS and a training session so you can edit content.",
      },
    ],
  },
  {
    slug: "mobile-development",
    name: "Mobile Development",
    icon: Smartphone,
    tagline: "Native-feeling mobile apps that engage customers on any device.",
    intro:
      "Custom mobile apps built to feel native on iOS and Android — fast, secure and designed to keep users coming back. From MVP to enterprise, we ship apps that earn their place on the home screen.",
    deliverables: [
      "iOS & Android build",
      "Native-feeling UX",
      "API & backend integration",
      "Push notifications",
      "App store submission",
      "Analytics & crash reporting",
    ],
    process: [
      {
        n: "01",
        t: "Strategy",
        d: "We define the MVP scope, user flows and the technical architecture.",
      },
      {
        n: "02",
        t: "UX & UI",
        d: "Wireframes and a polished, native-feeling interface design.",
      },
      {
        n: "03",
        t: "Develop",
        d: "Cross-platform build with API integration and quality assurance.",
      },
      {
        n: "04",
        t: "Ship",
        d: "App store submission, analytics and a launch plan.",
      },
    ],
    pricing: [
      {
        name: "MVP",
        price: "R35,000",
        cadence: "once-off",
        features: [
          "Up to 6 screens",
          "iOS or Android",
          "Core features",
          "Basic backend",
          "1 round of revisions",
          "6–8 week delivery",
        ],
      },
      {
        name: "Growth",
        price: "R75,000",
        cadence: "once-off",
        featured: true,
        features: [
          "Up to 15 screens",
          "iOS & Android",
          "API integration",
          "Push notifications",
          "3 rounds of revisions",
          "8–12 week delivery",
        ],
      },
      {
        name: "Enterprise",
        price: "Custom",
        cadence: "quote",
        features: [
          "Unlimited screens",
          "Cross-platform",
          "Custom backend",
          "Advanced analytics",
          "Ongoing support",
          "Dedicated team",
        ],
      },
    ],
    addons: [
      {
        name: "Extra screen",
        price: "R4,500",
        desc: "Additional app screen beyond your package.",
      },
      {
        name: "Push notifications",
        price: "R3,500",
        desc: "Segmented push campaign setup.",
      },
      {
        name: "Backend & API",
        price: "from R12,000",
        desc: "Custom backend, database and API.",
      },
      {
        name: "Store management",
        price: "R1,500 / mo",
        desc: "Ongoing store updates and compliance.",
      },
    ],
    faq: [
      {
        q: "Do you build for both iOS and Android?",
        a: "Yes. The Growth and Enterprise packages ship to both stores; the MVP can target one platform first.",
      },
      {
        q: "How long does an app take?",
        a: "An MVP launches in 6–8 weeks, Growth in 8–12 weeks. Enterprise timelines are scoped during strategy.",
      },
      {
        q: "Do you handle app store submission?",
        a: "Yes — we manage the submission process and guide you through store listings and compliance.",
      },
      {
        q: "Can you integrate with my existing systems?",
        a: "Absolutely. We integrate with CRMs, payment gateways, databases and third-party APIs.",
      },
      {
        q: "Do you offer post-launch support?",
        a: "Yes — ongoing maintenance and store management are available as add-ons or care plans.",
      },
    ],
  },
  {
    slug: "brand-identity",
    name: "Brand Identity",
    icon: Palette,
    tagline:
      "Logos, colours and visual systems that make your business unforgettable.",
    intro:
      "We craft distinctive brand identities — logos, colour systems and guidelines — that make your business stand out from the competition and stay consistent everywhere you show up.",
    deliverables: [
      "Logo & marks",
      "Colour system",
      "Typography",
      "Brand guidelines",
      "Social templates",
      "Business card design",
    ],
    process: [
      {
        n: "01",
        t: "Brief",
        d: "We explore your story, audience and market position.",
      },
      {
        n: "02",
        t: "Concepts",
        d: "Multiple logo and identity directions to choose from.",
      },
      {
        n: "03",
        t: "Refine",
        d: "We refine the chosen direction into a complete system.",
      },
      {
        n: "04",
        t: "Deliver",
        d: "Full file set, guidelines and ready-to-use templates.",
      },
    ],
    pricing: [
      {
        name: "Essential",
        price: "R2,900",
        cadence: "once-off",
        features: [
          "1 logo concept",
          "2 revisions",
          "Colour palette",
          "Basic file set",
          "3–5 day delivery",
        ],
      },
      {
        name: "Complete",
        price: "R6,500",
        cadence: "once-off",
        featured: true,
        features: [
          "3 logo concepts",
          "Unlimited revisions",
          "Full colour system",
          "Typography & guidelines",
          "Social media templates",
          "1 week delivery",
        ],
      },
      {
        name: "Brand System",
        price: "R14,900",
        cadence: "once-off",
        features: [
          "Strategic brand workshop",
          "Full identity system",
          "Brand guidelines book",
          "Stationery & social kit",
          "Brand voice & messaging",
          "2 week delivery",
        ],
      },
    ],
    addons: [
      {
        name: "Business cards",
        price: "R650",
        desc: "Print-ready business card design.",
      },
      {
        name: "Social media kit",
        price: "R1,200",
        desc: "Branded templates for posts and stories.",
      },
      {
        name: "Brand guidelines PDF",
        price: "R1,500",
        desc: "Standalone guidelines document.",
      },
      {
        name: "Extra logo concept",
        price: "R900",
        desc: "Additional logo direction to explore.",
      },
    ],
    faq: [
      {
        q: "How many logo concepts do I get?",
        a: "Essential includes 1 concept, Complete includes 3, and Brand System includes a full workshop with multiple directions.",
      },
      {
        q: "What files do I receive?",
        a: "You get all formats — vector (SVG, EPS, PDF) and raster (PNG, JPG) in full colour, black and white, and reversed versions.",
      },
      {
        q: "Do you include brand guidelines?",
        a: "Complete and Brand System packages include guidelines. A standalone PDF is available as an add-on.",
      },
      {
        q: "Can you redesign my existing logo?",
        a: "Yes — we can refresh an existing identity or start from scratch.",
      },
      {
        q: "Do you design print materials?",
        a: "Yes — business cards, stationery and print collateral are available as add-ons.",
      },
    ],
  },
  {
    slug: "digital-marketing",
    name: "Digital Marketing",
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
        n: "01",
        t: "Audit",
        d: "We review your channels, audience and competitors.",
      },
      {
        n: "02",
        t: "Plan",
        d: "A content and campaign calendar aligned to your goals.",
      },
      {
        n: "03",
        t: "Execute",
        d: "We create, schedule and run campaigns across platforms.",
      },
      {
        n: "04",
        t: "Optimise",
        d: "Monthly reporting and continuous improvement.",
      },
    ],
    pricing: [
      {
        name: "Starter",
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
        desc: "Add another social platform to your plan.",
      },
      {
        name: "Influencer outreach",
        price: "R3,500",
        desc: "Identify and brief local influencers.",
      },
      {
        name: "Landing page",
        price: "R2,900",
        desc: "Conversion-focused landing page for a campaign.",
      },
      {
        name: "Extra ad spend mgmt",
        price: "15% of spend",
        desc: "Management fee for additional ad budget.",
      },
    ],
    faq: [
      {
        q: "Which platforms do you manage?",
        a: "Facebook, Instagram, X, LinkedIn, TikTok and Google. We recommend the channels where your customers actually are.",
      },
      {
        q: "Is ad spend included?",
        a: "Packages cover management. Ad budget is separate and we advise on the right spend for your goals.",
      },
      {
        q: "Do you create the content?",
        a: "Yes — we handle design, copy and scheduling. You approve everything before it goes live.",
      },
      {
        q: "Is there a minimum contract?",
        a: "We work month-to-month after an initial 3-month setup period, so campaigns have time to compound.",
      },
      {
        q: "How do you report?",
        a: "A clear monthly report covering reach, engagement, leads and cost-per-result — no vanity metrics.",
      },
    ],
  },
  {
    slug: "seo-services",
    name: "SEO Services",
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
        n: "01",
        t: "Audit",
        d: "We run the 37-step technical and content audit across your site.",
      },
      {
        n: "02",
        t: "Prioritise",
        d: "Issues are banded into Critical, Reactive, Strategic and Deferred.",
      },
      {
        n: "03",
        t: "Remedy",
        d: "We fix, optimise and build — starting with the highest-impact band.",
      },
      {
        n: "04",
        t: "Compound",
        d: "Ongoing content, links and reporting that grow rankings over time.",
      },
    ],
    pricing: [
      {
        name: "Ignition",
        price: "R8,500",
        cadence: "/ month",
        features: [
          "Core 15 of 37 steps",
          "Q1 Critical band",
          "Q2 Reactive band",
          "Local grid mapping (Pretoria)",
          "Core Web Vitals remediation",
          "Single-persona reporting",
        ],
      },
      {
        name: "Scale",
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
        desc: "Add another location to your local SEO.",
      },
      {
        name: "Landing page",
        price: "R2,900",
        desc: "SEO-optimised landing page per service area.",
      },
      {
        name: "Content writing",
        price: "R650 / article",
        desc: "SEO content written and optimised.",
      },
      {
        name: "Backlink audit",
        price: "R3,500",
        desc: "Toxic link remediation and disavow.",
      },
    ],
    faq: [
      {
        q: "How long until I see results?",
        a: "Technical fixes can lift rankings within weeks; compounding content and authority work typically shows clear movement in 3–6 months.",
      },
      {
        q: "Do you guarantee #1 rankings?",
        a: "No reputable SEO guarantees #1 — Google's algorithm changes. We guarantee a rigorous process, transparent reporting and measurable progress.",
      },
      {
        q: "Is this for local or national SEO?",
        a: "Both. Ignition focuses on local Pretoria visibility; Scale and Dominance expand to national and multi-location.",
      },
      {
        q: "What's the 37-step framework?",
        a: "Our proprietary process covering crawl, indexation, content, links, technical, local and reporting — explore it on seo.mogen.co.za.",
      },
      {
        q: "Do you write the content?",
        a: "Yes — SEO content writing is included in Scale and Dominance, and available as an add-on for Ignition.",
      },
    ],
  },
];

export const getService = (slug: string) =>
  SERVICES.find((s) => s.slug === slug);
