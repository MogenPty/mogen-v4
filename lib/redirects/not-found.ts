import "server-only";

import { waitUntil } from "@vercel/functions";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { getCatalogueDb } from "@/db/client";
import { normalizeRequestPath } from "./paths";
import { isProtectedApplicationPath } from "./policy";
import { classifyUserAgent } from "./not-found-policy";

type SampleState = { nextWriteAt: number; suppressed: number };

const samples = new Map<string, SampleState>();
let windowStartedAt = 0;
let writesInWindow = 0;
const PATH_WINDOW_MS = 60_000;
const GLOBAL_WRITES_PER_MINUTE = 120;

function safeReferrer(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`.slice(0, 300);
  } catch {
    return null;
  }
}

function sampledCount(path: string, now: number): number | null {
  if (now - windowStartedAt >= 60_000) {
    windowStartedAt = now;
    writesInWindow = 0;
  }
  const state = samples.get(path);
  if (state && now < state.nextWriteAt) {
    state.suppressed += 1;
    return null;
  }
  if (writesInWindow >= GLOBAL_WRITES_PER_MINUTE) return null;
  writesInWindow += 1;
  const count = 1 + (state?.suppressed ?? 0);
  samples.set(path, { nextWriteAt: now + PATH_WINDOW_MS, suppressed: 0 });
  if (samples.size > 10_000) {
    for (const [key, value] of samples) {
      if (value.nextWriteAt < now) samples.delete(key);
      if (samples.size <= 8_000) break;
    }
  }
  return count;
}

export async function recordNotFound(
  rawPath: string,
  userAgent: string,
  referrer: string,
  now = new Date(),
): Promise<void> {
  let path: string;
  try {
    path = normalizeRequestPath(rawPath);
  } catch {
    return;
  }
  if (isProtectedApplicationPath(path) || /\.(?:css|js|map|png|jpe?g|gif|svg|ico|woff2?|ttf|xml|txt)$/i.test(path)) return;
  const increment = sampledCount(path, now.getTime());
  if (increment === null) return;
  const retainUntil = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  await getCatalogueDb().execute(sql`
    with cleanup as (
      delete from not_found_paths where retain_until < ${now}
    )
    insert into not_found_paths (
      requested_path, first_seen_at, last_seen_at, hit_count, referrer,
      user_agent_class, resolution_status, retain_until
    )
    select ${path}, ${now}, ${now}, ${increment}, ${safeReferrer(referrer)},
      ${classifyUserAgent(userAgent)}, 'open', ${retainUntil}
    where not exists (
      select 1 from redirect_rules where source_path = ${path} and is_active = true
    ) and not exists (
      select 1 from gone_resource_rules where source_path = ${path} and is_active = true
    )
    on conflict (requested_path) do update set
      last_seen_at = excluded.last_seen_at,
      hit_count = not_found_paths.hit_count + excluded.hit_count,
      referrer = coalesce(not_found_paths.referrer, excluded.referrer),
      user_agent_class = excluded.user_agent_class,
      resolution_status = case
        when not_found_paths.resolution_status in ('redirected', 'gone') then 'open'
        else not_found_paths.resolution_status
      end,
      resolution_redirect_id = case
        when not_found_paths.resolution_status in ('redirected', 'gone') then null
        else not_found_paths.resolution_redirect_id
      end,
      retain_until = excluded.retain_until
  `);
}

export async function scheduleNotFound(path: string): Promise<void> {
  const requestHeaders = await headers();
  waitUntil(recordNotFound(
    path,
    requestHeaders.get("user-agent") ?? "",
    requestHeaders.get("referer") ?? "",
  ).catch(error => console.error("404 monitor write failed", error)));
}
