export interface Post {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  date: string;
  readTime: string;
  author: string;
  body: string;
  /**
   * Explicit editorial flag — the latest post with `featured: true` is
   * shown in the prominent top position on /articles (page 1 only).
   * Never hardcode a slug; selection is date-ordered (see below).
   */
  featured?: boolean;
}

export const ARTICLES_PAGE_SIZE = 9;

export const POSTS: Post[] = [
  {
    slug: "local-seo-pretoria-2026",
    featured: true,
    title: "The 2026 Local SEO Playbook for Pretoria Businesses",
    category: "Growth Advice",
    excerpt:
      "Google's local results reward relevance, proximity and prominence. Here's how Pretoria businesses can win the map pack this year.",
    date: "2026-08-18",
    readTime: "8 min read",
    author: "Mogen SEO Team",
    body: `Most Pretoria customers never scroll past the map pack. If your business isn't in those top three pins, you're invisible at the exact moment someone is ready to buy.

### Start with your Google Business Profile

Your GBP is the single highest-leverage local SEO asset you own. Complete every field, upload fresh photos monthly, and select accurate primary and secondary categories. Businesses with complete profiles receive up to 7× more clicks than incomplete ones.

### Build citations that match

Your name, address and phone number must be identical everywhere they appear — your site, directories, and social profiles. Inconsistent NAP data confuses Google's local index and drags you down the rankings.

### Earn proximity through reviews

Reviews are the trust signal that converts. Ask every happy customer for a review, respond to every one (good and bad) within 24 hours, and mention your service and city naturally in your responses.

### Create local content

Write about Pretoria. Cover the suburbs you serve, the events you sponsor, the local problems you solve. Local content earns local links and tells Google exactly who you help.`,
  },
  {
    slug: "core-web-vitals-guide",
    title: "Core Web Vitals: The Speed Signals Google Rewards",
    category: "Article",
    excerpt:
      "LCP, INP and CLS are now ranking signals. Here's what each measures and the fastest fixes for South African sites.",
    date: "2026-08-04",
    readTime: "6 min read",
    author: "Mogen Engineering",
    body: `Speed is no longer a nice-to-have — it's a ranking factor. Google's Core Web Vitals measure how your site *feels* to real users.

### LCP — Largest Contentful Paint

This measures how long the biggest visible element takes to load. Aim for under 2.5 seconds. Compress images to WebP, preload your hero image, and use a CDN to serve assets close to South African users.

### INP — Interaction to Next Paint

INP replaced FID and measures responsiveness across the whole page visit. Keep it under 200ms. Break up long JavaScript tasks, defer non-critical scripts, and avoid heavy third-party tags.

### CLS — Cumulative Layout Shift

CLS measures visual stability. Keep it under 0.1. Always set width and height on images and embeds, and reserve space for ads so content doesn't jump as it loads.

### The fix that beats them all

A lean, well-built site wins all three. We build every Mogen site to pass Core Web Vitals by default — fast hosting, optimised assets, and zero layout shift.`,
  },
  {
    slug: "restaurant-website-bookings-guide",
    title: "How Restaurants Can Use a Website to Generate More Bookings",
    category: "Growth Advice",
    excerpt:
      "A practical guide for restaurants on structuring a website, menu and booking path to support local discovery.",
    date: "2026-07-22",
    readTime: "5 min read",
    author: "Mogen Growth Team",
    body: `Many restaurants rely on social profiles and word of mouth. A well-structured website makes it easier for new customers to find the menu, understand the offering, and make a booking.

### Make the menu easy to find

Publish a complete, mobile-friendly menu with clear categories, pricing and photos. Customers who can quickly review the menu are more likely to enquire or book.

### Structure the booking path

Place a clear booking or contact action near the top of the page. A one-tap WhatsApp link or short form reduces friction compared to asking customers to search for a phone number.

### Support local discovery

Complete the Google Business Profile, keep hours and contact details accurate, and ensure the name, address and phone number are consistent across directories. Add locally relevant content, such as the areas served.

### Collect and respond to reviews

Request reviews systematically and respond to each one. Reviews help prospective customers evaluate the business and reinforce visibility.

A fast, mobile-first site that combines these elements supports both conversion and local search without relying on unverified outcome claims.`,
  },
  {
    slug: "landing-page-conversion",
    title: "7 Landing Page Tweaks That Lift Conversions",
    category: "Growth Advice",
    excerpt:
      "Small changes, big lifts. Seven conversion improvements we deploy on every Mogen landing page.",
    date: "2026-07-09",
    readTime: "7 min read",
    author: "Mogen Growth Team",
    body: `> Traffic is expensive. Wasting it on a page that doesn't convert is more expensive. These seven tweaks consistently lift conversion rates.

### 1. One action per page

Decide the single thing you want a visitor to do, then make everything on the page point to it. Multiple competing calls split attention and kill conversions.

### 2. Above-the-fold form

If the goal is a lead, put the form where people can see it without scrolling. The first screen does the heavy lifting.

### 3. Reduce form fields

Ask only for what you need to follow up. Every extra field lowers completion. Name and email is often enough to start a conversation.

### 4. Social proof early

Reviews, logos and star ratings belong high on the page — not buried at the bottom. People decide fast.

### 5. A clear, specific headline

"Get found on Google" beats "Digital solutions for your business." Specificity converts.

### 6. Speed

A one-second delay can cut conversions by 20%. Fast pages make money.

### 7. A single, repeated CTA

Repeat your call to action in the same words throughout the page. Repetition builds confidence.`,
  },
  {
    slug: "google-business-profile-guide",
    title: "Google Business Profile: The Free Local Lead Engine",
    category: "Article",
    excerpt:
      "Your Google Business Profile is the highest-ROI free marketing tool you have. Here's how to use it properly.",
    date: "2026-06-28",
    readTime: "6 min read",
    author: "Mogen SEO Team",
    body: `A well-run Google Business Profile generates more local leads than most paid ads — and it's completely free.

### Complete every field

Fill out every section Google offers: hours, services, products, attributes, service area, and opening dates. Completeness is a ranking signal.

### Post regularly

GBP posts expire, so Google rewards fresh activity. Post weekly — specials, events, new products. It signals an active business.

### Reviews are the engine

Ask systematically. Reply to every review. Mention your service and location. Reviews drive both rankings and click-through.

### Photos matter

Businesses with 100+ photos get significantly more direction requests and calls. Show your space, your team, your work.

### Track the data

GBP Insights tells you exactly how people found you and what they did next. It's a free conversion report — use it.`,
  },
  {
    slug: "local-seo-clinic-guide",
    title: "How Clinics Can Improve Local Visibility on Google",
    category: "Growth Advice",
    excerpt:
      "An educational guide for clinics on improving local search foundations — from profile optimisation to content.",
    date: "2026-06-15",
    readTime: "5 min read",
    author: "Mogen Growth Team",
    body: `Clinics depend on local discovery. Patients typically search for a nearby provider and choose from the top results.

### Complete the Google Business Profile

Select accurate primary and secondary categories, list services clearly, and keep hours, contact details and service areas up to date. Add recent photos of the practice.

### Address technical foundations

Ensure the site is fast, mobile-friendly and crawlable. Consistent name, address and phone information across directories supports local relevance.

### Create patient-centred content

Publish content that answers common patient questions — services offered, what to expect at an appointment, and areas served. Locally relevant content supports both ranking and trust.

### Strengthen enquiry paths

Make appointment requests simple: a visible contact form or click-to-call, clear service pages, and confirmation that enquiries are received.

These steps form a practical local SEO foundation for clinics without relying on specific ranking or business outcome claims.`,
  },
];

