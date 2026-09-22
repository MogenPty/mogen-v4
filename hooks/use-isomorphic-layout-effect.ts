"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` fires a React warning when it runs during the server
 * render pass Next.js does for "use client" components. This swaps to a
 * no-op-safe `useEffect` on the server and the real `useLayoutEffect` in
 * the browser, so measurement code never flashes and never warns.
 */
export const useIsomorphicLayoutEffect: typeof useLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
