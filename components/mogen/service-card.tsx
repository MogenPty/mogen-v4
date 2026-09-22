"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  name: string;
  slug: string;
  desc: string;
  deliverables: string[];
  icon: LucideIcon;
  featured?: boolean;
  className?: string;
}

export default function ServiceCard({
  name,
  slug,
  desc,
  deliverables,
  icon: Icon,
  featured,
  className,
}: Readonly<ServiceCardProps>) {
  return (
    <article
      className={cn(
        "group relative bg-bone p-8 transition-colors hover:bg-ink hover:text-bone",
        className,
      )}
    >
      {featured && (
        <span className="absolute right-6 top-6 small-caps text-catalyst">
          Core
        </span>
      )}
      <Icon
        className="h-8 w-8 text-catalyst"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <h3 className="mt-6 font-display text-2xl font-black">{name}</h3>
      <p className="mt-3 text-sm leading-relaxed opacity-80">{desc}</p>
      <ul className="mt-6 space-y-2">
        {deliverables.map((d) => (
          <li key={d} className="flex items-center gap-2 text-sm">
            <span className="h-1 w-1 bg-catalyst" aria-hidden="true" />
            {d}
          </li>
        ))}
      </ul>
      <Link
        href={`/services/${slug}`}
        className="mt-8 inline-flex items-center gap-2 text-sm small-caps text-current group-hover:text-catalyst"
      >
        Learn more →
      </Link>
    </article>
  );
}
