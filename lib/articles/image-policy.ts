import { ARTICLE_IMAGE_PREFIX } from "./types";

/** Local article images must be web paths under /images/articles/. Pure — no node:fs. */
export function isAllowedArticleImageSrc(src: string): boolean {
  if (!src.startsWith(ARTICLE_IMAGE_PREFIX)) return false;
  if (src.includes("..") || src.includes("\\")) return false;
  if (src.startsWith("public/") || src.includes("public/images")) return false;
  return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(src.split("?")[0]);
}
