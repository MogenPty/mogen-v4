import "server-only";

import { and, eq, gt, or, sql } from "drizzle-orm";
import { getCatalogueDb } from "@/db/client";
import { goneResourceRules, redirectCacheState, redirectRules } from "@/db/schema";
import { buildRouteSnapshot, type RouteSnapshot } from "./engine";
import type { RedirectMatchType, RedirectStatusCode } from "./paths";

export async function getRedirectGeneration(): Promise<number> {
  const [state] = await getCatalogueDb().select({ generation: redirectCacheState.generation })
    .from(redirectCacheState).where(eq(redirectCacheState.key, "redirects")).limit(1);
  return state?.generation ?? 0;
}

export async function loadRouteSnapshot(generation: number, now = new Date()): Promise<RouteSnapshot> {
  const db = getCatalogueDb();
  const [redirectRows, goneRows] = await Promise.all([
    db.select().from(redirectRules).where(and(
      eq(redirectRules.isActive, true),
      or(sql`${redirectRules.expiresAt} is null`, gt(redirectRules.expiresAt, now)),
    )),
    db.select().from(goneResourceRules).where(and(
      eq(goneResourceRules.isActive, true),
      or(sql`${goneResourceRules.expiresAt} is null`, gt(goneResourceRules.expiresAt, now)),
    )),
  ]);

  return buildRouteSnapshot(
    generation,
    redirectRows.map(rule => ({
      id: rule.id,
      sourcePath: rule.sourcePath,
      destinationPath: rule.destinationPath,
      matchType: rule.matchType as RedirectMatchType,
      statusCode: rule.statusCode as RedirectStatusCode,
      preserveQuery: rule.preserveQuery,
      expiresAt: rule.expiresAt,
    })),
    goneRows.map(rule => ({
      id: rule.id,
      sourcePath: rule.sourcePath,
      matchType: rule.matchType as RedirectMatchType,
      expiresAt: rule.expiresAt,
    })),
  );
}

export async function recordRouteHit(kind: "redirect" | "gone", id: string, at = new Date()): Promise<void> {
  const db = getCatalogueDb();
  if (kind === "redirect") {
    await db.update(redirectRules).set({
      hitCount: sql`${redirectRules.hitCount} + 1`,
      lastHitAt: at,
    }).where(eq(redirectRules.id, id));
    return;
  }
  await db.update(goneResourceRules).set({
    hitCount: sql`${goneResourceRules.hitCount} + 1`,
    lastHitAt: at,
  }).where(eq(goneResourceRules.id, id));
}

