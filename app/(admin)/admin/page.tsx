import Link from "next/link";
import { requireCatalogueAdmin } from "@/lib/admin/access";
import AdminCard from "@/components/mogen/admin-card";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const email = await requireCatalogueAdmin();
  return (
    <main className="min-h-screen bg-bone px-6 py-20 text-ink lg:px-10">
      <div className="mx-auto max-w-5xl">
        <p className="small-caps text-catalyst">Mogen administration</p>
        <h1 className="mt-4 font-display text-4xl font-black">Catalogue management</h1>
        <p className="mt-3 text-sm text-ink/65">Signed in as {email}</p>
        <p className="mt-4 max-w-2xl text-ink/70">Manage published website packages and pricing, prepare promotions, and expire offers without editing SQL.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Link href="/admin/packages" className="block rounded-xl focus-visible:outline-catalyst"><AdminCard className="h-full p-8 transition-colors hover:border-catalyst">
            <h2 className="font-display text-2xl font-bold">Packages and prices</h2>
            <p className="mt-3 text-ink/70">Review the seven website packages, update scope and manage published payment choices.</p>
            <p className="mt-5 font-semibold text-catalyst">Manage packages</p></AdminCard>
          </Link>
          <Link href="/admin/promotions" className="block rounded-xl focus-visible:outline-catalyst"><AdminCard className="h-full p-8 transition-colors hover:border-catalyst">
            <h2 className="font-display text-2xl font-bold">Promotions</h2>
            <p className="mt-3 text-ink/70">Create a draft campaign, link an approved price, manage dates, feature or expire it.</p>
            <p className="mt-5 font-semibold text-catalyst">Manage promotions</p></AdminCard>
          </Link>
        </div>
      </div>
    </main>
  );
}
