"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import BlueprintGrid from "@/components/mogen/blueprint-grid";
import MagneticButton from "@/components/mogen/magnet-button";
import PageShell from "@/components/mogen/page-shell";
import { getPost, POSTS } from "@/data/blog";
import ArticleNotFound from "./article-not-found";

interface Props {
  slug: string;
}

export default function BlogPostBlock({ slug }: Readonly<Props>) {
  const post = getPost(slug);
  if (!post) return <ArticleNotFound />;

  const related = POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <PageShell
      index="// 09 — Insights"
      label={post.category}
      title={post.title}
      intro={`${post.author} · ${post.date} · ${post.readTime}`}
    >
      <BlueprintGrid className="bg-bone pb-20">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <Link
            href="/blog"
            className="small-caps inline-flex items-center gap-2 text-ink/60 hover:text-catalyst"
          >
            <ArrowLeft className="h-4 w-4" /> Back to blog
          </Link>
        </div>
      </BlueprintGrid>

      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-190 px-6 lg:px-10">
          <article className="prose-content space-y-6 text-lg leading-relaxed text-ink/80">
            <ReactMarkdown
              components={{
                h3: ({ node, ...props }) => (
                  <h3
                    className="mt-10 font-display text-2xl font-black text-ink"
                    {...props}
                  />
                ),
                p: ({ node, ...props }) => (
                  <p className="text-ink/80" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="border-l-2 border-catalyst pl-6 font-display text-xl font-bold text-ink"
                    {...props}
                  />
                ),
              }}
            >
              {post.body}
            </ReactMarkdown>
          </article>
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
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group flex flex-col bg-bone p-6 transition-colors hover:bg-ink hover:text-bone"
              >
                <span className="small-caps text-catalyst">{p.category}</span>
                <h3 className="mt-3 font-display text-lg font-black leading-tight">
                  {p.title}
                </h3>
                <span className="mt-4 small-caps flex items-center gap-2 text-current">
                  Read{" "}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
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
