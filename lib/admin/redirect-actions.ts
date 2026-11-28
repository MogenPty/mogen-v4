"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getCatalogueDb } from "@/db/client";
import {
  goneResourceRules,
  notFoundPaths,
  redirectCacheState,
  redirectHistory,
  redirectRules,
  searchConsoleImportRows,
  searchConsoleImports,
} from "@/db/schema";
import { requireCatalogueAdmin } from "./access";
import { assertNoRedirectChains, resolveRoute, type RedirectSnapshotRule } from "@/lib/redirects/engine";
import { loadRouteSnapshot } from "@/lib/redirects/repository";
import { csvRecordLine, importedDescription, parseCsv } from "@/lib/redirects/csv";
import { suggestGscDestination } from "@/lib/redirects/gsc";
import { normalizeImportedUrl } from "@/lib/redirects/paths";
import { getAllArticles } from "@/lib/articles/loader";
import { loadPublicPromotions } from "@/lib/catalogue/promotions-server";
import { SERVICES } from "@/data/services";
import { LOCATION_SLUGS } from "@/data/locations";
import {
  normalizeDestinationPath,
  normalizeRulePath,
  REDIRECT_STATUS_CODES,
  type RedirectMatchType,
  type RedirectStatusCode,
} from "@/lib/redirects/paths";
import {
  assertRuleDoesNotOverrideProtectedRoute,
  assertSafeRedirectDestination,
} from "@/lib/redirects/policy";

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const uuid = z.string().uuid();
const descriptionSchema = z.string().max(1000);

function expiry(input: string): Date | null {
  if (!input) return null;
  const timezoneQualified = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(input);
  const value = new Date(timezoneQualified ? input : `${input}+02:00`);
  if (Number.isNaN(value.getTime())) throw new Error("Enter a valid expiry date and time.");
  if (value <= new Date()) throw new Error("Expiry must be in the future.");
  return value;
}

