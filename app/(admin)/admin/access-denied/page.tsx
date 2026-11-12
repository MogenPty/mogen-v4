import Link from "next/link";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin access restricted",
  robots: { index: false, follow: false },
};

type Reason = "not-configured" | "not-allowlisted" | "not-verified";

const guidance: Record<Reason, { title: string; detail: string; fix: string }> = {
  "not-configured": {
    title: "Admin email allowlist is missing",
    detail: "The server has no valid MOGEN_ADMIN_EMAILS entries in its environment.",
    fix: "Add MOGEN_ADMIN_EMAILS to .env.local (or your deployed environment), then restart the Next.js server.",
  },
  "not-allowlisted": {
    title: "This account is not on the admin allowlist",
    detail: "The email shown below does not match any address in MOGEN_ADMIN_EMAILS.",
    fix: "Ensure the logged-in email matches an entry exactly (ignoring case and outer spaces). Restart after changing .env.local.",
  },
  "not-verified": {
    title: "Email verification is still required",
    detail: "This account is signed in and allowlisted, but Neon Auth has not marked its email as verified.",
    fix: "Complete the email verification step for this Neon Auth account, then sign in again. If you believe it is verified, check the emailVerified field in Neon Auth.",
  },
};

export default async function AdminAccessDeniedPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ reason?: string }> }>) {
  const params = await searchParams;
  const reason: Reason = params.reason === "not-configured" ||
    params.reason === "not-allowlisted" || params.reason === "not-verified"
    ? params.reason : "not-allowlisted";
  const { data: session } = await auth.getSession();
  const userEmail = session?.user?.email ?? null;
  const details = guidance[reason];

  return (
    <main className="surface-light flex min-h-screen items-center justify-center bg-[#f4f5f2] px-5 py-16 text-[#171a18]" style={{ colorScheme: "light" }}>
      <section className="w-full max-w-2xl rounded-2xl border border-[#dce3dd] bg-white p-7 shadow-lg sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1f7a50]">Mogen administration</p>
        <h1 className="mt-4 text-3xl font-black leading-tight text-[#171a18] sm:text-4xl">
          Admin access restricted
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#37423b]">
          You're signed in, but the account cannot access the catalogue administration yet.
        </p>

        {userEmail && (
          <div className="mt-6 rounded-lg bg-[#f2f5f2] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#4b5b50]">Signed-in account</p>
            <p className="mt-1 break-all font-semibold text-[#171a18]">{userEmail}</p>
          </div>
        )}

        <div className="mt-6 border-l-4 border-[#1f7a50] pl-5">
          <h2 className="text-lg font-bold text-[#171a18]">{details.title}</h2>
          <p className="mt-2 leading-relaxed text-[#37423b]">{details.detail}</p>
          <p className="mt-3 leading-relaxed text-[#37423b]">{details.fix}</p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-5">
          <Link href="/admin" className="rounded-lg bg-[#1f7a50] px-5 py-3 font-semibold text-white hover:bg-[#155b3a]">
            Try admin again
          </Link>
          <Link href="/auth/sign-in" className="font-semibold text-[#1f7a50] underline underline-offset-4">
            Sign in with another account
          </Link>
          <Link href="/" className="font-semibold text-[#47564b] underline underline-offset-4">
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
