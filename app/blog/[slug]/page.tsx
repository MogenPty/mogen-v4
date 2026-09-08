import ArticleNotFound from "@/components/mogen/article-not-found";
import BlogPostBlock from "@/components/mogen/blog-post-block";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BlogPost({ params }: Readonly<Props>) {
  const { slug } = await params;
  if (!slug) return <ArticleNotFound />;

  return <BlogPostBlock slug={slug} />;
}
