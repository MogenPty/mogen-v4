import type { MDXComponents } from "mdx/types";
import ArticleImage, { MdxImg } from "./components/mogen/article-image";

/**
 * Central MDX component registry (required by @next/mdx + App Router).
 * Kept deliberately small: Markdown `img` maps to the Mogen next/image
 * component, and `ArticleImage` is available for explicit use in MDX.
 * Ordinary Markdown images remain the preferred authoring mechanism —
 * authors never import next/image themselves.
 */
const components: MDXComponents = {
  img: MdxImg as MDXComponents["img"],
  ArticleImage: ArticleImage as unknown as MDXComponents["ArticleImage"],
  h1: ({ children }) => (
    <h1 className="font-display text-4xl font-black leading-tight text-ink lg:text-5xl text-balance">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-10 font-display text-3xl font-black text-ink text-balance">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-10 font-display text-2xl font-black text-ink">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="text-ink/80">{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-catalyst pl-6 font-display text-xl font-bold text-ink">
      {children}
    </blockquote>
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
