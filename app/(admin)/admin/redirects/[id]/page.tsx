import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import AdminCard, { adminFieldClass, adminPrimaryClass } from "@/components/mogen/admin-card";
import { getCatalogueDb } from "@/db/client";
import { redirectRules } from "@/db/schema";
import { requireCatalogueAdmin } from "@/lib/admin/access";
import { updateRedirectAction } from "@/lib/admin/redirect-actions";

export const dynamic = "force-dynamic";
const localDate = (value: Date | null) => value
  ? new Date(value.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)
  : "";

export default async function EditRedirectPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireCatalogueAdmin();
  const { id } = await params;
  const [rule] = await getCatalogueDb().select().from(redirectRules).where(eq(redirectRules.id, id)).limit(1);
  if (!rule) notFound();
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/redirects" className="font-semibold text-catalyst hover:underline">← All redirects</Link>
        <p className="small-caps mt-8 text-catalyst">{rule.isAutomatic ? "Automatic rule" : "Manual rule"}</p>
        <h1 className="mt-3 font-display text-4xl font-black">Edit redirect</h1>
        <p className="mt-3 text-muted-foreground">Changes are validated for protected routes, chains and loops before the cache is invalidated.</p>
        <AdminCard className="mt-8 p-6 sm:p-8">
          <form action={updateRedirectAction} className="grid gap-5 sm:grid-cols-2">
            <input type="hidden" name="id" value={rule.id} />
            <div><label htmlFor="edit-source" className="text-sm font-semibold">Source path</label><input id="edit-source" name="sourcePath" defaultValue={rule.sourcePath} required className={adminFieldClass} /></div>
            <div><label htmlFor="edit-destination" className="text-sm font-semibold">Destination path</label><input id="edit-destination" name="destinationPath" defaultValue={rule.destinationPath} required className={adminFieldClass} /></div>
            <div><label htmlFor="edit-status" className="text-sm font-semibold">HTTP status</label><select id="edit-status" name="statusCode" defaultValue={String(rule.statusCode)} className={adminFieldClass}><option value="301">301 Permanent</option><option value="308">308 Permanent, method preserved</option><option value="302">302 Temporary</option><option value="307">307 Temporary, method preserved</option></select></div>
            <div><label htmlFor="edit-expiry" className="text-sm font-semibold">Expires (optional, SAST)</label><input id="edit-expiry" name="expiresAt" type="datetime-local" defaultValue={localDate(rule.expiresAt)} className={adminFieldClass} /></div>
            <div className="sm:col-span-2"><label htmlFor="edit-description" className="text-sm font-semibold">Description</label><textarea id="edit-description" name="description" rows={4} defaultValue={rule.description} className={adminFieldClass} /></div>
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" name="preserveQuery" defaultChecked={rule.preserveQuery} /> Preserve query string</label>
            <div className="flex justify-end"><button className={adminPrimaryClass}>Save redirect</button></div>
          </form>
        </AdminCard>
      </div>
    </main>
  );
}
