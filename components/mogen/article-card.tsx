import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { slugifyTag, tagArchivePath } from "@/lib/articles/tags";
import type { ArticleSummary } from "@/lib/articles/types";

/**
 * Shared article card (index, tag archives, service related sections).
 * Mirrors the existing Mogen card styling (bone/ink invert on hover).
 *
 * Tags are clickable links to their archive pages. The card itself is an
 * `<article>` (not a single stretched link) so tag links never nest inside
 * another anchor — title, tags and the read link are separate anchors.
 */
export default function ArticleCard({
  article,
}: Readonly<{ article: ArticleSummary }>) {
  return (
    <article className="group flex flex-col bg-bone p-8 transition-colors hover:bg-ink hover:text-bone">
      <span className="small-caps text-catalyst">{article.category}</span>
      <h3 className="mt-4 font-display text-xl font-black leading-tight">
        <Link
          href={`/articles/${article.slug}`}
          className="transition-colors group-hover:text-bone"
        >
          {article.title}
        </Link>
      </h3>
      <p className="mt-3 flex-1 text-sm opacity-80">{article.description}</p>
      {article.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {article.tags.map((tag) => (
            <Link
              key={tag}
              href={tagArchivePath(slugifyTag(tag))}
              className="small-caps border border-ink/15 px-2 py-1 text-ink/60 transition-colors hover:border-catalyst hover:text-catalyst group-hover:border-bone/20 group-hover:text-bone/70"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}
      <div className="mt-6 flex items-center justify-between text-xs opacity-60">
        <span>{article.publishedAt}</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {article.readTime}
        </span>
      </div>
      <Link
        href={`/articles/${article.slug}`}
        aria-label={`Read: ${article.title}`}
        className="small-caps mt-4 inline-flex items-center gap-2 text-current"
      >
        Read <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
      </Link>
    </article>
  );
}
