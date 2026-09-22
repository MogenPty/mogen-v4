/** biome-ignore-all lint/correctness/useExhaustiveDependencies: Using Array vs List is the same in this case */
"use client";

import { type DependencyList, useEffect } from "react";

/**
 * Runs `callback` once, after the browser's next paint — i.e. after the
 * DOM has actually been laid out, so `offsetHeight`/`getBoundingClientRect`
 * reads inside it are reliable.
 *
 * Re-runs whenever `deps` changes, same as a normal `useEffect`.
 */
export function useAnimationFrame(
  callback: () => void,
  deps: DependencyList,
): void {
  useEffect(() => {
    const id = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(id);
    // callback is intentionally excluded — callers control re-runs via deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
