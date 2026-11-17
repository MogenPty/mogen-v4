import { normalizeRequestPath, type RedirectMatchType } from "./paths";

const INTERNAL_PREFIXES = [
  "/_next",
  "/_vercel",
  "/api",
  "/admin",
  "/auth",
  "/.well-known",
] as const;

export function isProtectedApplicationPath(path: string): boolean {
  const normalized = normalizeRequestPath(path);
  return INTERNAL_PREFIXES.some(prefix => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

export function assertRuleDoesNotOverrideProtectedRoute(sourcePath: string, matchType: RedirectMatchType): void {
  const staticPath = sourcePath.replace(/\/(?:\:segment|\:path\*)$/, "") || "/";
  if (isProtectedApplicationPath(staticPath)) {
    throw new Error("Redirect rules cannot override admin, authentication, API or framework routes.");
  }
  if (matchType === "splat" && sourcePath === "/:path*") {
    throw new Error("A site-wide catch-all would override protected application routes.");
  }
}

export function assertSafeRedirectDestination(destinationPath: string): void {
  if (isProtectedApplicationPath(destinationPath)) {
    throw new Error("Redirect destinations cannot target internal application routes.");
  }
}
