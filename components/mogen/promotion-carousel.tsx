"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PromotionImage } from "@/data/promotions";

interface Props {
  images: PromotionImage[];
  /** Auto-advance interval in ms. Defaults to 5000 (5 seconds). */
  intervalMs?: number;
  /** Accessible label prefix, e.g. the promotion name. */
  label?: string;
  className?: string;
}

/**
 * PromotionCarousel — reusable auto-advancing carousel for promotional
 * campaign images. Renders nothing when `images` is empty so promotions
 * without images show no empty carousel.
 */
export default function PromotionCarousel({
  images,
  intervalMs = 5000,
  label = "Promotion",
  className,
}: Readonly<Props>) {
  const count = images.length;
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const goNext = useCallback(() => {
    goTo(index + 1);
  }, [goTo, index]);

  const goPrev = useCallback(() => {
    goTo(index - 1);
  }, [goTo, index]);

  // Respect prefers-reduced-motion: no auto-advance in that case.
  // Initial value comes from the lazy useState initializer above; the
  // effect only subscribes to future changes.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Single auto-advance timer. Re-created on manual navigation so the
  // rotation continues from the newly selected image; cleanup guarantees
  // only one timer ever exists.
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (count <= 1 || reducedMotion) return;
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, intervalMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [count, intervalMs, reducedMotion, index]);

  if (count === 0) return null;

  const current = images[index];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    }
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`${label} images`}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative overflow-hidden border border-ink/10 bg-ink/5",
        className,
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.src}
          src={current.src}
          alt={current.alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      {current.caption && (
        <p className="border-t border-ink/10 bg-bone px-6 py-3 text-sm text-ink/60">
          {current.caption}
        </p>
      )}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous"
            className="absolute left-3 top-1/3 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink/15 bg-bone/90 text-ink transition-colors hover:bg-ink hover:text-bone"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next"
            className="absolute right-3 top-1/3 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink/15 bg-bone/90 text-ink transition-colors hover:bg-ink hover:text-bone"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {images.map((img, i) => (
              <button
                key={img.src}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to image ${i + 1} of ${count}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-colors",
                  i === index
                    ? "bg-catalyst"
                    : "bg-bone/70 hover:bg-bone",
                )}
              />
            ))}
          </div>

          <p aria-live="polite" className="sr-only">
            Image {index + 1} of {count}: {current.alt}
          </p>
        </>
      )}
    </div>
  );
}
