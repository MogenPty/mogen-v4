import Link from "next/link";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { ArrowRight, Download, History, Route, ShieldCheck } from "lucide-react";
import AdminCard, {
  adminFieldClass,
  adminPrimaryClass,
} from "@/components/mogen/admin-card";
import ConfirmActionForm from "@/components/mogen/confirm-action-form";
import { getCatalogueDb } from "@/db/client";
import { goneResourceRules, redirectHistory, redirectRules } from "@/db/schema";
import { requireCatalogueAdmin } from "@/lib/admin/access";
import {
  createGoneRuleAction,
  createRedirectAction,
  deleteGoneRuleAction,
  deleteRedirectAction,
  setGoneRuleActiveAction,
  setRedirectActiveAction,
} from "@/lib/admin/redirect-actions";
import { getRedirectGeneration, loadRouteSnapshot } from "@/lib/redirects/repository";
import { resolveRoute } from "@/lib/redirects/engine";
import { normalizeRequestPath } from "@/lib/redirects/paths";

export const dynamic = "force-dynamic";

const REDIRECT_PAGE_SIZE = 50;
const GONE_PAGE_SIZE = 20;

function pageNumber(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

const formatDate = (value: Date | null) => value
  ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(value)
  : "Never";

export default async function RedirectManagerPage({ searchParams }: Readonly<{
  searchParams: Promise<{ q?: string; state?: string; kind?: string; page?: string; gonePage?: string; goneSource?: string; testPath?: string; sourcePath?: string; destinationPath?: string; notFoundId?: string; gscRowId?: string }>;
}>) {
  await requireCatalogueAdmin();
  const filters = await searchParams;
  const db = getCatalogueDb();
  const query = filters.q?.trim() ?? "";
  const page = pageNumber(filters.page);
  const gonePage = pageNumber(filters.gonePage);
  const goneWhere = filters.goneSource ? eq(goneResourceRules.sourcePath, filters.goneSource) : undefined;
  const now = new Date();
  const redirectWhere = and(
    query ? or(
      ilike(redirectRules.sourcePath, `%${query}%`),
      ilike(redirectRules.destinationPath, `%${query}%`),
      ilike(redirectRules.description, `%${query}%`),
    ) : undefined,
    filters.state === "active" ? eq(redirectRules.isActive, true) : undefined,
    filters.state === "disabled" ? eq(redirectRules.isActive, false) : undefined,
    filters.kind === "automatic" ? eq(redirectRules.isAutomatic, true) : undefined,
    filters.kind === "manual" ? eq(redirectRules.isAutomatic, false) : undefined,
  );
  const [redirectRows, goneRows, historyRows, redirectTotals, filteredTotals, goneTotals, filteredGoneTotals] = await Promise.all([
    db.select().from(redirectRules).where(redirectWhere).orderBy(desc(redirectRules.updatedAt)).limit(REDIRECT_PAGE_SIZE).offset((page - 1) * REDIRECT_PAGE_SIZE),
    db.select().from(goneResourceRules).where(goneWhere).orderBy(desc(goneResourceRules.updatedAt)).limit(GONE_PAGE_SIZE).offset((gonePage - 1) * GONE_PAGE_SIZE),
    db.select().from(redirectHistory).orderBy(desc(redirectHistory.createdAt)).limit(20),
    db.select({ total: count(), active: sql<number>`count(*) filter (where ${redirectRules.isActive} = true)::integer`, hits: sql<number>`coalesce(sum(${redirectRules.hitCount}), 0)::bigint` }).from(redirectRules),
    db.select({ total: count() }).from(redirectRules).where(redirectWhere),
    db.select({ total: count(), active: sql<number>`count(*) filter (where ${goneResourceRules.isActive} = true)::integer` }).from(goneResourceRules),
    goneWhere ? db.select({ total: count() }).from(goneResourceRules).where(goneWhere) : Promise.resolve([]),
  ]);
  const rows = redirectRows;
  const redirectTotal = redirectTotals[0]?.total ?? 0;
  const filteredTotal = filteredTotals[0]?.total ?? 0;
  const goneTotal = filteredGoneTotals[0]?.total ?? goneTotals[0]?.total ?? 0;
  const redirectPages = Math.max(1, Math.ceil(filteredTotal / REDIRECT_PAGE_SIZE));
  const gonePages = Math.max(1, Math.ceil(goneTotal / GONE_PAGE_SIZE));

  let testResult: string | null = null;
  if (filters.testPath) {
    try {
      const path = normalizeRequestPath(filters.testPath);
      const snapshot = await loadRouteSnapshot(await getRedirectGeneration());
      const result = resolveRoute(path, snapshot);
      testResult = result.kind === "redirect"
        ? `${result.statusCode} → ${result.destinationPath}${result.preserveQuery ? " (query preserved)" : ""}`
        : result.kind === "gone" ? "410 Gone" : "No matching rule";
    } catch (error) {
      testResult = error instanceof Error ? error.message : "The test path is invalid.";
    }
  }

  const activeCount = redirectTotals[0]?.active ?? 0;
  const totalHits = Number(redirectTotals[0]?.hits ?? 0);
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="small-caps text-catalyst">Traffic control</p>
            <h1 className="mt-3 font-display text-4xl font-black sm:text-5xl">Redirect manager</h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">Manage same-origin redirects and explicit 410 responses without a deployment. Changes invalidate the shared rules snapshot immediately.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/redirects/export" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-4 font-semibold hover:border-catalyst">
              <Download className="size-4" aria-hidden="true" /> Export CSV
            </Link>
            <Link href="/admin/redirects/import" className={adminPrimaryClass}>Import routes</Link>
          </div>
        </div>

        <section aria-label="Redirect summary" className="mt-8 grid gap-4 sm:grid-cols-3">
          <AdminCard className="p-5"><p className="small-caps text-muted-foreground">Active rules</p><p className="mt-2 font-display text-3xl font-black">{activeCount}</p></AdminCard>
          <AdminCard className="p-5"><p className="small-caps text-muted-foreground">Recorded hits</p><p className="mt-2 font-display text-3xl font-black">{totalHits.toLocaleString("en-ZA")}</p></AdminCard>
          <AdminCard className="p-5"><p className="small-caps text-muted-foreground">Gone rules</p><p className="mt-2 font-display text-3xl font-black">{goneTotals[0]?.active ?? 0}</p></AdminCard>
        </section>

        <section id="add-redirect" className="mt-8 scroll-mt-4 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.5fr)]">
          <AdminCard as="section" className="p-6">
            <div className="flex items-start gap-3"><Route className="mt-1 size-5 text-catalyst" aria-hidden="true" /><div><h2 className="font-display text-2xl font-black">Add a redirect</h2><p className="mt-1 text-sm text-muted-foreground">Use <code>/blog/*</code> for a catch-all or <code>/blog/:slug</code> for one terminal segment.</p></div></div>
            <form action={createRedirectAction} className="mt-6 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="notFoundId" value={filters.notFoundId ?? ""} />
              <input type="hidden" name="gscRowId" value={filters.gscRowId ?? ""} />
              <div><label htmlFor="new-source" className="text-sm font-semibold">Source path</label><input id="new-source" name="sourcePath" required readOnly={Boolean(filters.gscRowId)} defaultValue={filters.sourcePath} placeholder="/old-page" className={adminFieldClass} /></div>
              <div><label htmlFor="new-destination" className="text-sm font-semibold">Destination path</label><input id="new-destination" name="destinationPath" required defaultValue={filters.destinationPath} placeholder="/new-page" className={adminFieldClass} /></div>
              <div><label htmlFor="new-status" className="text-sm font-semibold">HTTP status</label><select id="new-status" name="statusCode" defaultValue="308" className={adminFieldClass}><option value="301">301 Permanent</option><option value="308">308 Permanent, method preserved</option><option value="302">302 Temporary</option><option value="307">307 Temporary, method preserved</option></select></div>
              <div><label htmlFor="new-expiry" className="text-sm font-semibold">Expires (optional, SAST)</label><input id="new-expiry" name="expiresAt" type="datetime-local" className={adminFieldClass} /></div>
              <div className="md:col-span-2"><label htmlFor="new-description" className="text-sm font-semibold">Description</label><input id="new-description" name="description" maxLength={1000} placeholder="Why this route exists" className={adminFieldClass} /></div>
              <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" name="preserveQuery" defaultChecked /> Preserve query string</label>
              <div className="flex justify-end"><button className={adminPrimaryClass}>Create redirect</button></div>
            </form>
          </AdminCard>

          <AdminCard as="section" className="p-6">
            <h2 className="font-display text-2xl font-black">Test a path</h2>
            <p className="mt-2 text-sm text-muted-foreground">Resolve against the current database snapshot before publishing or debugging a rule.</p>
            <form method="get" className="mt-5">
              <label htmlFor="test-path" className="text-sm font-semibold">Incoming path</label>
              <input id="test-path" name="testPath" defaultValue={filters.testPath} placeholder="/blog/example" className={adminFieldClass} />
              <button className={`${adminPrimaryClass} mt-4 w-full`}>Test redirect</button>
            </form>
            {testResult && <div role="status" className="mt-4 rounded-md border border-accent-border bg-accent-muted p-4 font-semibold text-foreground">{testResult}</div>}
          </AdminCard>
        </section>

        <section className="mt-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div><h2 className="font-display text-3xl font-black">Rules</h2><p className="mt-1 text-sm text-muted-foreground">Showing {rows.length} of {filteredTotal} matching rules ({redirectTotal} total).</p></div>
            <form method="get" className="grid gap-3 sm:grid-cols-[minmax(14rem,1fr)_auto_auto_auto]">
              <input name="q" defaultValue={filters.q} aria-label="Search redirects" placeholder="Search source or destination" className={adminFieldClass} />
              <select name="state" defaultValue={filters.state ?? "all"} aria-label="Filter by state" className={adminFieldClass}><option value="all">All states</option><option value="active">Active</option><option value="disabled">Disabled</option></select>
              <select name="kind" defaultValue={filters.kind ?? "all"} aria-label="Filter by origin" className={adminFieldClass}><option value="all">All rules</option><option value="manual">Manual</option><option value="automatic">Automatic</option></select>
              <button className="mt-2 min-h-11 rounded-md border border-border bg-card px-4 font-semibold hover:border-catalyst">Filter</button>
            </form>
          </div>
          <div className="mt-5 grid gap-3">
            {rows.map(rule => (
              <AdminCard key={rule.id} as="article" className="p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${rule.isActive ? "bg-accent-muted text-foreground" : "bg-muted text-muted-foreground"}`}>{rule.isActive ? "Active" : "Disabled"}</span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">{rule.statusCode}</span>
                      <span className="small-caps text-muted-foreground">{rule.isAutomatic ? "Automatic" : "Manual"}</span>
                    </div>
                    <div className="mt-3 flex min-w-0 items-center gap-3 font-mono text-sm sm:text-base"><span className="truncate font-bold">{rule.sourcePath}</span><ArrowRight className="size-4 shrink-0 text-catalyst" aria-hidden="true" /><span className="truncate text-muted-foreground">{rule.destinationPath}</span></div>
                    <p className="mt-2 text-sm text-muted-foreground">{rule.description || "No description"} · {rule.hitCount.toLocaleString("en-ZA")} hits · Last hit {formatDate(rule.lastHitAt)} · Updated {formatDate(rule.updatedAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/redirects/${rule.id}`} className="inline-flex min-h-11 items-center rounded-md border border-border px-4 font-semibold hover:border-catalyst">Edit</Link>
                    <form action={setRedirectActiveAction}><input type="hidden" name="id" value={rule.id} /><input type="hidden" name="active" value={String(!rule.isActive)} /><button className="min-h-11 rounded-md border border-border px-4 font-semibold hover:border-catalyst">{rule.isActive ? "Disable" : "Enable"}</button></form>
                    <ConfirmActionForm action={deleteRedirectAction} fields={{ id: rule.id }} message={`Delete the redirect from ${rule.sourcePath}? This cannot be undone.`} label="Delete" className="min-h-11 rounded-md border border-destructive px-4 font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground" />
                  </div>
                </div>
              </AdminCard>
            ))}
            {!rows.length && <AdminCard className="p-10 text-center"><ShieldCheck className="mx-auto size-8 text-catalyst" aria-hidden="true" /><h3 className="mt-4 font-display text-xl font-black">No matching redirect rules</h3><p className="mt-2 text-muted-foreground">Adjust the filters or create the first rule above.</p></AdminCard>}
          </div>
          {redirectPages > 1 && <nav aria-label="Redirect pages" className="mt-5 flex items-center justify-between"><Link aria-disabled={page <= 1} href={{ pathname: "/admin/redirects", query: { ...filters, page: Math.max(1, page - 1) } }} className={`rounded-md border border-border px-4 py-2 font-semibold ${page <= 1 ? "pointer-events-none opacity-50" : "hover:border-catalyst"}`}>Previous</Link><span className="text-sm text-muted-foreground">Page {Math.min(page, redirectPages)} of {redirectPages}</span><Link aria-disabled={page >= redirectPages} href={{ pathname: "/admin/redirects", query: { ...filters, page: Math.min(redirectPages, page + 1) } }} className={`rounded-md border border-border px-4 py-2 font-semibold ${page >= redirectPages ? "pointer-events-none opacity-50" : "hover:border-catalyst"}`}>Next</Link></nav>}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <AdminCard as="section" className="p-6">
            <h2 id="gone-rules" className="scroll-mt-4 font-display text-2xl font-black">Return 410 Gone</h2><p className="mt-2 text-sm text-muted-foreground">Use only when content was intentionally removed and has no suitable replacement.</p>
            <form action={createGoneRuleAction} className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="gone-source" className="text-sm font-semibold">Source path</label><input id="gone-source" name="sourcePath" required placeholder="/retired-resource" className={adminFieldClass} /></div>
              <div><label htmlFor="gone-expiry" className="text-sm font-semibold">Expires (optional)</label><input id="gone-expiry" name="expiresAt" type="datetime-local" className={adminFieldClass} /></div>
              <div className="sm:col-span-2"><label htmlFor="gone-description" className="text-sm font-semibold">Description</label><input id="gone-description" name="description" className={adminFieldClass} /></div>
              <div className="sm:col-span-2 flex justify-end"><button className={adminPrimaryClass}>Create 410 rule</button></div>
            </form>
            {filters.goneSource && <Link href="/admin/redirects#gone-rules" className="mt-5 inline-block text-sm font-semibold underline">Show all 410 rules</Link>}
            <div className="mt-5 space-y-2">{goneRows.map(rule => <div key={rule.id} className="flex flex-col justify-between gap-3 rounded-md border border-border p-3 text-sm sm:flex-row sm:items-center"><span><span className="block font-mono font-semibold">{rule.sourcePath}</span><span className="mt-1 block text-xs text-muted-foreground">{!rule.isActive ? "Disabled" : rule.expiresAt && rule.expiresAt <= now ? "Expired" : "Active"} · {rule.hitCount.toLocaleString("en-ZA")} hits</span></span><div className="flex gap-2"><form action={setGoneRuleActiveAction}><input type="hidden" name="id" value={rule.id} /><input type="hidden" name="active" value={String(!rule.isActive)} /><button className="min-h-11 rounded-md border border-border px-3 font-semibold">{rule.isActive ? "Disable" : "Enable"}</button></form><ConfirmActionForm action={deleteGoneRuleAction} fields={{ id: rule.id }} message={`Delete the 410 rule for ${rule.sourcePath}?`} label="Delete" className="min-h-11 rounded-md border border-destructive px-3 font-semibold text-destructive" /></div></div>)}</div>
            {filters.goneSource && goneRows.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No 410 rule found for this URL.</p>}
            {gonePages > 1 && <nav aria-label="Gone-rule pages" className="mt-5 flex items-center justify-between"><Link aria-disabled={gonePage <= 1} href={{ pathname: "/admin/redirects", query: { ...filters, gonePage: Math.max(1, gonePage - 1) } }} className={`rounded-md border border-border px-3 py-2 font-semibold ${gonePage <= 1 ? "pointer-events-none opacity-50" : "hover:border-catalyst"}`}>Previous</Link><span className="text-xs text-muted-foreground">Page {Math.min(gonePage, gonePages)} of {gonePages}</span><Link aria-disabled={gonePage >= gonePages} href={{ pathname: "/admin/redirects", query: { ...filters, gonePage: Math.min(gonePages, gonePage + 1) } }} className={`rounded-md border border-border px-3 py-2 font-semibold ${gonePage >= gonePages ? "pointer-events-none opacity-50" : "hover:border-catalyst"}`}>Next</Link></nav>}
          </AdminCard>
          <AdminCard as="section" className="p-6">
            <div className="flex items-center gap-3"><History className="size-5 text-catalyst" aria-hidden="true" /><h2 className="font-display text-2xl font-black">Recent audit history</h2></div>
            <ol className="mt-5 space-y-3">{historyRows.map(entry => <li key={entry.id} className="border-b border-border pb-3 last:border-0"><div className="flex justify-between gap-4"><span className="font-semibold capitalize">{entry.action}</span><time className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</time></div><p className="mt-1 truncate text-sm text-muted-foreground">{entry.actor}</p></li>)}</ol>
            {!historyRows.length && <p className="mt-5 text-sm text-muted-foreground">No administrative changes have been recorded.</p>}
          </AdminCard>
        </section>
      </div>
    </main>
  );
}
