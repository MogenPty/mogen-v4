import type { JSX, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BlueprintGridProps {
  className?: string;
  id?: string;
  children: ReactNode;
  as?: JSX.Element | ReactNode | string;
}

/**
 * BlueprintGrid — a 24-column technical grid with hairline rules that
 * "draw" themselves into view. Wrap any section to give it the Kinetic
 * Blueprinting frame.
 */
export default function BlueprintGrid({
  children,
  className,
  id,
  as: As = "section",
}: Readonly<BlueprintGridProps>) {
  return (
    <As id={id} className={cn("relative", className)}>
      {/* hairline frame */}
      <div
        className="pointer-events-none absolute inset-0 z-0 blueprint-grid opacity-60"
        aria-hidden="true"
      />
      {/* corner ticks */}
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 h-6 w-px bg-ink/40"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 h-px w-6 bg-ink/40"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-6 w-px bg-ink/40"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-px w-6 bg-ink/40"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 z-10 h-6 w-px bg-ink/40"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 z-10 h-px w-6 bg-ink/40"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 z-10 h-6 w-px bg-ink/40"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 z-10 h-px w-6 bg-ink/40"
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </As>
  );
}

interface SectionLabelProps {
  index: string | number;
  title: string;
}

export function SectionLabel({ index, title }: Readonly<SectionLabelProps>) {
  return (
    <div className="flex items-center gap-4 mb-10">
      <span className="small-caps text-catalyst">{index}</span>
      <span
        className="h-px flex-1 max-w-[120px] bg-ink/30"
        aria-hidden="true"
      />
      <span className="small-caps text-muted-foreground">{title}</span>
    </div>
  );
}
