declare module "*.mdx" {
  import type { MDXComponents } from "mdx/types";
  import type { ComponentType, JSX } from "react";

  export const frontmatter: Record<string, unknown>;
  export default function MDXContent(
    props: JSX.IntrinsicAttributes & {
      components?: MDXComponents;
    },
  ): JSX.Element;
  export const useMDXComponents: () => MDXComponents;
  const _default: ComponentType<{
    components?: MDXComponents;
  }>;
  export default _default;
}
