import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./auth-schema";

export function getAuthDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be configured before enabling Better Auth");
  }
  return drizzle({ client: neon(databaseUrl), schema });
}
