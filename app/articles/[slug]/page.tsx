import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostBlock from "@/components/mogen/blog-post-block";
import { getPost, POSTS } from "@/data/blog";
import { siteConfig } from "@/data/site";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Article not found" };
  const canonical = `${siteConfig.url}/articles/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      siteName: siteConfig.name,
      title: post.title,
      description: post.excerpt,
      images: [
        {
          url: siteConfig.ogImage,
          width: siteConfig.ogImageWidth,
          height: siteConfig.ogImageHeight,
          alt: siteConfig.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [siteConfig.ogImage],
    },
  };
}

function ArticleJsonLd({ slug }: Readonly<{ slug: string }>) {
  const post = getPost(slug);
  if (!post) return null;
  const organizationId = `${siteConfig.url}/#organization`;
  const websiteId = `${siteConfig.url}/#website`;
  const pageUrl = `${siteConfig.url}/articles/${post.slug}`;
  // Article schema mirrors visible content only: headline, description,
  // dates, author name and publisher. No invented ratings or counts.
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${pageUrl}#article`,
        headline: post.title,
        description: post.excerpt,
        url: pageUrl,
        mainEntityOfPage: pageUrl,
        datePublished: post.date,
        author: { "@type": "Organization", name: siteConfig.name },
        publisher: { "@id": organizationId },
        isPartOf: { "@id": websiteId },
        inLanguage: siteConfig.lang,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${siteConfig.url}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Articles",
            item: `${siteConfig.url}/articles`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: pageUrl,
          },
        ],
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: No workaround for JSON-LD injection
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

export default async function BlogPost({ params }: Readonly<Props>) {
  const { slug } = await params;
  // Unknown article slugs return the project 404 (with 404 status) rather
  // than a 200 "not found" panel — see Task 8 §14.
  if (!slug || !getPost(slug)) notFound();

  return (
    <>
      <ArticleJsonLd slug={slug} />
      <BlogPostBlock slug={slug} numbering={9} />
    </>
  );
}
