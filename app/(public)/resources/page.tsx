import type { Metadata } from "next";
import ResourcesBlock from "@/components/mogen/resources-block";
import { pageMetadata } from "@/lib/seo";
import { STATIC_META } from "@/lib/seo/metadata-registry";

export const metadata: Metadata = pageMetadata({
  path: "/resources",
  title: STATIC_META["/resources"].title,
  description: STATIC_META["/resources"].description,
});

export default function Resources() {
  return <ResourcesBlock numbering={16} />;
}
