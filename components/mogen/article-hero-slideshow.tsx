"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";

interface Props {
  images: string[];
  alt: string;
}

const DEFAULT_INTERVAL_MS = 5000;

export default function ArticleHeroSlideshow({ images, alt }: Readonly<Props>) {
  const list = images.filter(Boolean);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const intervalMs = Number(
    process.env.NEXT_PUBLIC_ARTICLE_HERO_SLIDESHOW_INTERVAL_MS ??
      DEFAULT_INTERVAL_MS,
  );

  useEffect(() => {
    if (list.length <= 1 || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [list.length, intervalMs, paused]);

  if (list.length === 0) return null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {list.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          priority={i === 0}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className={`object-cover object-center transition-opacity duration-1000 lg:object-[right_center] ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      {/* fade under the title on the left edge (desktop only; mobile full opacity) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-bone via-bone/40 to-transparent lg:block"
      />
      {list.length > 1 ? (
        <div
          aria-hidden="true"
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-row gap-2 lg:bottom-auto lg:left-auto lg:right-4 lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-0 lg:flex-col"
        >
          {list.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === index ? "bg-catalyst" : "bg-ink/30"
              }`}
            />
          ))}
        </div>
      ) : null}
      {list.length > 1 ? (
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-pressed={paused}
          aria-label={paused ? "Resume slideshow" : "Pause slideshow"}
          className="absolute bottom-3 left-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-bone/80 text-ink shadow-sm backdrop-blur transition-colors hover:bg-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-catalyst"
        >
          {paused ? (
            <Play className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Pause className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      ) : null}
    </div>
  );
}
