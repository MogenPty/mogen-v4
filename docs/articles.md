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
| `heroImage`   | no       | Web path under `/images/articles/`                 |
| `heroImageAlt`| no       | Alt for the hero image                             |
| `draft`       | no       | `true` hides from listing, sitemap and indexing    |
| `readTime`    | no       | Computed from body (~200 wpm) when absent         |

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

New files are picked up automatically: the listing, detail pages, homepage
preview and related articles all read the filesystem on every request, so a
new article appears on refresh with no server restart and no rebuild. Two
caveats: `sitemap.xml` is generated at build time (it refreshes on the next
deploy), and in dev a brand-new article may need a page refresh to appear.

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
