import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { DATABASE_TARGET_HOSTS } from "./scripts/lib/database-targets.mjs";

config({ path: ".env.development.local", override: true, quiet: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
const databaseTarget = process.env.MOGEN_DATABASE_ENV?.trim();
const expectedHost = DATABASE_TARGET_HOSTS.development;

if (!databaseUrl || databaseTarget !== "development") {
  throw new Error(
    "Drizzle requires DATABASE_URL and MOGEN_DATABASE_ENV=development in .env.development.local",
  );
}

const actualHost = new URL(databaseUrl).hostname.toLowerCase();
if (actualHost !== expectedHost) {
  throw new Error(
    `Drizzle refused DATABASE_URL host ${actualHost}; expected development host ${expectedHost}`,
  );
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
});
