import { notFound } from "next/navigation";
import { scheduleNotFound } from "@/lib/redirects/not-found";

export const dynamic = "force-dynamic";

export default async function MissingPublicPage({ params }: Readonly<{ params: Promise<{ missing: string[] }> }>) {
  const { missing } = await params;
  await scheduleNotFound(`/${missing.map(segment => encodeURIComponent(segment)).join("/")}`);
  notFound();
}
