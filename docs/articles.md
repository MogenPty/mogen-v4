# Articles (MDX)

Articles are filesystem-based `.mdx` files. The MDX file is the single source
of truth for an article's content, title, description, slug, publication date,
category, tags, hero image and article-specific metadata. The application
provides routing, rendering, image optimization, metadata generation, listing,
validation and structured data.

## Where articles go

- Content: `/articles/*.mdx` (content storage, NOT an App Router route)
- Images: `/public/images/articles/*` (web path `/images/articles/*`)
- Route: `/articles` (index) and `/articles/[slug]` (detail)
- Loader: `lib/articles/` (`types.ts`, `loader.ts`, `metadata.ts`)
- MDX registry: `mdx-components.tsx` (project root, required by `@next/mdx`)

Do not put route files inside `/articles`. The route lives at
`app/articles/page.tsx` and `app/articles/[slug]/page.tsx`.

Frontmatter never renders as article content: `remark-frontmatter` is wired
in `next.config.ts` so the `---` fences and YAML lines are stripped from the
rendered MDX (`@next/mdx` does not strip frontmatter by default). Metadata
is parsed separately with `gray-matter` in `lib/articles/loader.ts`.

`/blog` is not canonical. It permanently redirects to `/articles`
(see `next.config.ts`); do not reintroduce it.

## Required frontmatter

```yaml
---
title: "Web Development in the Brits Area"
slug: "web-development-brits"
description: "Professional web development for businesses in Brits and surrounding areas."
publishedAt: "2026-10-07"
---
```

Full model (`lib/articles/types.ts`):

| Field         | Required | Notes                                              |
| ------------- | -------- | -------------------------------------------------- |
| `title`       | yes      | Page + OG title, JSON-LD headline                  |
| `slug`        | yes      | Must equal the filename (without `.mdx`)          |
| `description` | yes      | Page + OG description, card excerpt, JSON-LD       |
| `publishedAt` | yes      | `YYYY-MM-DD`; listing order is newest-first        |
| `updatedAt`   | no       | `YYYY-MM-DD`; shown as "Updated" when present     |
| `author`      | no       | Defaults to `Mogen`                                |
| `category`    | no       | Defaults to `Article`                              |
| `tags`        | no       | String list                                        |
| `featured`    | no       | Latest `featured: true` leads `/articles` (page 1) |
| `services`    | no       | Stable service slugs (see below); inferred when absent |
| `heroImage`   | no       | Web path under `/images/articles/`                 |
| `heroImageAlt`| no       | Alt for the hero image                             |
| `draft`       | no       | `true` hides from listing, sitemap and indexing    |
| `readTime`    | no       | Computed from body (~200 wpm) when absent         |

## Publication dates, drafts and scheduling

- `publishedAt` is **required** (`YYYY-MM-DD`). A file without a valid
  `publishedAt` fails validation loudly — it is never silently hidden.
- An article is publicly published only when it is **not a draft** and its
  `publishedAt` has **arrived**, interpreted as **midnight at the start of
  that date in `Africa/Johannesburg`** (SAST, UTC+2, no DST). As UTC this is
  `Date.UTC(y, m - 1, d) - 2h`. Parsing uses integer components only, so
  browser, server and UTC behaviour agree — see
  `lib/articles/publication.ts` (`isArticlePublished()`).
- Future-dated (scheduled) articles are excluded from **every** public
  surface: `/articles`, tag archives, service-page related articles, the
  sitemap, and direct `/articles/<slug>` requests (which 404 until
  publication — the 404 guard runs before the MDX body import, so neither
  content nor metadata leaks early).
- **No redeploy needed for scheduled dates, with one caveat:** the MDX file
  must already be present at build time (its content is bundled into
  `generated-index.json` via `prebuild`). Once the date arrives, the index,
  detail route, tag archives, service pages and sitemap pick it up on
  regeneration — each carries `export const revalidate = 3600`, so the
  **maximum expected publication delay is ~1 hour**. Brand-new files added
  after a deployment still require the next build/deploy to be bundled.

## Service associations (`services`)

Optional stable service slugs (existing slugs from `data/services.ts`):

```yaml
services:
  - web-development
  - seo
```

- Valid values: `web-development`, `seo`, `digital-marketing`,
  `business-documentation`. Display labels (`Web Development`) are accepted
  and normalised; unknown values fail validation. An article may list
  multiple services.
- When `services` is absent, associations are **inferred** from
  tags/category via a conservative keyword table (see
  `lib/articles/related.ts`), so existing articles work without migration.
  Explicit `services` always wins over inference.
