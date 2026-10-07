import Image from "next/image";
import { isAllowedArticleImageSrc } from "@/lib/articles/loader";

interface ArticleImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  caption?: string;
  priority?: boolean;
}

function toAbsoluteImageUrl(src: string): string {
  // next/image + metadata need absolute URLs only at metadata time;
  // rendering keeps the web path as-is (e.g. /images/articles/x.jpg).
  return src;
}

/**
 * Explicit MDX image component backed by next/image.
 *
 * Ordinary Markdown images (`![alt](src)`) are mapped to this component
 * via `mdx-components.tsx` without authors importing anything.
 * When width/height are provided they are used directly; otherwise a
 * responsive 16/9 fill wrapper preserves layout stability without
 * forcing authors to specify dimensions.
 */
export default function ArticleImage({
  src,
  alt,
  width,
  height,
  caption,
  priority = false,
}: Readonly<ArticleImageProps>) {
  const resolved = toAbsoluteImageUrl(src);

  if (!alt || alt.trim().length === 0) {
    throw new Error(
      `ArticleImage requires non-empty alt text (src: "${src}").`,
    );
  }

  if (!isAllowedArticleImageSrc(resolved)) {
    throw new Error(
      `ArticleImage src must be a local /images/articles/... web path (received: "${src}").`,
    );
  }

  const figure = (inner: React.ReactNode) => (
    <figure className="my-8">
      {inner}
      {caption ? (
        <figcaption className="mt-3 text-center text-sm text-ink/60">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );

  if (typeof width === "number" && typeof height === "number") {
    return figure(
      <Image
        src={resolved}
        alt={alt}
        width={width}
        height={height}
        sizes="(max-width: 768px) 100vw, 768px"
        style={{ width: "100%", height: "auto" }}
        priority={priority}
      />,
    );
  }

  // Unknown dimensions: fill inside a stable 16/9 box. No layout shift,
  // fully responsive, lazy-loaded by default.
  return figure(
    <span
      className="relative block w-full overflow-hidden"
      style={{ aspectRatio: "16 / 9" }}
    >
      <Image
        src={resolved}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 768px"
        style={{ objectFit: "cover" }}
        priority={priority}
      />
    </span>,
  );
}

/**
 * Mapping for plain Markdown `img` elements.
 * MDX passes `{ src, alt, title }`; title becomes a caption where present.
 */
export function MdxImg({
  src,
  alt,
  title,
}: Readonly<{ src?: string; alt?: string; title?: string | null }>) {
  if (!src) return null;
  return (
    <ArticleImage
      src={src}
      alt={alt ?? ""}
      caption={title ?? undefined}
    />
  );
}
