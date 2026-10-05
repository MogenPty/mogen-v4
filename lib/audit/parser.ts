/**
 * HTML parsing for the SEO analyser (Cheerio — server-returned HTML only,
 * no headless browser).
 */

import * as cheerio from "cheerio";

export interface ParsedImage {
  src: string | null;
  alt: string | null;
  width: string | null;
  height: string | null;
}

export interface ParsedLink {
  href: string;
  text: string;
  rel: string | null;
  external: boolean;
}

export interface JsonLdBlock {
  /** Raw script content (truncated for evidence). */
  raw: string;
  parsed: unknown | null;
  parseError: string | null;
}

export interface PageData {
  url: string;
  status: number;
  title: string | null;
  metaDescription: string | null;
  robotsMeta: string | null;
  canonical: string | null;
  viewport: string | null;
  lang: string | null;
  charset: string | null;
  headings: { h1: string[]; h2: string[]; h3: string[]; h4: string[]; h5: string[]; h6: string[] };
  images: ParsedImage[];
  links: ParsedLink[];
  og: Record<string, string>;
  twitter: Record<string, string>;
  jsonLd: JsonLdBlock[];
  visibleText: string;
  /** Same-origin <a href> targets (fragments removed, binaries excluded). */
  outlinks: string[];
  hasFaq: boolean;
  phone: string | null;
  email: string | null;
  addressText: string | null;
}

const BINARY_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|ico|zip|rar|mp4|mp3|avi|mov|wmv|exe|dmg|css|js|woff2?|ttf|eot|xml|json|txt)(\?|#|$)/i;

export function isCrawlableHref(href: string): boolean {
  if (href === "" || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  if (/^(javascript|data|blob|ftp|file):/i.test(href)) return false;
  if (BINARY_EXT.test(href.split("?")[0].split("#")[0])) return false;
  return true;
}

function textOf($: cheerio.CheerioAPI, selector: string): string[] {
  const out: string[] = [];
  $(selector).each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t !== "") out.push(t);
  });
  return out;
}

export function parsePage(url: string, status: number, html: string): PageData {
  const $ = cheerio.load(html);
  // NOTE: do not remove <script> here — JSON-LD blocks are extracted below.
  // Visible text is computed from a separate clone that drops scripts.
  $("style, noscript").remove();

  const title = $("title").first().text().trim() || null;
  const metaDescription = $('meta[name="description"]').first().attr("content")?.trim() || null;
  const robotsMeta = $('meta[name="robots"]').first().attr("content")?.trim() || null;
  const canonical = $('link[rel="canonical"]').first().attr("href")?.trim() || null;
  const viewport = $('meta[name="viewport"]').first().attr("content")?.trim() || null;
  const lang = $("html").first().attr("lang")?.trim() || null;
  const charset =
    $('meta[charset]').first().attr("charset")?.trim() ||
    $('meta[http-equiv="content-type" i]').first().attr("content")?.trim() ||
    null;

  const headings = {
    h1: textOf($, "h1"),
    h2: textOf($, "h2"),
    h3: textOf($, "h3"),
    h4: textOf($, "h4"),
    h5: textOf($, "h5"),
    h6: textOf($, "h6"),
  };

  const images: ParsedImage[] = [];
  $("img").each((_, el) => {
    images.push({
      src: $(el).attr("src") ?? null,
      alt: $(el).attr("alt") ?? null,
      width: $(el).attr("width") ?? null,
      height: $(el).attr("height") ?? null,
    });
  });

  const pageOrigin = new URL(url).origin;
  const links: ParsedLink[] = [];
  const outlinks: string[] = [];
  const seenOut = new Set<string>();
  $("a[href]").each((_, el) => {
    const rawHref = ($(el).attr("href") ?? "").trim();
    if (rawHref === "") return;
    const rel = $(el).attr("rel")?.trim().toLowerCase() || null;
    const text = $(el).text().replace(/\s+/g, " ").trim().slice(0, 120);
    let external = true;
    let absolute: URL | null = null;
    try {
      absolute = new URL(rawHref, url);
      external = absolute.origin !== pageOrigin;
    } catch {
      external = true;
    }
    links.push({ href: rawHref, text, rel, external });
    if (!external && absolute && isCrawlableHref(rawHref)) {
      absolute.hash = "";
      const normalized = absolute.toString();
      if (!seenOut.has(normalized)) {
        seenOut.add(normalized);
        outlinks.push(normalized);
      }
    }
  });

  const og: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr("property")?.trim();
    const content = $(el).attr("content")?.trim();
    if (prop && content) og[prop] = content;
  });
  const twitter: Record<string, string> = {};
  $('meta[name^="twitter:"]').each((_, el) => {
    const name = $(el).attr("name")?.trim();
    const content = $(el).attr("content")?.trim();
    if (name && content) twitter[name] = content;
  });

  const jsonLd: JsonLdBlock[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = ($(el).html() ?? "").trim().slice(0, 8000);
    if (raw === "") return;
    try {
      const parsed: unknown = JSON.parse(raw);
      jsonLd.push({ raw, parsed, parseError: null });
    } catch (error) {
      jsonLd.push({
        raw,
        parsed: null,
        parseError: error instanceof Error ? error.message.slice(0, 200) : "parse error",
      });
    }
  });

  // Visible text: drop nav/header/footer/aside to reduce boilerplate noise.
  const clone = cheerio.load(html);
  clone("script, style, noscript, nav, header, footer, aside").remove();
  const visibleText = clone("body").text().replace(/\s+/g, " ").trim().slice(0, 20000);

  // FAQ signals: details/summary, FAQPage JSON-LD, or FAQ-ish headings.
  const hasFaqMarkup = $("details summary").length > 0;
  const hasFaqLd = jsonLd.some((b) => JSON.stringify(b.parsed ?? {}).includes("FAQPage"));
  const faqHeading = /frequently asked questions|\bfaqs?\b/i.test(
    [...headings.h2, ...headings.h3].join(" "),
  );
  const hasFaq = hasFaqMarkup || hasFaqLd || faqHeading;

  // NAP signals (observed on website — NOT GBP-verified).
  const bodyText = $("body").text();
  const phoneMatch = bodyText.match(/(\+27[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}|0\d{2}[\s-]?\d{3}[\s-]?\d{4})/);
  const emailMatch =
    $('a[href^="mailto:"]').first().attr("href")?.replace(/^mailto:/i, "").split("?")[0] ??
    bodyText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ??
    null;
  const addressEl = $(
    "address, [itemprop='address'], .address, .location-address, footer",
  )
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
  const addressText = addressEl !== "" ? addressEl : null;

  return {
    url,
    status,
    title,
    metaDescription,
    robotsMeta,
    canonical,
    viewport,
    lang,
    charset,
    headings,
    images,
    links,
    og,
    twitter,
    jsonLd,
    visibleText,
    outlinks,
    hasFaq,
    phone: phoneMatch?.[1]?.trim() ?? phoneMatch?.[0]?.trim() ?? null,
    email: emailMatch,
    addressText,
  };
}
