import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Admin surfaces use shadcn's semantic tokens, NEVER mix a fixed light
 * surface (bg-white) with theme-flipping Mogen text-ink / text-bone.
 *
 * bg-card/text-card-foreground, border-border and bg-background/text-foreground
 * respond together to next-themes. Accent colour follows Mogen's data-accent.
 */
export const adminCardClass =
  "rounded-xl border border-border bg-card text-card-foreground shadow-sm";
export const adminFieldClass =
  "mt-2 w-full rounded-md border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-catalyst dark:scheme-dark";
export const adminLabelClass = "block text-sm font-semibold text-card-foreground";
export const adminMutedClass = "text-muted-foreground";
export const adminPrimaryClass =
  "inline-flex items-center justify-center rounded-md bg-catalyst px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";
export const adminLinkClass = "font-semibold text-catalyst hover:underline";

/** A themed content container shared by every admin listing/editor. */
export default function AdminCard({
  children,
  className,
  as = "div",
}: Readonly<{
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
}>) {
  const classes = cn(adminCardClass, className);
  if (as === "article") return <article className={classes}>{children}</article>;
  if (as === "section") return <section className={classes}>{children}</section>;
  return <div className={classes}>{children}</div>;
}
