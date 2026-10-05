import { describe, expect, it } from "vitest";
import { parsePage } from "./parser";

const FIXTURE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Example Services | Example</title>
<meta name="description" content="Example description of a reasonable length for search results display here.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://example.com/services">
<meta property="og:title" content="Example Services">
<meta property="og:description" content="Example description">
<meta property="og:image" content="https://example.com/og.png">
<meta property="og:url" content="https://example.com/services">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Example Services">
<meta name="twitter:description" content="Example description">
<meta name="twitter:image" content="https://example.com/og.png">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Example"}</script>
</head>
<body>
<nav><a href="/">Home</a></nav>
<h1>Our services</h1>
<h2>Websites</h2>
<p>Call us on <a href="mailto:info@example.com">info@example.com</a> or 012 345 6789.</p>
<img src="/hero.jpg" alt="Team at work" width="1200" height="630">
<img src="/badge.png" alt="">
<a href="/about">About us</a>
<a href="https://partner.example.net" rel="nofollow">Partner</a>
<a href="/report.pdf">Report</a>
</body>
</html>`;

describe("parser", () => {
  it("extracts document, SEO metadata, and social tags", () => {
    const page = parsePage("https://example.com/services", 200, FIXTURE);
    expect(page.title).toBe("Example Services | Example");
    expect(page.metaDescription).toContain("Example description");
    expect(page.robotsMeta).toBe("index, follow");
    expect(page.canonical).toBe("https://example.com/services");
    expect(page.viewport).toContain("width=");
    expect(page.lang).toBe("en");
    expect(page.charset).toBe("utf-8");
    expect(page.og["og:title"]).toBe("Example Services");
    expect(page.twitter["twitter:card"]).toBe("summary_large_image");
  });

  it("extracts headings, images, and links", () => {
    const page = parsePage("https://example.com/services", 200, FIXTURE);
    expect(page.headings.h1).toEqual(["Our services"]);
    expect(page.headings.h2).toEqual(["Websites"]);
    expect(page.images).toHaveLength(2);
    expect(page.images[0].alt).toBe("Team at work");
    expect(page.links.some((l) => l.href === "/about" && !l.external)).toBe(true);
    const external = page.links.find((l) => l.href.startsWith("https://partner"));
    expect(external?.external).toBe(true);
    expect(external?.rel).toBe("nofollow");
  });

  it("collects same-origin crawlable outlinks and skips binaries", () => {
    const page = parsePage("https://example.com/services", 200, FIXTURE);
    expect(page.outlinks).toContain("https://example.com/about");
    expect(page.outlinks.some((u) => u.endsWith(".pdf"))).toBe(false);
    expect(page.outlinks.some((u) => u.includes("partner.example.net"))).toBe(false);
    expect(page.outlinks.some((u) => u.includes("#"))).toBe(false);
  });

  it("parses JSON-LD blocks", () => {
    const page = parsePage("https://example.com/services", 200, FIXTURE);
    expect(page.jsonLd).toHaveLength(1);
    expect(page.jsonLd[0].parseError).toBeNull();
    expect(JSON.stringify(page.jsonLd[0].parsed)).toContain("LocalBusiness");
  });

  it("records JSON-LD syntax failures", () => {
    const page = parsePage(
      "https://example.com/broken",
      200,
      '<html><head><script type="application/ld+json">{not json</script></head><body></body></html>',
    );
    expect(page.jsonLd).toHaveLength(1);
    expect(page.jsonLd[0].parsed).toBeNull();
    expect(page.jsonLd[0].parseError).not.toBeNull();
  });

  it("observes NAP signals", () => {
    const page = parsePage("https://example.com/services", 200, FIXTURE);
    expect(page.email).toBe("info@example.com");
    expect(page.phone).not.toBeNull();
  });
});