function localExpiryValue(value: Date): string {
  return new Date(value.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

function statusCode(input: string): RedirectStatusCode {
  const parsed = z.coerce.number().int().parse(input);
  if (!REDIRECT_STATUS_CODES.includes(parsed as RedirectStatusCode)) throw new Error("Choose a supported redirect status.");
  return parsed as RedirectStatusCode;
}

function invalidation(db: ReturnType<typeof getCatalogueDb>, now: Date) {
  return db.insert(redirectCacheState).values({ key: "redirects", generation: 1, updatedAt: now })
    .onConflictDoUpdate({
      target: redirectCacheState.key,
      set: { generation: sql`${redirectCacheState.generation} + 1`, updatedAt: now },
    });
}

async function activeRedirectSnapshot(excludingId?: string): Promise<RedirectSnapshotRule[]> {
  const db = getCatalogueDb();
  const now = new Date();
  const rows = await db.select().from(redirectRules).where(and(
    eq(redirectRules.isActive, true),
    or(sql`${redirectRules.expiresAt} is null`, sql`${redirectRules.expiresAt} > ${now}`),
    excludingId ? ne(redirectRules.id, excludingId) : undefined,
  ));
  return rows.map(rule => ({
    id: rule.id,
    sourcePath: rule.sourcePath,
    destinationPath: rule.destinationPath,
    matchType: rule.matchType as RedirectMatchType,
    statusCode: rule.statusCode as RedirectStatusCode,
    preserveQuery: rule.preserveQuery,
    expiresAt: rule.expiresAt,
  }));
}

export type RedirectSourceConflict = {
  sourcePath: string;
  owner: { kind: "redirect"; id: string } | { kind: "gone" };
};

async function findActiveSourceConflict(
  sourcePath: string,
  excluding: { redirectId?: string; goneId?: string } = {},
): Promise<RedirectSourceConflict | null> {
  const redirectConditions = [eq(redirectRules.sourcePath, sourcePath), eq(redirectRules.isActive, true)];
  if (excluding.redirectId) redirectConditions.push(ne(redirectRules.id, excluding.redirectId));
  const goneConditions = [eq(goneResourceRules.sourcePath, sourcePath), eq(goneResourceRules.isActive, true)];
  if (excluding.goneId) goneConditions.push(ne(goneResourceRules.id, excluding.goneId));
  const [redirectConflict, goneConflict] = await Promise.all([
    getCatalogueDb().select({ id: redirectRules.id }).from(redirectRules).where(and(...redirectConditions)).limit(1),
    getCatalogueDb().select({ id: goneResourceRules.id }).from(goneResourceRules).where(and(...goneConditions)).limit(1),
  ]);
  if (redirectConflict[0]) return { sourcePath, owner: { kind: "redirect", id: redirectConflict[0].id } };
  if (goneConflict.length) return { sourcePath, owner: { kind: "gone" } };
  return null;
}

function refreshRedirectAdmin() {
  revalidatePath("/admin/redirects");
  revalidatePath("/admin/not-found");
  revalidatePath("/admin/search-console");
}

export async function createRedirectAction(_previous: RedirectSourceConflict | null, data: FormData) {
  const actor = await requireCatalogueAdmin();
  const db = getCatalogueDb();
  const linkedRow = field(data, "gscRowId");
  const gscRowId = linkedRow ? uuid.parse(linkedRow) : undefined;
  const source = normalizeRulePath(field(data, "sourcePath"));
  let importId: string | undefined;
  if (gscRowId) {
    const [row] = await db.select({
      importId: searchConsoleImportRows.importId,
      sourcePath: searchConsoleImportRows.sourcePath,
      status: searchConsoleImportRows.status,
    })
      .from(searchConsoleImportRows).where(eq(searchConsoleImportRows.id, gscRowId));
    if (!row || row.status !== "pending" || source.matchType !== "exact" || source.path !== row.sourcePath) {
      throw new Error("Use the original source path from a pending Search Console row.");
    }
    importId = row.importId;
  }
  const destinationPath = normalizeDestinationPath(field(data, "destinationPath"), source.matchType);
  const code = statusCode(field(data, "statusCode"));
  const expiresAt = expiry(field(data, "expiresAt"));
  const description = descriptionSchema.parse(field(data, "description"));
  const preserveQuery = data.get("preserveQuery") === "on";
  assertRuleDoesNotOverrideProtectedRoute(source.path, source.matchType);
  assertSafeRedirectDestination(destinationPath.replace(/\/(?:\:segment|\:path\*)$/, "") || "/");
  const conflict = await findActiveSourceConflict(source.path);
  if (conflict) return conflict;

  const id = randomUUID();
  const candidate: RedirectSnapshotRule = {
    id, sourcePath: source.path, destinationPath, matchType: source.matchType,
    statusCode: code, preserveQuery, expiresAt,
  };
  assertNoRedirectChains([...(await activeRedirectSnapshot()), candidate]);
  const now = new Date();
  const after = { ...candidate, isActive: true, isAutomatic: false, description, createdBy: actor };
  const notFoundId = field(data, "notFoundId");
  const queries = [
    db.insert(redirectRules).values({
      id, sourcePath: source.path, destinationPath, matchType: source.matchType,
      statusCode: code, isActive: true, isAutomatic: false, preserveQuery,
      description, createdBy: actor, expiresAt, createdAt: now, updatedAt: now,
    }),
    db.insert(redirectHistory).values({ redirectId: id, action: "create", actor, after }),
    ...(notFoundId ? [db.update(notFoundPaths).set({
      resolutionStatus: "redirected", resolutionRedirectId: id, retainUntil: now,
    }).where(eq(notFoundPaths.id, uuid.parse(notFoundId)))] : []),
    ...(gscRowId ? [db.update(searchConsoleImportRows).set({
      status: "created", createdRedirectId: id,
    }).where(eq(searchConsoleImportRows.id, gscRowId))] : []),
    invalidation(db, now),
  ];
  try {
    await db.batch(queries as unknown as Parameters<typeof db.batch>[0]);
  } catch (error) {
    // The database may reject a concurrent submission after the first check.
    const databaseError = error instanceof Error ? error.cause ?? error : error;
    if (databaseError && typeof databaseError === "object" && "code" in databaseError && databaseError.code === "23505") {
      const conflict = await findActiveSourceConflict(source.path);
      if (conflict) return conflict;
    }
    throw error;
  }
  refreshRedirectAdmin();
  redirect(importId ? `/admin/search-console?import=${importId}#review-urls` : "/admin/redirects?created=1");
}

export async function updateRedirectAction(_previous: RedirectSourceConflict | null, data: FormData) {
  const actor = await requireCatalogueAdmin();
  const redirectId = uuid.parse(field(data, "id"));
  const db = getCatalogueDb();
  const [current] = await db.select().from(redirectRules).where(eq(redirectRules.id, redirectId)).limit(1);
  if (!current) throw new Error("Redirect rule not found.");
  const source = normalizeRulePath(field(data, "sourcePath"));
  const destinationPath = normalizeDestinationPath(field(data, "destinationPath"), source.matchType);
  const code = statusCode(field(data, "statusCode"));
  const expiryInput = field(data, "expiresAt");
  const expiresAt = current.expiresAt && expiryInput === localExpiryValue(current.expiresAt)
    ? current.expiresAt
    : expiry(expiryInput);
  const description = descriptionSchema.parse(field(data, "description"));
  const preserveQuery = data.get("preserveQuery") === "on";
  assertRuleDoesNotOverrideProtectedRoute(source.path, source.matchType);
  assertSafeRedirectDestination(destinationPath.replace(/\/(?:\:segment|\:path\*)$/, "") || "/");
  if (current.isActive) {
    const conflict = await findActiveSourceConflict(source.path, { redirectId });
    if (conflict) return conflict;
    assertNoRedirectChains([...(await activeRedirectSnapshot(redirectId)), {
      id: redirectId, sourcePath: source.path, destinationPath, matchType: source.matchType,
      statusCode: code, preserveQuery, expiresAt,
    }]);
  }
  const now = new Date();
  const after = { ...current, sourcePath: source.path, destinationPath, matchType: source.matchType,
    statusCode: code, preserveQuery, description, expiresAt, updatedAt: now };
  await db.batch([
    db.update(redirectRules).set({
      sourcePath: source.path, destinationPath, matchType: source.matchType,
      statusCode: code, preserveQuery, description, expiresAt, updatedAt: now,
    }).where(eq(redirectRules.id, redirectId)),
    db.insert(redirectHistory).values({ redirectId, action: "update", actor, before: current, after }),
    invalidation(db, now),
  ]);
  refreshRedirectAdmin();
  redirect("/admin/redirects?saved=1");
}

export async function setRedirectActiveAction(_previous: RedirectSourceConflict | null, data: FormData) {
  const actor = await requireCatalogueAdmin();
  const redirectId = uuid.parse(field(data, "id"));
  const makeActive = field(data, "active") === "true";
  const db = getCatalogueDb();
  const [current] = await db.select().from(redirectRules).where(eq(redirectRules.id, redirectId)).limit(1);
  if (!current) throw new Error("Redirect rule not found.");
  if (makeActive) {
    const conflict = await findActiveSourceConflict(current.sourcePath, { redirectId });
    if (conflict) return conflict;
    assertRuleDoesNotOverrideProtectedRoute(current.sourcePath, current.matchType as RedirectMatchType);
    assertNoRedirectChains([...(await activeRedirectSnapshot(redirectId)), {
      id: current.id, sourcePath: current.sourcePath, destinationPath: current.destinationPath,
      matchType: current.matchType as RedirectMatchType, statusCode: current.statusCode as RedirectStatusCode,
      preserveQuery: current.preserveQuery, expiresAt: current.expiresAt,
    }]);
  }
  const now = new Date();
  await db.batch([
    db.update(redirectRules).set({ isActive: makeActive, updatedAt: now }).where(eq(redirectRules.id, redirectId)),
    db.insert(redirectHistory).values({
      redirectId, action: makeActive ? "enable" : "disable", actor,
      before: current, after: { ...current, isActive: makeActive, updatedAt: now },
    }),
    invalidation(db, now),
  ]);
  refreshRedirectAdmin();
  return null;
}

export async function deleteRedirectAction(data: FormData) {
  const actor = await requireCatalogueAdmin();
  const redirectId = uuid.parse(field(data, "id"));
  const db = getCatalogueDb();
  const [current] = await db.select().from(redirectRules).where(eq(redirectRules.id, redirectId)).limit(1);
  if (!current) return;
  const now = new Date();
  await db.batch([
    db.insert(redirectHistory).values({ redirectId, action: "delete", actor, before: current }),
    db.delete(redirectRules).where(eq(redirectRules.id, redirectId)),
    invalidation(db, now),
  ]);
  refreshRedirectAdmin();
}

export async function createGoneRuleAction(_previous: RedirectSourceConflict | null, data: FormData) {
  const actor = await requireCatalogueAdmin();
  const source = normalizeRulePath(field(data, "sourcePath"));
  assertRuleDoesNotOverrideProtectedRoute(source.path, source.matchType);
  const conflict = await findActiveSourceConflict(source.path);
  if (conflict) return conflict;
  const goneId = randomUUID();
  const now = new Date();
  const description = descriptionSchema.parse(field(data, "description"));
  const expiresAt = expiry(field(data, "expiresAt"));
  const after = { id: goneId, sourcePath: source.path, matchType: source.matchType, description, expiresAt, isActive: true };
  const db = getCatalogueDb();
  await db.batch([
    db.insert(goneResourceRules).values({
      id: goneId, sourcePath: source.path, matchType: source.matchType,
      description, expiresAt, createdBy: actor, createdAt: now, updatedAt: now,
    }),
    db.insert(redirectHistory).values({ goneRuleId: goneId, action: "create", actor, after }),
    invalidation(db, now),
  ]);
  refreshRedirectAdmin();
  redirect("/admin/redirects?goneCreated=1");
}

export async function setGoneRuleActiveAction(_previous: RedirectSourceConflict | null, data: FormData) {
  const actor = await requireCatalogueAdmin();
  const goneId = uuid.parse(field(data, "id"));
  const makeActive = field(data, "active") === "true";
  const db = getCatalogueDb();
  const [current] = await db.select().from(goneResourceRules).where(eq(goneResourceRules.id, goneId)).limit(1);
  if (!current) throw new Error("410 rule not found.");
  if (makeActive) {
    const conflict = await findActiveSourceConflict(current.sourcePath, { goneId });
    if (conflict) return conflict;
  }
  const now = new Date();
  await db.batch([
    db.update(goneResourceRules).set({ isActive: makeActive, updatedAt: now }).where(eq(goneResourceRules.id, goneId)),
    db.insert(redirectHistory).values({
      goneRuleId: goneId, action: makeActive ? "enable" : "disable", actor,
      before: current, after: { ...current, isActive: makeActive, updatedAt: now },
    }),
    invalidation(db, now),
  ]);
  refreshRedirectAdmin();
  return null;
}

export async function deleteGoneRuleAction(data: FormData) {
  const actor = await requireCatalogueAdmin();
  const goneId = uuid.parse(field(data, "id"));
  const db = getCatalogueDb();
  const [current] = await db.select().from(goneResourceRules).where(eq(goneResourceRules.id, goneId)).limit(1);
  if (!current) return;
  const now = new Date();
  await db.batch([
    db.insert(redirectHistory).values({ goneRuleId: goneId, action: "delete", actor, before: current }),
    db.delete(goneResourceRules).where(eq(goneResourceRules.id, goneId)),
    invalidation(db, now),
  ]);
  refreshRedirectAdmin();
}

export async function importRedirectCsvAction(data: FormData) {
  const actor = await requireCatalogueAdmin();
  const upload = data.get("file");
  if (!(upload instanceof File) || upload.size === 0) throw new Error("Choose a CSV file to import.");
  if (upload.size > 1_000_000) throw new Error("CSV imports are limited to 1 MB.");
  const records = parseCsv(await upload.text());
  if (!records.length) throw new Error("CSV has no redirect rows.");
  if (records.length > 1000) throw new Error("Import at most 1,000 redirects at a time.");
  const existing = await activeRedirectSnapshot();
  const [activeRedirectRows, activeGoneRows] = await Promise.all([
    getCatalogueDb().select({ sourcePath: redirectRules.sourcePath }).from(redirectRules)
      .where(eq(redirectRules.isActive, true)),
    getCatalogueDb().select({ sourcePath: goneResourceRules.sourcePath }).from(goneResourceRules)
      .where(eq(goneResourceRules.isActive, true)),
  ]);
  const activeSources = new Set([
    ...activeRedirectRows.map(rule => rule.sourcePath),
    ...activeGoneRows.map(rule => rule.sourcePath),
  ]);
  const imported: Array<RedirectSnapshotRule & { description: string; isActive: boolean }> = [];
  for (const [index, record] of records.entries()) {
    try {
      const source = normalizeRulePath(record.sourcePath ?? record.source ?? "");
      const destinationPath = normalizeDestinationPath(record.destinationPath ?? record.destination ?? "", source.matchType);
      const isActive = !["false", "0", "no"].includes((record.isActive || "true").toLowerCase());
      assertRuleDoesNotOverrideProtectedRoute(source.path, source.matchType);
      assertSafeRedirectDestination(destinationPath.replace(/\/(?:\:segment|\:path\*)$/, "") || "/");
      if (isActive && activeSources.has(source.path)) throw new Error("source path already has an active rule");
      if (isActive) activeSources.add(source.path);
      const code = statusCode(record.statusCode || "308");
      const preserveQuery = !["false", "0", "no"].includes((record.preserveQuery || "true").toLowerCase());
      imported.push({
        id: randomUUID(), sourcePath: source.path, destinationPath, matchType: source.matchType,
        statusCode: code, preserveQuery, expiresAt: record.expiresAt ? expiry(record.expiresAt) : null,
        description: descriptionSchema.parse(importedDescription(record.description ?? "")), isActive,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "invalid row";
      throw new Error(`CSV row ${csvRecordLine(record, index + 2)}: ${message}`);
    }
  }
  assertNoRedirectChains([...existing, ...imported.filter(rule => rule.isActive)]);
  const now = new Date();
  const db = getCatalogueDb();
  const inserts = imported.flatMap(rule => [
    db.insert(redirectRules).values({
      id: rule.id, sourcePath: rule.sourcePath, destinationPath: rule.destinationPath,
      matchType: rule.matchType, statusCode: rule.statusCode, preserveQuery: rule.preserveQuery,
      isActive: rule.isActive, isAutomatic: false, description: rule.description,
      expiresAt: rule.expiresAt, createdBy: actor, createdAt: now, updatedAt: now,
    }),
    db.insert(redirectHistory).values({
      redirectId: rule.id, action: "import", actor,
      after: { ...rule, isAutomatic: false, createdBy: actor },
    }),
  ]);
  const batch = [...inserts, invalidation(db, now)];
  await db.batch(batch as unknown as Parameters<typeof db.batch>[0]);
  refreshRedirectAdmin();
  redirect(`/admin/redirects?imported=${imported.length}`);
}

export async function ignoreNotFoundAction(data: FormData) {
  await requireCatalogueAdmin();
  const id = uuid.parse(field(data, "id"));
  await getCatalogueDb().update(notFoundPaths).set({
    resolutionStatus: "ignored",
    retainUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  }).where(eq(notFoundPaths.id, id));
  revalidatePath("/admin/not-found");
}

export async function importSearchConsoleCsvAction(data: FormData) {
  const actor = await requireCatalogueAdmin();
  const upload = data.get("file");
  if (!(upload instanceof File) || upload.size === 0) throw new Error("Choose a Search Console CSV file.");
  if (upload.size > 2_000_000) throw new Error("Search Console imports are limited to 2 MB.");
  const records = parseCsv(await upload.text());
  if (records.length > 5000) throw new Error("Import at most 5,000 rows at a time.");
  const paths = new Set<string>();
  for (const [index, record] of records.entries()) {
    const normalizedRecord = Object.fromEntries(Object.entries(record).map(([key, value]) => [key.toLowerCase(), value]));
    const value = normalizedRecord.url || normalizedRecord.page || normalizedRecord.path || normalizedRecord["last crawled url"];
    const rowNumber = csvRecordLine(record, index + 2);
    if (!value) throw new Error(`CSV row ${rowNumber}: no URL column was found.`);
    try {
      paths.add(normalizeImportedUrl(value));
    } catch (error) {
      throw new Error(`CSV row ${rowNumber}: ${error instanceof Error ? error.message : "invalid URL"}`);
    }
  }
  if (!paths.size) throw new Error("No unique Mogen URLs were found in the report.");
  const db = getCatalogueDb();
  const now = new Date();
  const [ruleRows, promotionRows] = await Promise.all([
    db.select({
      sourcePath: redirectRules.sourcePath,
      destinationPath: redirectRules.destinationPath,
      matchType: redirectRules.matchType,
    }).from(redirectRules).where(and(
      eq(redirectRules.isActive, true),
      or(sql`${redirectRules.expiresAt} is null`, sql`${redirectRules.expiresAt} > ${now}`),
    )),
    loadPublicPromotions(),
  ]);
  const existingRedirects = ruleRows.map(rule => ({
    sourcePath: rule.sourcePath,
    destinationPath: rule.destinationPath,
    matchType: rule.matchType as RedirectMatchType,
  }));
  const articles = getAllArticles();
  const articleSlugs = new Set(articles.map(article => article.slug));
  const promotionSlugs = new Set(promotionRows.map(row => row.slug));
  const currentPages = new Set([
    "/", "/about", "/services", "/pricing", "/process", "/resources", "/partners",
    "/success-stories", "/articles", "/promotions", "/contact", "/locations", "/faq",
    "/privacy-policy", "/terms-of-service",
    ...articles.map(article => `/articles/${article.slug}`),
    ...[...promotionSlugs].map(slug => `/promotions/${slug}`),
    ...SERVICES.map(service => `/services/${service.slug}`),
    ...LOCATION_SLUGS.map(slug => `/locations/${slug}`),
  ]);
  const importId = randomUUID();
  const rows = [...paths].map(sourcePath => ({
    id: randomUUID(), importId, sourcePath,
    ...suggestGscDestination(sourcePath, existingRedirects, currentPages, articleSlugs, promotionSlugs),
  }));
  const queries = [
    db.insert(searchConsoleImports).values({
      id: importId, filename: upload.name.slice(0, 255), importedBy: actor,
      rowCount: rows.length, createdAt: now,
    }),
    ...rows.map(row => db.insert(searchConsoleImportRows).values({
      id: row.id, importId: row.importId, sourcePath: row.sourcePath,
      suggestedDestination: row.destination, suggestionReason: row.reason,
    })),
  ];
  await db.batch(queries as unknown as Parameters<typeof db.batch>[0]);
  revalidatePath("/admin/search-console");
  redirect(`/admin/search-console?import=${importId}`);
}

export async function skipSearchConsoleRowAction(data: FormData) {
  await requireCatalogueAdmin();
  const rowId = uuid.parse(field(data, "id"));
  await getCatalogueDb().update(searchConsoleImportRows).set({ status: "skipped" })
    .where(and(eq(searchConsoleImportRows.id, rowId), eq(searchConsoleImportRows.status, "pending")));
  revalidatePath("/admin/search-console");
}

export async function linkSearchConsoleRedirectAction(data: FormData) {
  await requireCatalogueAdmin();
  const id = uuid.parse(field(data, "id"));
  const db = getCatalogueDb();
  const [row] = await db.select({ sourcePath: searchConsoleImportRows.sourcePath })
    .from(searchConsoleImportRows)
    .where(and(eq(searchConsoleImportRows.id, id), eq(searchConsoleImportRows.status, "pending")));
  if (!row) return;

  const match = resolveRoute(row.sourcePath, await loadRouteSnapshot(0));
  if (match.kind !== "redirect" || match.ruleId !== field(data, "redirectId")) {
    throw new Error("The active redirect changed. Refresh the report before linking this URL.");
  }

  await db.update(searchConsoleImportRows).set({ status: "created", createdRedirectId: match.ruleId })
    .where(and(eq(searchConsoleImportRows.id, id), eq(searchConsoleImportRows.status, "pending")));
  revalidatePath("/admin/search-console");
}
