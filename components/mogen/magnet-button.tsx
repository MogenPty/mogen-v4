"use client";

import { type MouseEvent, type ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ButtonSurface = "auto" | "light" | "dark";

interface MagneticButtonProps {
  href?: string;
  className?: string;
  children: ReactNode;
  variant?: string;
  /**
   * Local surface the button renders on (Task 7B §6).
   * - "auto" (default): inherits the global theme — previous behaviour.
   * - "light": pins light-surface tokens so hover/focus resolve against a
   *   light container even when the page is in dark mode.
   * - "dark": pins dark-surface tokens for buttons over dark containers
   *   (promotion cards, package cards, CTA bands) in light mode.
   * Prefer this over page-specific CSS: it reuses the existing
   * .surface-light/.surface-dark token contexts from app/globals.css.
   */
  surface?: ButtonSurface;
  as?: ReactNode | string;
  type?: string;
  disabled?: boolean;
  target?: string;
  onClick?: VoidFunction;
}

/**
 * MagneticButton — subtly pulls the cursor toward it within a radius,
 * signalling the conversion path. Renders an anchor or button.
 *
 * Hover states are context-safe: the primary `catalyst` CTA darkens/lightens
 * the accent itself (accent-hover token) instead of flipping to the global
 * theme ink, so it stays correct on light cards in dark pages and dark
 * cards in light pages. Variants that invert to the surface (`solid`,
 * `outline`) additionally accept `surface="light" | "dark"` to pin the
 * local container context.
 */
export default function MagneticButton({
  as: As = "button",
  href,
  children,
  className,
  variant = "solid",
  surface = "auto",
  ...props
}: Readonly<MagneticButtonProps>) {
  const ref = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMove = (e: MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const radius = 90;
    if (dist < radius) {
      const pull = (1 - dist / radius) * 0.35;
      setOffset({ x: dx * pull, y: dy * pull });
    } else {
      setOffset({ x: 0, y: 0 });
    }
  };

  const reset = () => setOffset({ x: 0, y: 0 });

  const base =
    "group relative inline-flex items-center justify-center gap-2 px-7 py-4 font-display font-bold uppercase tracking-wider text-sm transition-all duration-200 ease-out will-change-transform focus-visible:outline-3 focus-visible:outline-offset-3 disabled:pointer-events-none disabled:opacity-50";
  const variants: Record<string, string> = {
    solid: "bg-ink text-bone hover:bg-catalyst hover:text-white",
    // Context-safe primary CTA (Task 7C): the base green is the single
    // shared #247F52 in both modes and white text on it is ~5:1 contrast,
    // so text stays white and hover deepens the accent itself. No `dark:`
    // global-theme override: the button resolves identically on light
    // containers in dark pages and dark containers in light pages. Pin a
    // local surface via `surface="light" | "dark"` where the container
    // differs from the page theme.
    catalyst: "bg-catalyst text-white hover:bg-catalyst-hover hover:text-white",
    volt: "bg-volt text-obsidian hover:bg-ink hover:text-volt",
    outline: "border border-ink text-ink hover:bg-ink hover:text-bone",
    ghost: "text-ink hover:text-catalyst",
    // Explicit surface-pinned aliases — same visual language, resolved
    // against the local container via .surface-light/.surface-dark.
    "solid-on-light":
      "surface-light bg-ink text-bone hover:bg-catalyst hover:text-white",
    "catalyst-on-light":
      "surface-light bg-catalyst text-white hover:bg-catalyst-hover hover:text-white",
    "outline-on-light":
      "surface-light border border-ink text-ink hover:bg-ink hover:text-bone",
    "solid-on-dark":
      "surface-dark bg-ink text-bone hover:bg-catalyst hover:text-white",
    "catalyst-on-dark":
      "surface-dark bg-catalyst text-white hover:bg-catalyst-hover hover:text-white",
    "outline-on-dark":
      "surface-dark border border-ink text-ink hover:bg-ink hover:text-bone",
  };

  const surfaceClass =
    surface === "light"
      ? "surface-light"
      : surface === "dark"
        ? "surface-dark"
        : "";

  const style = { transform: `translate(${offset.x}px, ${offset.y}px)` };

  if (As === "a" || href) {
    return (
      <a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        data-surface={surface}
        className={cn(base, variants[variant], surfaceClass, className)}
        style={style}
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      data-surface={surface}
      className={cn(base, variants[variant], surfaceClass, className)}
      style={style}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
