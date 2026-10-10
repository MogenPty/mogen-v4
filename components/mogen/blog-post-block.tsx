import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import ArticleCard from "@/components/mogen/article-card";
import BlueprintGrid from "@/components/mogen/blueprint-grid";
import MagneticButton from "@/components/mogen/magnet-button";
import PageShell from "@/components/mogen/page-shell";
import { getPosts, sortPostsByDateDesc, toArticleSummary } from "@/data/blog";
import { slugifyTag, tagArchivePath } from "@/lib/articles/tags";
import type { ArticleSummary } from "@/lib/articles/types";
import { formatNumber } from "@/lib/utils";
import ArticleImage from "./article-image";

interface Props {
  article: ArticleSummary;
  /** Rendered MDX content for the article body. */
  content: ReactNode;
  numbering?: number;
}

export default function BlogPostBlock({
  article,
  content,
  numbering = 1,
}: Readonly<Props>) {
  const related = sortPostsByDateDesc(
    getPosts().filter((p) => p.slug !== article.slug),
  ).slice(0, 3);

  const introParts = [
    article.author,
    article.publishedAt,
    article.readTime,
  ].filter(Boolean);
  const intro = introParts.join(" · ");

  return (
    <PageShell
      index={`// ${formatNumber(numbering)} — Insights`}
      label={article.category}
      title={article.title}
      intro={intro}
    >
      <BlueprintGrid className="bg-bone pb-20">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <Link
            href="/articles"
            className="small-caps inline-flex items-center gap-2 text-ink/60 hover:text-catalyst"
          >
            <ArrowLeft className="h-4 w-4" /> Back to articles
          </Link>
        </div>
      </BlueprintGrid>

      {article.heroImage ? (
        <BlueprintGrid className="bg-bone pb-12">
          <div className="mx-auto max-w-190 px-6 lg:px-10">
            <ArticleImage
              src={article.heroImage}
              alt={article.heroImageAlt ?? article.title}
              priority
            />
          </div>
        </BlueprintGrid>
      ) : null}

      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-190 px-6 lg:px-10">
          {article.updatedAt && article.updatedAt !== article.publishedAt ? (
            <p className="small-caps mb-6 text-ink/50">
              Updated {article.updatedAt}
            </p>
          ) : null}
          <article className="prose-content space-y-6 text-lg leading-relaxed text-ink/80 article">
            {content}
          </article>
          {article.tags.length > 0 ? (
            <div className="mt-10 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={tagArchivePath(slugifyTag(tag))}
                  className="small-caps border border-ink/15 px-3 py-1 text-ink/60 transition-colors hover:border-catalyst hover:text-catalyst"
                >
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </BlueprintGrid>

      {/* Related */}
      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <h2 className="mb-8 font-display text-2xl font-black text-ink">
            Keep reading
          </h2>
          <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-3">
            {related.map((p) => (
              <ArticleCard key={p.slug} article={toArticleSummary(p)} />
            ))}
          </div>
        </div>
      </BlueprintGrid>

      <BlueprintGrid className="bg-catalyst py-20 text-white">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-6 px-6 lg:flex-row lg:items-center lg:px-10">
          <h2 className="font-display text-3xl font-black lg:text-4xl text-balance">
            Ready to grow?
          </h2>
          <MagneticButton
            as="a"
            href="/#audit"
            variant="solid"
            className="bg-ink text-bone hover:bg-bone hover:text-ink"
          >
            Get Free Audit <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </div>
      </BlueprintGrid>
    </PageShell>
  );
}
