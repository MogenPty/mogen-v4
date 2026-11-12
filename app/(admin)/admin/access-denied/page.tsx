import Link from "next/link";

export const metadata = {
  title: "Admin access restricted",
  robots: { index: false, follow: false },
};

export default function AdminAccessDeniedPage() {
  return (
    <main className="min-h-screen bg-bone px-6 py-24 text-ink">
      <div className="mx-auto max-w-xl rounded-xl border border-ink/15 bg-white p-8">
        <p className="small-caps text-catalyst">Mogen administration</p>
        <h1 className="mt-3 font-display text-3xl font-black">Admin access restricted</h1>
        <p className="mt-4 text-ink/70">
          Sign in with a verified account whose email is listed in the server-only
          MOGEN_ADMIN_EMAILS configuration. Signing up alone does not grant access.
        </p>
        <div className="mt-7 flex flex-wrap gap-5">
          <Link className="font-semibold text-catalyst underline" href="/auth/sign-in">
            Sign in with a different account
          </Link>
          <Link className="font-semibold text-ink/60 underline" href="/">Return home</Link>
        </div>
      </div>
    </main>
  );
}