- Service pages show up to 3 relevant published articles **immediately
  before the FAQ**: a relevant featured article first, then the latest
  relevant articles, never duplicated, never unrelated filler. Fewer than
  three matches show fewer cards; zero matches hide the section.

## Tags

- Tags render as links to `/articles/tag/<slug>` (slug via `slugifyTag()`:
  lowercase, non-alphanumerics collapsed to `-`; original label kept for
  display). Labels colliding to one slug (e.g. `SEO` vs `seo`) share a
  single merged archive (see `lib/articles/tags.ts`).
- Archives list only published articles, newest-first, 12 per page.
  Unknown tags and tags with no eligible articles 404. Single-article
  (thin) archives carry `noindex` with a canonical URL.

## Pagination

- `/articles` shows page 1; `?page=2`, `?page=3`, … show later pages.
  Default page size is **12** (`ARTICLES_PAGE_SIZE` in `data/blog.ts`).
- The featured article leads page 1 only and is excluded from the paginated
  grid (never duplicated). Page 1 is canonical at `/articles`; deeper pages
  carry their own canonicals and never enter the sitemap.
- Invalid values (`abc`, `0`, `-3`) normalise to page 1; a page number
  beyond the available range 404s predictably.

## Slug conventions

- Filename must equal the slug: `articles/my-slug.mdx` ↔ `slug: "my-slug"`.
- Slugs are lowercase letters, numbers and hyphens only.
- Slugs must be unique — duplicates fail the build with both filenames.
- Never change an existing slug just to make it prettier (URLs + redirects).
- Public URL: `/articles/<slug>`.

## Images

Preferred authoring syntax (no imports needed):

```md
![Web development in Brits](/images/articles/web-development-brits.jpg)
```

- Markdown `img` elements render through `ArticleImage` (`next/image`).
- Alt text is required and preserved; responsive sizing, optimization and
  lazy loading come from `next/image`.
- Unknown dimensions use a stable 16/9 fill wrapper (no layout shift) so
  authors never specify width/height in ordinary Markdown.

Explicit component for cases needing control:

```mdx
<ArticleImage
  src="/images/articles/example.jpg"
  alt="Example"
  width={1200}
  height={675}
/>
```

Rules:

- Local images must be web paths under `/images/articles/` (e.g.
  `/images/articles/example.jpg`), never `public/images/...` or arbitrary
  filesystem paths. Invalid paths fail validation with the filename.
- No remote image hosts unless a real requirement adds them to
  `next.config.ts`.

## How articles are published

1. Create `articles/<slug>.mdx` with valid frontmatter.
2. Optionally add the image to `public/images/articles/`.
3. Run the normal dev/build process (`pnpm dev`, `pnpm build`).
4. Visit `/articles/<slug>` — it renders through the existing Mogen article
   layout, appears in `/articles`, the sitemap and search metadata
   automatically. No TypeScript registry needs editing.

New files are picked up automatically: in dev the listing, detail pages,
homepage preview and related articles read the filesystem on every request,
so a new article appears on refresh with no server restart. For production
(`pnpm build`), `prebuild` regenerates `lib/articles/generated-index.json`
from the MDX files and that bundled index becomes the runtime metadata
source — this is why `/articles` (dynamically rendered for pagination)
keeps working on serverless deployments where the loose `articles/*.mdx`
files are not present on the function filesystem, while the MDX files
remain the single source of truth. Two caveats: `sitemap.xml` is generated
at build time (it refreshes on the next deploy), and in dev a brand-new
article may need a page refresh to appear.

## Drafts

```yaml
draft: true
```

- Drafts are excluded from `/articles`, `generateStaticParams`, the sitemap
  and JSON-LD, and unknown/draft slugs return the project 404.
- `getArticleSlugs()` / `getAllArticles()` exclude drafts unless
  `{ includeDrafts: true }` is passed (useful for previews).

## Validation

Loading validates every file and throws with the exact filename:

- missing `title` / `slug` / `description`
- invalid `publishedAt` / `updatedAt` (must be `YYYY-MM-DD`)
- invalid slug characters
- filename/slug mismatch
- duplicate slugs (across files)
- invalid `heroImage` path
- malformed frontmatter

Example:

```text
Invalid article articles/web-development-brits.mdx

- Missing required frontmatter: description
```

## Local verification

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`pnpm build` runs validation over every article (via `generateStaticParams`
and the sitemap), so broken frontmatter fails fast.
