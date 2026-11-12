# Mogen catalogue administration — development branch

## Routes

- `/admin` — secure dashboard.
- `/admin/packages` — 7 approved Web Development tiers and create-draft entry point.
- `/admin/packages/[id]` — edit package content, publication status and payment options; create new draft billing options.
- `/admin/promotions` — all Neon campaigns, create draft, **Expire now** for active/scheduled campaigns.
- `/admin/promotions/[id]` — campaign content, terms, location scope, schedule, discount target, publish / expire / archive.

Only **Web Development** is bound to Neon promotions in this phase; other services require their own catalogue extension.

## Security — required configuration

The admin is private. Being signed in is **not sufficient**.

Set the following **server-only** environment variable in local `.env` and any trusted staging deployment:

```dotenv
MOGEN_ADMIN_EMAILS=your-verified-admin-login@example.com
```

Comma-separated verified emails are supported. Do not prefix the setting with `NEXT_PUBLIC_`. By default (unset or empty), nobody is authorised. `lib/admin/access.ts` checks the Neon Auth session, verified email and allowlist on **every admin page and every write action**. Unauthorised visitors cannot read or mutate catalogue data.

Neon Auth still requires `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`. Admin pages use the existing auth integration. The root `proxy.ts` is a Rampify tracker and is **not** the admin authorisation layer; all routes/actions check access on the server.

## Operations

### To end the existing test promotion

**Do not wait for the admin deployment** if the test campaign is still active.

In the **mogen-packages-dev** Neon SQL Editor, execute:

```sql
UPDATE public.web_promotions
SET status = 'expired', is_featured = false, updated_at = now()
WHERE id = 'sprout-example-draft'
  AND status IN ('active', 'scheduled');
```

Once the admin UI is deployed and signed in, use `/admin/promotions` → **Expire now** instead. Verify the promotion no longer appears as active. Because public pages use ISR `revalidate=3600`, a stale cached page may take up to an hour to update unless explicitly revalidated by the admin mutation. The admin action invokes `revalidatePath`.

### Packages

Package IDs and stages are immutable in the editor. Editing a published package or payment option immediately changes public catalogue data after cache invalidation. New tiers and payment options start as `draft`; they must be reviewed before publication. Financial amounts are entered in **ZAR cents** (e.g. `19900` = R199). When publishing an option, server-side rules validate price, published parent, responsibilities, dates, handover policy and billing mode.

Location recommendations and legacy compatibility must be reviewed before introducing new growth stages.

### Promotions

1. Create a draft using a unique URL slug.
2. Edit public copy, eligibility, terms, included items, times (all dates entered as SAST), featuring and customer cap.
3. Save an approved target payment option and a valid discount. Fixed discounts are **in cents**; percentage discounts are **in basis points** (500 = 5%).
4. Publish active or scheduled. Server validation requires complete public content, terms and a real price reduction on an approved option. Scheduled promotions require a future start date.
5. Use **Expire now** to stop a campaign. Active campaigns must be expired before changing campaign content or discount amount.

Campaign maximum customer counts and geographic eligibility are **manual checks**, not automatic redemption tracking. Do not promise automatic caps or discount redemption yet. Promotions are enquiries, not payment or billing discounts.

### Validation

```powershell
git pull --ff-only origin feat/neon-drizzle-web-catalogue
pnpm typecheck
pnpm exec vitest run lib/catalogue/promotion-projection.test.ts lib/catalogue/commercial.test.ts lib/contact/catalogue-mail.test.ts
pnpm build
pnpm dev
```

Visit `/admin`, verify unauthenticated and non-allowlisted accounts are denied, and inspect both editors as the allowlisted verified admin. Create a **draft** test campaign, save a target and test publish/expire in the development database only. Confirm marketing pages and contact submission stay consistent.

**This admin code has not yet been locally typechecked, built or browser-tested by the assistant.** Keep production database and production Vercel environment untouched until verification passes.
