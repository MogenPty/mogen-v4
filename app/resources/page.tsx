import type { Metadata } from "next";
import ResourcesBlock from "@/components/mogen/resources-block";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/resources",
  title: "Resources",
  description:
    "Free playbooks, checklists and templates for South African businesses — local SEO, landing pages, growth audits and Google Business Profile.",
});

export default function Resources() {
  return <ResourcesBlock numbering={16} />;
}
