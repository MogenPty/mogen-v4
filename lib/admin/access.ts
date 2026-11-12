import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

/** Fail closed: signing up is not an admin grant. */
export async function requireCatalogueAdmin(): Promise<string> {
  const { data: session } = await auth.getSession();
  if (!session?.user?.email) redirect("/auth/sign-in");
  if (!("emailVerified" in session.user) || session.user.emailVerified !== true) redirect("/admin/access-denied");
  const approved = (process.env.MOGEN_ADMIN_EMAILS ?? "")
    .split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
  const email = session.user.email.trim().toLowerCase();
  if (approved.length === 0 || !approved.includes(email)) notFound();
  return email;
}
