# Better Auth

Mogen uses self-managed Better Auth on the existing Next.js application and Neon Postgres. It does not depend on Neon Managed Auth.

## Storage

Authentication data is isolated in the `better_auth` Postgres schema:

- `user`
- `session`
- `account`
- `verification`

The migration is `drizzle/0011_better_auth.sql`. It does not modify catalogue or pricing tables.

## Environment

Configure these server-side variables in every environment that serves authentication:

```dotenv
BETTER_AUTH_SECRET=<at-least-32-random-bytes>
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://...
```

Use `https://www.mogen.co.za` for the Vercel Production `BETTER_AUTH_URL`. Keep production and development database URLs separated as documented in `docs/growth/database-environment-safety.md`.

The existing `MAIL_PROVIDER`, `MAIL_FROM`, and provider credentials deliver email verification codes. `MOGEN_ADMIN_EMAILS` remains the final server-side admin authorization allowlist; creating an account never grants admin access.

## Database commands

```powershell
pnpm auth:dev:inspect
pnpm auth:dev:migrate
pnpm auth:prod:inspect
pnpm auth:prod:migrate
```

Every command verifies the committed database host allowlist. Migrations require a direct Neon connection and confirm all four tables after committing.

## Cutover

1. Add `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` to Vercel Production.
2. Deploy the application.
3. Create a new account because deleted Managed Auth users and sessions are not recoverable through this schema.
4. Verify the account email, add its address to `MOGEN_ADMIN_EMAILS`, and confirm `/admin` access.
5. Remove `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` after the Better Auth deployment is verified.
