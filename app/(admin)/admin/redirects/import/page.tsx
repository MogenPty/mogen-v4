import Link from "next/link";
import AdminCard, { adminFieldClass, adminPrimaryClass } from "@/components/mogen/admin-card";
import { requireCatalogueAdmin } from "@/lib/admin/access";
import { importRedirectCsvAction } from "@/lib/admin/redirect-actions";

export const dynamic = "force-dynamic";

export default async function ImportRedirectsPage() {
  await requireCatalogueAdmin();
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/redirects" className="font-semibold text-catalyst hover:underline">← Redirect manager</Link>
        <p className="small-caps mt-8 text-catalyst">Bulk workflow</p>
        <h1 className="mt-3 font-display text-4xl font-black">Import redirect CSV</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Rows are normalized, deduplicated and validated as one set. If any row conflicts, creates a chain, or targets an internal route, nothing is written.</p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <AdminCard className="p-6 sm:p-8">
            <form action={importRedirectCsvAction}>
              <label htmlFor="redirect-csv" className="text-sm font-semibold">CSV file</label>
              <input id="redirect-csv" name="file" type="file" accept=".csv,text/csv" required className={adminFieldClass} />
              <p className="mt-3 text-sm text-muted-foreground">Maximum 1 MB and 1,000 rows. This action creates audit records for every accepted route.</p>
              <button className={`${adminPrimaryClass} mt-6 w-full`}>Validate and import</button>
            </form>
          </AdminCard>
          <AdminCard as="section" className="p-6">
            <h2 className="font-display text-2xl font-black">Required format</h2>
            <p className="mt-3 text-sm text-muted-foreground">Required headers: <code>sourcePath</code> and <code>destinationPath</code>. Optional: <code>statusCode</code>, <code>preserveQuery</code>, <code>isActive</code>, <code>expiresAt</code>, <code>description</code>.</p>
            <pre className="mt-5 overflow-x-auto rounded-md bg-muted p-4 text-xs text-foreground">{`sourcePath,destinationPath,statusCode,description\n/blog/*,/articles/*,308,Legacy blog\n/old-contact,/contact,301,Old campaign URL`}</pre>
            <p className="mt-4 text-sm text-muted-foreground">Both <code>/blog/*</code> and the canonical <code>/blog/:path*</code> syntax are accepted.</p>
          </AdminCard>
        </div>
      </div>
    </main>
  );
}
