import type { Metadata } from "next";
import BlogBlock from "@/components/mogen/blog-block";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/blog",
  title: "Blog",
  description:
    "Industry articles and practical growth advice for South African businesses — local SEO, websites, Google Business Profile and conversion.",
});

export default function Blog() {
  return <BlogBlock numbering={9} />;
}
