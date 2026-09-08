import ServiceDetail from "@/components/mogen/service-detail";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ServiceDetailPage({ params }: Readonly<Props>) {
  const { slug } = await params;

  return <ServiceDetail serviceSlug={slug} />;
}
