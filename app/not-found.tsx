import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bone px-6 text-center">
      <p className="small-caps text-catalyst">{"// 404"}</p>
      <h1 className="mt-4 font-display text-4xl font-black text-ink">
        Page not found.
      </h1>
      <p className="mt-4 max-w-md text-ink/60">
        The page you are looking for does not exist or has moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/"
          className="small-caps bg-ink px-6 py-3 text-bone hover:bg-catalyst hover:text-white"
        >
          Back home
        </Link>
        <Link
          href="/services"
          className="small-caps border border-ink/20 px-6 py-3 text-ink hover:border-catalyst hover:text-catalyst"
        >
          View services
        </Link>
      </div>
    </div>
  );
}
