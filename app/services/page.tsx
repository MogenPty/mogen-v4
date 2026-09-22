import type { Metadata } from "next";
import Services from "@/components/mogen/services";
import ConversionBar from "@/components/mogen/conversation-bar";
import Footer from "@/components/mogen/footer";
import Nav from "@/components/mogen/nav";

export const metadata: Metadata = {
  title: "Services — Mogen",
  description:
    "Four services, clearly scoped — Web Development, SEO, Digital Marketing and Business Documentation. Each a distinct offering so you know what you are paying for.",
};

export default function ServicesIndexPage() {
  return (
    <div className="bg-bone">
      <Nav />
      <main>
        <Services />
      </main>
      <Footer />
      <ConversionBar />
    </div>
  );
}
