import ConversionBar from "@/components/mogen/conversation-bar";
import Footer from "@/components/mogen/footer";
import Nav from "@/components/mogen/nav";
import Services from "@/components/mogen/services";
import { pageMetadata } from "@/lib/seo";
import { STATIC_META } from "@/lib/seo/metadata-registry";

export const metadata = pageMetadata({
  path: "/services",
  title: STATIC_META["/services"].title,
  description: STATIC_META["/services"].description,
});

export default function ServicesIndexPage() {
  return (
    <div className="bg-bone">
      <Nav defaultServiceSlug="web-development" />
      <main>
        <Services numbering={2} auditHref="/services/seo#audit" />
      </main>
      <Footer defaultServiceSlug="web-development" />
      <ConversionBar defaultServiceSlug="web-development" />
    </div>
  );
}
