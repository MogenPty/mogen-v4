import { describe, expect, it } from "vitest";
import { PACKAGES } from "@/data/packages";
import { switchEnquiryPackage, switchEnquiryPriceOption, switchEnquiryService } from "./package-selection";

const initial = {
  service: "Web Development",
  package: "sprout",
  priceOption: "sprout-managed",
  otherServiceDetail: "",
  message: "Keep all other form fields unchanged",
};

describe("contact package selection restoration", () => {
  it("restores query-selected Sprout and its billing option after SEO and back", () => {
    const seo = switchEnquiryService(initial, "SEO", {}, PACKAGES);
    expect(seo.form.package).toBe("");
    expect(seo.form.priceOption).toBe("");
    const back = switchEnquiryService(seo.form, "Web Development", seo.memory, PACKAGES);
    expect(back.form.package).toBe("sprout");
    expect(back.form.priceOption).toBe("sprout-managed");
    expect(back.form.message).toBe(initial.message);
  });

  it("remembers last choice per service; user changes override the URL package", () => {
    const seo = switchEnquiryService(initial, "SEO", {}, PACKAGES);
    const chosenSeo = switchEnquiryPackage(seo.form, "scale", seo.memory, PACKAGES);
    const back = switchEnquiryService(chosenSeo.form, "Web Development", chosenSeo.memory, PACKAGES);
    const changedWeb = switchEnquiryPackage(back.form, "seedling", back.memory, PACKAGES);
    expect(changedWeb.form.package).toBe("seedling");
    expect(changedWeb.form.priceOption).toBe("");
    const returnSeo = switchEnquiryService(changedWeb.form, "SEO", changedWeb.memory, PACKAGES);
    expect(returnSeo.form.package).toBe("scale");
    const finalWeb = switchEnquiryService(returnSeo.form, "Web Development", returnSeo.memory, PACKAGES);
    expect(finalWeb.form.package).toBe("seedling");
  });

  it("does not restore unpublished or cross-service packages", () => {
    const published = PACKAGES.filter(pkg => pkg.id !== "sprout");
    const seo = switchEnquiryService(initial, "SEO", {}, PACKAGES);
    const back = switchEnquiryService(seo.form, "Web Development", seo.memory, published);
    expect(back.form.package).toBe("");
    expect(switchEnquiryPackage(seo.form, "budding", seo.memory, published).form.package).toBe("");
  });

  it("clears a manual package selection when the visitor selects no package", () => {
    const selected = switchEnquiryPackage(initial, "", {}, PACKAGES);
    expect(selected.form.package).toBe("");
    expect(selected.form.priceOption).toBe("");
  });

  it("restores a visitor-changed billing option after switching Web -> SEO -> Web", () => {
    const selected = switchEnquiryPriceOption(initial, "sprout-self-hosted", {}, [
      "sprout-managed-monthly", "sprout-managed-annual", "sprout-self-hosted",
    ]);
    expect(selected.form.priceOption).toBe("sprout-self-hosted");
    const seo = switchEnquiryService(selected.form, "SEO", selected.memory, PACKAGES);
    expect(seo.form.priceOption).toBe("");
    const back = switchEnquiryService(seo.form, "Web Development", seo.memory, PACKAGES);
    expect(back.form.package).toBe("sprout");
    expect(back.form.priceOption).toBe("sprout-self-hosted");
  });

  it("rejects an option not listed for the selected package", () => {
    const changed = switchEnquiryPriceOption(initial, "flowering-self-hosted", {}, ["sprout-managed-monthly"]);
    expect(changed.form.priceOption).toBe("");
  });
});
