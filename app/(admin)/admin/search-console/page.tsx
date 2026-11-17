import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CheckCircle2, SearchCheck, Upload } from "lucide-react";
import AdminCard, { adminFieldClass, adminPrimaryClass } from "@/components/mogen/admin-card";
import ConfirmActionForm from "@/components/mogen/confirm-action-form";
import { getCatalogueDb } from "@/db/client";
import { searchConsoleImportRows, searchConsoleImports } from "@/db/schema";
import { requireCatalogueAdmin } from "@/lib/admin/access";
import { importSearchConsoleCsvAction, skipSearchConsoleRowAction } from "@/lib/admin/redirect-actions";

export const dynamic = "force-dynamic";
const formatDate = (value: Date) => new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(value);

export default async function SearchConsolePage({ searchParams }: Readonly<{
  searchParams: Promise<{ import?: string }>;
}>) {
  await requireCatalogueAdmin();
  const filters = await searchParams;
  const db = getCatalogueDb();
  const imports = await db.select().from(searchConsoleImports).orderBy(desc(searchConsoleImports.createdAt)).limit(30);
  const selectedId = filters.import ?? imports[0]?.id;
  const rows = selectedId
    ? await db.select().from(searchConsoleImportRows).where(eq(searchConsoleImportRows.importId, selectedId)).orderBy(desc(searchConsoleImportRows.createdAt))
    : [];
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <p className="small-caps text-catalyst">Indexing review</p><h1 className="mt-3 font-display text-4xl font-black sm:text-5xl">Search Console workflow</h1><p className="mt-3 max-w-3xl text-muted-foreground">Import exported URL reports for review. Suggestions require an exact known relationship; no report row creates a redirect until an administrator approves it in the redirect manager.</p>
        <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <AdminCard as="section" className="p-6">
            <div className="flex items-center gap-3"><Upload className="size-5 text-catalyst" aria-hidden="true" /><h2 className="font-display text-2xl font-black">Import report</h2></div>
            <form action={importSearchConsoleCsvAction} className="mt-5"><label htmlFor="gsc-file" className="text-sm font-semibold">Google Search Console CSV</label><input id="gsc-file" name="file" type="file" accept=".csv,text/csv" required className={adminFieldClass} /><p className="mt-3 text-sm text-muted-foreground">Recognized URL columns include URL, Page and Path. Mogen URLs are normalized without query strings and deduplicated.</p><button className={`${adminPrimaryClass} mt-5 w-full`}>Stage report for review</button></form>
          </AdminCard>
          <AdminCard as="section" className="p-6">
            <div className="flex items-center gap-3"><SearchCheck className="size-5 text-catalyst" aria-hidden="true" /><h2 className="font-display text-2xl font-black">Imported reports</h2></div>
            <div className="mt-5 space-y-2">{imports.map(item => <Link key={item.id} href={`/admin/search-console?import=${item.id}`} className={`flex min-h-14 items-center justify-between rounded-md border p-3 ${selectedId === item.id ? "border-catalyst bg-accent-muted" : "border-border hover:border-catalyst"}`}><span><span className="block font-semibold">{item.filename}</span><span className="mt-1 block text-xs text-muted-foreground">{formatDate(item.createdAt)} · {item.importedBy}</span></span><span className="small-caps">{item.rowCount} URLs</span></Link>)}</div>
            {!imports.length && <p className="mt-5 text-sm text-muted-foreground">No Search Console reports have been imported.</p>}
          </AdminCard>
        </section>
        {selectedId && <section className="mt-8"><div className="flex items-end justify-between gap-4"><div><h2 className="font-display text-3xl font-black">Review URLs</h2><p className="mt-2 text-sm text-muted-foreground">{rows.filter(row => row.status === "pending").length} rows still require a decision.</p></div></div><div className="mt-5 grid gap-3">{rows.map(row => <AdminCard key={row.id} as="article" className="p-5"><div className="flex flex-col gap-5 xl:flex-row xl:items-center"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold capitalize">{row.status}</span>{row.suggestedDestination && <CheckCircle2 className="size-4 text-catalyst" aria-label="Reliable suggestion available" />}</div><h3 className="mt-3 truncate font-mono font-bold">{row.sourcePath}</h3>{row.suggestedDestination && <p className="mt-2 font-mono text-sm text-catalyst">→ {row.suggestedDestination}</p>}<p className="mt-2 text-sm text-muted-foreground">{row.suggestionReason}</p></div>{row.status === "pending" && <div className="flex flex-wrap gap-2">{row.suggestedDestination && <Link href={`/admin/redirects?sourcePath=${encodeURIComponent(row.sourcePath)}&destinationPath=${encodeURIComponent(row.suggestedDestination)}&gscRowId=${row.id}`} className={adminPrimaryClass}>Review redirect</Link>}<ConfirmActionForm action={skipSearchConsoleRowAction} fields={{ id: row.id }} message={`Mark ${row.sourcePath} as reviewed with no redirect?`} label="No redirect" className="min-h-11 rounded-md border border-border px-4 font-semibold hover:border-catalyst" /></div>}</div></AdminCard>)}</div></section>}
      </div>
    </main>
  );
}
