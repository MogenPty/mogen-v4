import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowUpRight, Bot, FileQuestion, Search } from "lucide-react";
import AdminCard from "@/components/mogen/admin-card";
import ConfirmActionForm from "@/components/mogen/confirm-action-form";
import { getCatalogueDb } from "@/db/client";
import { notFoundPaths } from "@/db/schema";
import { requireCatalogueAdmin } from "@/lib/admin/access";
import { ignoreNotFoundAction } from "@/lib/admin/redirect-actions";

export const dynamic = "force-dynamic";
const formatDate = (value: Date) => new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(value);

export default async function NotFoundMonitorPage({ searchParams }: Readonly<{
  searchParams: Promise<{ status?: string }>;
}>) {
  await requireCatalogueAdmin();
  const { status = "open" } = await searchParams;
  const rows = await getCatalogueDb().select().from(notFoundPaths)
    .where(status === "all" ? undefined : eq(notFoundPaths.resolutionStatus, status))
    .orderBy(desc(notFoundPaths.hitCount), desc(notFoundPaths.lastSeenAt)).limit(500);
  const total = rows.reduce((sum, row) => sum + row.hitCount, 0);
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="small-caps text-catalyst">Discovery</p><h1 className="mt-3 font-display text-4xl font-black sm:text-5xl">404 monitor</h1><p className="mt-3 max-w-3xl text-muted-foreground">Unique public paths are aggregated asynchronously without storing query strings or full referrer URLs. Counts are rate-limited and may be sampled during bursts.</p></div>
          <Link href="/admin/redirects" className="font-semibold text-catalyst hover:underline">Open redirect manager</Link>
        </div>
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <AdminCard className="p-5"><FileQuestion className="size-5 text-catalyst" aria-hidden="true" /><p className="mt-3 small-caps text-muted-foreground">Unique paths</p><p className="mt-2 font-display text-3xl font-black">{rows.length}</p></AdminCard>
          <AdminCard className="p-5"><Search className="size-5 text-catalyst" aria-hidden="true" /><p className="mt-3 small-caps text-muted-foreground">Sampled requests</p><p className="mt-2 font-display text-3xl font-black">{total.toLocaleString("en-ZA")}</p></AdminCard>
          <AdminCard className="p-5"><Bot className="size-5 text-catalyst" aria-hidden="true" /><p className="mt-3 small-caps text-muted-foreground">Search crawlers</p><p className="mt-2 font-display text-3xl font-black">{rows.filter(row => row.userAgentClass === "search").length}</p></AdminCard>
        </section>
        <form method="get" className="mt-8 flex flex-wrap items-end gap-3"><div><label htmlFor="status" className="block text-sm font-semibold">Resolution status</label><select id="status" name="status" defaultValue={status} className="mt-2 min-h-11 rounded-md border border-input bg-background px-4"><option value="open">Open</option><option value="redirected">Redirected</option><option value="gone">Gone</option><option value="ignored">Ignored</option><option value="all">All</option></select></div><button className="min-h-11 rounded-md border border-border bg-card px-4 font-semibold hover:border-catalyst">Apply filter</button></form>
        <div className="mt-5 grid gap-3">
          {rows.map(row => (
            <AdminCard key={row.id} as="article" className="p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-accent-muted px-2.5 py-1 text-xs font-bold capitalize">{row.resolutionStatus}</span><span className="small-caps text-muted-foreground">{row.userAgentClass}</span></div><h2 className="mt-3 truncate font-mono text-base font-bold">{row.requestedPath}</h2><p className="mt-2 text-sm text-muted-foreground">{row.hitCount.toLocaleString("en-ZA")} sampled hits · First {formatDate(row.firstSeenAt)} · Last {formatDate(row.lastSeenAt)}{row.referrer ? ` · Referrer ${row.referrer}` : ""}</p></div>
                {row.resolutionStatus === "open" && <div className="flex flex-wrap gap-2"><Link href={`/admin/redirects?sourcePath=${encodeURIComponent(row.requestedPath)}&notFoundId=${row.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-catalyst px-4 font-semibold text-white"><ArrowUpRight className="size-4" aria-hidden="true" /> Create redirect</Link><ConfirmActionForm action={ignoreNotFoundAction} fields={{ id: row.id }} message={`Ignore future review of ${row.requestedPath}?`} label="Ignore" className="min-h-11 rounded-md border border-border px-4 font-semibold hover:border-catalyst" /></div>}
              </div>
            </AdminCard>
          ))}
          {!rows.length && <AdminCard className="p-10 text-center"><h2 className="font-display text-2xl font-black">No paths in this view</h2><p className="mt-2 text-muted-foreground">New public 404s will appear here after their asynchronous write completes.</p></AdminCard>}
        </div>
      </div>
    </main>
  );
}
