"use client";

import { type DependencyList, type RefObject, useRef } from "react";
import { useAnimationFrame } from "./use-animation-frame";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";

interface UseEqualHeightOptions {
  /** CSS custom property written to the container. Default: "--cell-height". */
  cssVar?: string;
  /** Selector, relative to the container, for the elements to measure. */
  selector?: string;
}

/**
 * Measures the tallest element matching `selector` inside the returned
 * container ref, and writes that height to a CSS custom property on the
 * container (`--cell-height` by default) so every cell — including ones
 * shorter than the tallest, like a CTA or a blank filler — can share it
 * via `height: var(--cell-height, auto)` in CSS.
 *
 * Re-measures automatically when the measured elements resize (content
 * change, font load, viewport resize) via ResizeObserver, and whenever
 * `deps` changes (e.g. the item count), which is when elements are
 * added/removed and need to be re-observed.
 */
export function useEqualHeight<T extends HTMLElement>(
  deps: DependencyList,
  options: UseEqualHeightOptions = {},
): RefObject<T | null> {
  const { cssVar = "--cell-height", selector = "[data-measure]" } = options;
  const containerRef = useRef<T>(null);

  const measure = () => {
    const container = containerRef.current;
    if (!container) return;

    // Reset first, or a previous forced height biases this measurement.
    container.style.removeProperty(cssVar);

    const items = container.querySelectorAll<HTMLElement>(selector);
    let max = 0;
    items.forEach((el) => {
      max = Math.max(max, el.offsetHeight);
    });

    if (max > 0) {
      container.style.setProperty(cssVar, `${max}px`);
    }
  };

  // Initial measure, deferred to after paint so layout has happened.
  useAnimationFrame(measure, deps);

  // Keep measuring as content reflows (wrapping text, font swap, resize).
  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => measure());
    container
      .querySelectorAll<HTMLElement>(selector)
      .forEach((el) => ro.observe(el));

    return () => ro.disconnect();
  }, deps);

  return containerRef;
}
