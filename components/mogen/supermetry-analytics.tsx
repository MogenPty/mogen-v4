"use client";

import { useInitSupermetry } from "@supermetry/react";

const SUPERMETRY_SITE_ID = "vymccwn7ggad";
const SUPERMETRY_SCRIPT_URL = `https://app.supermetry.com/js/${SUPERMETRY_SITE_ID}.js`;

/**
 * Mirrors Supermetry's official Next.js App Router component.
 * The tracker is initialized after mount, outside the critical render path.
 */
export default function SupermetryAnalytics() {
  useInitSupermetry({
    site: SUPERMETRY_SITE_ID,
    src: SUPERMETRY_SCRIPT_URL,
  });

  return null;
}