export const getPost = (slug: string) => POSTS.find((p) => p.slug === slug);

/**
 * Articles listing helpers for /articles (newest-first + featured + pagination).
 * All ordering uses the existing `date` field (YYYY-MM-DD); never array,
 * filesystem or slug order. Secondary ordering is deterministic by slug.
 */

/** Sort posts newest-first by `date`; ties broken deterministically by slug. */
export function sortPostsByDateDesc(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.slug.localeCompare(b.slug);
  });
}

/** Latest explicitly featured article (newest `date` among `featured: true`). */
export function getLatestFeaturedPost(posts: Post[] = POSTS): Post | undefined {
  const featured = posts.filter((p) => p.featured === true);
  if (featured.length === 0) return undefined;
  return sortPostsByDateDesc(featured)[0];
}

/**
 * Normal article collection: newest-first, with the latest featured article
 * excluded so it is never duplicated below the prominent position.
 * When no featured article exists, this is simply all posts newest-first.
 */
export function getRegularPosts(posts: Post[] = POSTS): Post[] {
  const featured = getLatestFeaturedPost(posts);
  const sorted = sortPostsByDateDesc(posts);
  if (!featured) return sorted;
  return sorted.filter((p) => p.slug !== featured.slug);
}

export interface PaginatedResult {
  items: Post[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

/** Safely parse a `?page=` value. Invalid → 1. */
export function parsePageParam(value: unknown): number {
  if (typeof value === "string") {
    if (!/^\d+$/.test(value.trim())) return 1;
    const n = Number.parseInt(value.trim(), 10);
    return Number.isSafeInteger(n) && n >= 1 ? n : 1;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return 1;
  return n;
}

export interface GetArticlesOptions {
  page?: number;
  pageSize?: number;
  posts?: Post[];
}

/**
 * Data-level pagination for the normal listing.
 * IMPORTANT: the featured article is excluded BEFORE pagination so page
 * sizes stay consistent and no article goes missing.
 */
export function getArticles({
  page = 1,
  pageSize = ARTICLES_PAGE_SIZE,
  posts = POSTS,
}: GetArticlesOptions = {}): PaginatedResult {
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : ARTICLES_PAGE_SIZE;
  const regular = getRegularPosts(posts);
  const totalItems = regular.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / safePageSize);
  const currentPage = totalItems === 0 ? 1 : Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (currentPage - 1) * safePageSize;
  return {
    items: regular.slice(start, start + safePageSize),
    totalItems,
    totalPages,
    currentPage,
    pageSize: safePageSize,
  };
}

/** Condensed page numbers, e.g. [1, 2, 3, "…", 8] for large libraries. */
export function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, current - 1, current, current + 1, total - 1, total]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev !== 0 && n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

/**
 * Clean pagination URLs compatible with the existing Next.js architecture:
 * `/articles` for page 1, `/articles?page=N` otherwise.
 * Any other legitimate query params are preserved; `page` is replaced.
 */
export function buildArticlesPageUrl(
  page: number,
  preservedParams?: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  if (preservedParams) {
    for (const [key, value] of Object.entries(preservedParams)) {
      if (key === "page" || value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) params.append(key, v);
      } else {
        params.set(key, value);
      }
    }
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/articles?${query}` : "/articles";
}
