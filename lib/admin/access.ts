import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

/**
 * Require BOTH a signed-in, verified Better Auth user and an explicit
 * server-only allowlist entry. The guard is shared by all admin routes and
 * all catalogue mutations; public registration never grants admin access.
 */
export async function requireCatalogueAdmin(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email) redirect("/auth/sign-in");

  const email = session.user.email.trim().toLowerCase();
  const approved = (process.env.MOGEN_ADMIN_EMAILS ?? "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  if (approved.length === 0) redirect("/admin/access-denied?reason=not-configured");
  if (!approved.includes(email)) redirect("/admin/access-denied?reason=not-allowlisted");
  if (session.user.emailVerified !== true) {
    redirect("/admin/access-denied?reason=not-verified");
  }

  return email;
}
