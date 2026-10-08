import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostBlock from "@/components/mogen/blog-post-block";
import { getArticleBySlug, getArticleSlugs } from "@/lib/articles/loader";
import { articleJsonLd, articleMetadata } from "@/lib/articles/metadata";

interface Props {
  params: Promise<{ slug: string }>;
}

// dynamicParams stays true (the default): generateStaticParams pre-renders
// known articles at build time, while articles added later still render on
// demand instead of 404ing. Unknown slugs return the project 404 via
// notFound() below, so no invalid URL ever renders.
export const dynamicParams = true;

export function generateStaticParams() {
  return getArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: "Article not found" };
  return articleMetadata(article);
}

function ArticleJsonLd({ slug }: Readonly<{ slug: string }>) {
  const article = getArticleBySlug(slug);
  if (!article) return null;
  if (article.draft) return null;
  const graph = articleJsonLd(article);
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
  const article = slug ? getArticleBySlug(slug) : undefined;
  if (!slug || !article || article.draft) notFound();

  const { default: Content } = await import(`@/articles/${slug}.mdx`);

  return (
    <>
      <ArticleJsonLd slug={slug} />
      <BlogPostBlock article={article} content={<Content />} numbering={9} />
    </>
  );
}
