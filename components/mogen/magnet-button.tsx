"use client";

import {
  type JSX,
  type MouseEventHandler,
  type ReactNode,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

interface MagneticButtonProps {
  href?: string;
  className?: string;
  children: ReactNode;
  variant?: string;
  as?: JSX.Element | ReactNode | string;
  type?: string;
  disabled?: boolean;
  target?: string;
  onClick?: VoidFunction;
}

/**
 * MagneticButton — subtly pulls the cursor toward it within a radius,
 * signalling the conversion path. Renders an anchor or button.
 */
export default function MagneticButton({
  as: As = "button",
  href,
  children,
  className,
  variant = "solid",
  ...props
}: Readonly<MagneticButtonProps>) {
  const ref = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMove = (e: unknown) => {
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
    "group relative inline-flex items-center justify-center gap-2 px-7 py-4 font-display font-bold uppercase tracking-wider text-sm transition-transform duration-200 ease-out will-change-transform";
  const variants = {
    solid: "bg-ink text-bone hover:bg-catalyst",
    catalyst: "bg-catalyst text-white hover:bg-ink",
    volt: "bg-volt text-obsidian hover:bg-ink hover:text-volt",
    outline: "border border-ink text-ink hover:bg-ink hover:text-bone",
    ghost: "text-ink hover:text-catalyst",
  };

  const style = { transform: `translate(${offset.x}px, ${offset.y}px)` };

  if (As === "a" || href) {
    return (
      <a
        ref={ref}
        href={href}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        className={cn(base, variants[variant], className)}
        style={style}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <As
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={cn(base, variants[variant], className)}
      style={style}
      {...props}
    >
      {children}
    </As>
  );
}
