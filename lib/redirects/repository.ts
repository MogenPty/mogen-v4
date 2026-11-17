import "server-only";

import { and, eq, gt, or, sql } from "drizzle-orm";
import { getCatalogueDb } from "@/db/client";
import { goneResourceRules, redirectCacheState, redirectRules } from "@/db/schema";
import { buildRouteSnapshot, type RouteSnapshot } from "./engine";
import type { RedirectMatchType, RedirectStatusCode } from "./paths";

type HitSample = { nextWriteAt: number; suppressed: number };
const hitSamples = new Map<string, HitSample>();
const HIT_WRITE_INTERVAL_MS = 60_000;
const MAX_HIT_SAMPLE_KEYS = 10_000;

function sampledHitCount(kind: "redirect" | "gone", id: string, now: number): number | null {
  const key = `${kind}:${id}`;
  const sample = hitSamples.get(key);
  if (sample && now < sample.nextWriteAt) {
    sample.suppressed += 1;
    return null;
  }
  const count = 1 + (sample?.suppressed ?? 0);
  if (!sample && hitSamples.size >= MAX_HIT_SAMPLE_KEYS) {
    const oldestKey = hitSamples.keys().next().value;
    if (oldestKey) hitSamples.delete(oldestKey);
  }
  hitSamples.set(key, { nextWriteAt: now + HIT_WRITE_INTERVAL_MS, suppressed: 0 });
  return count;
}

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
  const increment = sampledHitCount(kind, id, at.getTime());
  if (increment === null) return;
  const db = getCatalogueDb();
  try {
    if (kind === "redirect") {
      await db.update(redirectRules).set({
        hitCount: sql`${redirectRules.hitCount} + ${increment}`,
        lastHitAt: at,
      }).where(eq(redirectRules.id, id));
      return;
    }
    await db.update(goneResourceRules).set({
      hitCount: sql`${goneResourceRules.hitCount} + ${increment}`,
      lastHitAt: at,
    }).where(eq(goneResourceRules.id, id));
  } catch (error) {
    const key = `${kind}:${id}`;
    const sample = hitSamples.get(key);
    if (sample) sample.suppressed += increment;
    throw error;
  }
}
