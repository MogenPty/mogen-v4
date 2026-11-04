CREATE TABLE IF NOT EXISTS "web_packages" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "stage" integer NOT NULL,
  "summary" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "website_included" boolean NOT NULL DEFAULT true,
  "max_pages" integer,
  "features" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "seo_scope" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "exclusions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "status" text NOT NULL DEFAULT 'draft',
  "pricing_label" text NOT NULL DEFAULT 'Request a quote',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "web_packages_status_check" CHECK ("status" IN ('draft', 'published', 'retired')),
  CONSTRAINT "web_packages_stage_check" CHECK ("stage" BETWEEN 1 AND 7)
);
CREATE UNIQUE INDEX IF NOT EXISTS "web_packages_stage_unique" ON "web_packages" ("stage");

CREATE TABLE IF NOT EXISTS "web_location_offers" (
  "location_slug" text PRIMARY KEY NOT NULL,
  "featured_package_id" text NOT NULL REFERENCES "web_packages"("id"),
  "slots" jsonb NOT NULL,
  "seed_callout" text NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "web_location_offers_slug_check" CHECK ("location_slug" IN ('maboloka', 'soshanguve', 'centurion'))
);

INSERT INTO "web_packages" ("id","name","stage","summary","description","website_included","max_pages","features","seo_scope","exclusions","status","pricing_label") VALUES
('seed','Seed',1,'Google Business Profile and WhatsApp setup','Assisted online presence for eligible businesses without a website',false,NULL,'["GBP eligibility review","WhatsApp Business setup assistance","Account handover"]','["Profile completeness review"]','["Website","Guaranteed approval or ranking"]','draft','Request a quote'),
('sprout','Sprout',2,'Your first professional website','Single-page responsive business website',true,1,'["Up to five page sections","Contact CTA","Mobile-responsive design"]','["Basic indexability","Page metadata"]','["Custom CMS","E-commerce"]','draft','Request a quote'),
('seedling','Seedling',3,'Professional small-business website','Multi-page brochure website',true,5,'["Up to five pages","Basic contact form","Responsive design"]','["Page metadata","Internal linking","Search Console setup guidance"]','["Custom workflows","Booking engine"]','draft','Request a quote'),
('vegetative','Vegetative',4,'Website for growing businesses','Content-managed and conversion-ready website',true,10,'["Up to ten pages","Scoped CMS","Enquiry flows"]','["Core keyword-to-page map","On-page SEO foundations","Basic lead events"]','["Bespoke portal","Complex integrations"]','draft','Request a quote'),
('budding','Budding',5,'Conversion-focused growth website','Structured landing pages with one scoped integration',true,15,'["Up to fifteen pages","Conversion-focused landing pages","One scoped integration"]','["Priority SERP research","Landing-page optimisation","Conversion tracking setup"]','["Complex custom application"]','draft','Request a quote'),
('flowering','Flowering',6,'Advanced business website','Content platform with one scoped advanced feature',true,25,'["Up to twenty-five pages","CMS","Scoped commerce, booking or workflow foundation"]','["Expanded keyword mapping","Technical SEO setup","Measurement plan"]','["Third-party fees","Unlimited integrations"]','draft','Request a quote'),
('ripening','Ripening',7,'Tailored digital platform','Phased complex platform defined by discovery',true,NULL,'["Custom workflows","Scoped integrations","Phased delivery"]','["SEO architecture and measurement planning where relevant"]','["Unlimited scope without contract"]','draft','Custom quotation')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "web_location_offers" ("location_slug","featured_package_id","slots","seed_callout") VALUES
('maboloka','sprout','[{"kind":"package","packageId":"sprout"},{"kind":"package","packageId":"seedling"},{"kind":"package","packageId":"vegetative"},{"kind":"explore","direction":"larger"}]','Not ready for a website? Ask about Google Business Profile and WhatsApp setup.'),
('soshanguve','vegetative','[{"kind":"explore","direction":"smaller"},{"kind":"package","packageId":"vegetative"},{"kind":"package","packageId":"budding"},{"kind":"explore","direction":"larger"}]','Not ready for a website? Ask about Google Business Profile and WhatsApp setup.'),
('centurion','flowering','[{"kind":"explore","direction":"smaller"},{"kind":"package","packageId":"budding"},{"kind":"package","packageId":"flowering"},{"kind":"package","packageId":"ripening"}]','Not ready for a website? Ask about Google Business Profile and WhatsApp setup.')
ON CONFLICT ("location_slug") DO NOTHING;
