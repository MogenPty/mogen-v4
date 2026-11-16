import "server-only";

import { RedirectRuleCache } from "./cache";
import { getRedirectGeneration, loadRouteSnapshot } from "./repository";

const redirectCache = new RedirectRuleCache({
  generation: getRedirectGeneration,
  snapshot: loadRouteSnapshot,
});

export function databaseRedirectsEnabled(): boolean {
  return process.env.MOGEN_DATABASE_REDIRECTS_ENABLED !== "false";
}

export async function getRouteSnapshot() {
  if (!databaseRedirectsEnabled()) return null;
  return redirectCache.get();
}

export function invalidateLocalRedirectCache(): void {
  redirectCache.invalidate();
}

