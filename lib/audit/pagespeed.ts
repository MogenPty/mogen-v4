/**
 * Server-side Google PageSpeed Insights API v5 adapter.
 *
 * Role in the pipeline:
 *   crawl → HTML/robots/sitemap evidence → PageSpeed evidence → normalize
 *   → rules → report
 *
 * - One audit makes exactly two PageSpeed requests (mobile + desktop) for
 *   the canonical final URL, run in parallel. Strategies are never merged
 *   or averaged — see {@link PageSpeedAnalysis}.
 * - Never throws for expected failure modes; returns a discriminated
 *   outcome so callers map failures to NOT_ASSESSED.
 * - Never includes the API key in any returned value, log, or report.
 * - Raw Google response structures never leave this module; callers only
 *   see {@link PageSpeedEvidence} / {@link PageSpeedAnalysis}.
 * - Lab-only. CrUX / field data is intentionally out of scope; the model
 *   keeps a distinct shape so a future field provider can sit alongside it.
 *
 * INP note (verified against real lab runs): the Lighthouse *lab* result
 * (`lighthouseResult.audits`) carries LCP, FCP, CLS, TBT, Speed Index and
 * TTFB, but no INP audit — INP is a field (real-user/CrUX) metric surfaced
 * via `loadingExperience`, which this adapter deliberately does not
 * consume. The normalizer still checks both known lab audit IDs
 * (`interaction-to-next-paint`, `experimental-interaction-to-next-paint`),
 * so a null INP means "not in this lab run", never an extraction bug —
 * and INP is never derived from TBT.
 */

export type PageSpeedStrategy = "mobile" | "desktop";

export interface PageSpeedCategories {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
}

export interface PageSpeedMetrics {
  /** Milliseconds, or null when Lighthouse did not return the metric. */
  lcpMs: number | null;
  inpMs: number | null;
  /** Unitless layout-shift score, or null when unavailable. */
  cls: number | null;
  fcpMs: number | null;
  ttfbMs: number | null;
  speedIndexMs: number | null;
  totalBlockingTimeMs: number | null;
}

export interface PageSpeedAuditEntry {
  id: string;
  title?: string;
  displayValue?: string;
  score?: number | null;
  numericValue?: number | null;
  numericUnit?: string | null;
}

export interface PageSpeedEvidence {
  source: "pagespeed";
  provider: "google-pagespeed-insights";
  /** Lighthouse version reported by Google, when present. */
  version: string | null;
  fetchedAt: string;
  /** The exact final URL that was sent to PageSpeed. */
  url: string;
  strategy: PageSpeedStrategy;
  categories: PageSpeedCategories;
  metrics: PageSpeedMetrics;
  audits: PageSpeedAuditEntry[];
}

export type PageSpeedOutcome =
  | { ok: true; evidence: PageSpeedEvidence }
  | { ok: false; reason: string };

/**
 * Canonical dual-strategy Lighthouse evidence for one audit.
 * Mobile and desktop coexist — never averaged, never overwritten.
 * A null strategy with a reason means that strategy alone failed; the
 * audit stays usable on the surviving strategy.
 */
export interface PageSpeedAnalysis {
  provider: "google-pagespeed-insights";
  /** The exact final URL both strategies analysed. */
  url: string;
  fetchedAt: string;
  mobile: PageSpeedEvidence | null;
  desktop: PageSpeedEvidence | null;
  mobileReason: string | null;
  desktopReason: string | null;
}

/** True when at least one strategy produced usable lab evidence. */
export function hasPageSpeedEvidence(analysis: PageSpeedAnalysis | null): boolean {
  return analysis !== null && (analysis.mobile !== null || analysis.desktop !== null);
}

/**
 * INP availability within Lighthouse *lab* evidence.
 * - "available": a genuine lab INP measurement exists.
 * - "not-in-lab-run": the lab run returned no INP value. This is the
 *   expected state — INP is a field (real-user) metric, not a lab audit —
 *   and must not be treated as "not assessed" nor filled from TBT.
 */
export type InpAvailability = "available" | "not-in-lab-run";

export function inpAvailability(
  metrics: PageSpeedMetrics | null | undefined,
): InpAvailability {
  return metrics?.inpMs !== null && metrics?.inpMs !== undefined
    ? "available"
    : "not-in-lab-run";
}

/** Shared wording for unavailable lab INP (rules + reports). */
export const INP_LAB_UNAVAILABLE_NOTE =
  "Not available in this Lighthouse lab run — INP is a field (real-user) metric; use TBT for lab responsiveness.";

/** Short report label for unavailable lab INP. */
export const INP_LAB_UNAVAILABLE_SHORT =
  "Not available in this Lighthouse lab run";

export const PAGESPEED_API_URL =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/** Server-side timeout for a single PageSpeed request. */
export const PAGESPEED_TIMEOUT_MS = 25_000;

const REQUESTED_CATEGORIES = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
] as const;

/** Metric audit IDs (including known historical aliases). */
const METRIC_AUDIT_IDS = {
  lcp: ["largest-contentful-paint"],
  inp: ["interaction-to-next-paint", "experimental-interaction-to-next-paint"],
  cls: ["cumulative-layout-shift"],
  fcp: ["first-contentful-paint"],
  ttfb: ["server-response-time", "time-to-first-byte"],
  speedIndex: ["speed-index"],
  totalBlockingTime: ["total-blocking-time"],
} as const;

export type PageSpeedFetchFn = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Read the server-side PageSpeed API key. Returns null when unconfigured.
 * Never logs or exposes the value — callers must never embed it in output.
 */
export function getPageSpeedApiKey(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env.PAGESPEED_API_KEY;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

/** Build the PageSpeed v5 request URL for the exact final URL under audit. */
export function buildPageSpeedRequestUrl(
  targetUrl: string,
  apiKey: string,
  strategy: PageSpeedStrategy = "mobile",
): string {
  const req = new URL(PAGESPEED_API_URL);
  req.searchParams.set("url", targetUrl);
  req.searchParams.set("strategy", strategy);
  for (const category of REQUESTED_CATEGORIES) {
    req.searchParams.append("category", category);
  }
  req.searchParams.set("key", apiKey);
  return req.toString();
}

function toScoreOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toMetricOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

interface NormalizeMeta {
  url: string;
  strategy: PageSpeedStrategy;
  fetchedAt: string;
}

/**
 * Normalize a raw PageSpeed v5 JSON payload into Mogen evidence.
 * Missing fields stay null — never zero.
 */
export function normalizePageSpeedResponse(
  json: unknown,
  meta: NormalizeMeta,
): PageSpeedOutcome {
  if (typeof json !== "object" || json === null) {
    return { ok: false, reason: "Lighthouse data unavailable" };
  }
  const root = json as Record<string, unknown>;
  const lighthouse = root.lighthouseResult as
    | Record<string, unknown>
    | undefined;
  if (typeof lighthouse !== "object" || lighthouse === null) {
    // Google sometimes returns { error: ... } for rejected URLs / quota.
    return { ok: false, reason: "Lighthouse data unavailable" };
  }

  const categoriesRaw = (lighthouse.categories ?? {}) as Record<
    string,
    { score?: unknown } | undefined
  >;
  const categories: PageSpeedCategories = {
    performance: toScoreOrNull(categoriesRaw.performance?.score),
    accessibility: toScoreOrNull(categoriesRaw.accessibility?.score),
    bestPractices: toScoreOrNull(categoriesRaw["best-practices"]?.score),
    seo: toScoreOrNull(categoriesRaw.seo?.score),
  };

  const auditsRaw = (lighthouse.audits ?? {}) as Record<
    string,
    Record<string, unknown> | undefined
  >;

  const pickNumeric = (ids: readonly string[]): number | null => {
    for (const id of ids) {
      const entry = auditsRaw[id];
      if (entry && typeof entry.numericValue === "number") {
        const v = toMetricOrNull(entry.numericValue);
        if (v !== null) return v;
      }
    }
    return null;
  };

  const metrics: PageSpeedMetrics = {
    lcpMs: pickNumeric(METRIC_AUDIT_IDS.lcp),
    inpMs: pickNumeric(METRIC_AUDIT_IDS.inp),
    cls: pickNumeric(METRIC_AUDIT_IDS.cls),
    fcpMs: pickNumeric(METRIC_AUDIT_IDS.fcp),
    ttfbMs: pickNumeric(METRIC_AUDIT_IDS.ttfb),
    speedIndexMs: pickNumeric(METRIC_AUDIT_IDS.speedIndex),
    totalBlockingTimeMs: pickNumeric(METRIC_AUDIT_IDS.totalBlockingTime),
  };

  const wantedIds = new Set<string>([
    ...METRIC_AUDIT_IDS.lcp,
    ...METRIC_AUDIT_IDS.inp,
    ...METRIC_AUDIT_IDS.cls,
    ...METRIC_AUDIT_IDS.fcp,
    ...METRIC_AUDIT_IDS.ttfb,
    ...METRIC_AUDIT_IDS.speedIndex,
    ...METRIC_AUDIT_IDS.totalBlockingTime,
  ]);
  const audits: PageSpeedAuditEntry[] = [];
  for (const id of wantedIds) {
    const entry = auditsRaw[id];
    if (!entry) continue;
    const audit: PageSpeedAuditEntry = { id };
    if (typeof entry.title === "string") audit.title = entry.title.slice(0, 200);
    if (typeof entry.displayValue === "string") {
      audit.displayValue = entry.displayValue.slice(0, 200);
    }
    if (entry.score === null || typeof entry.score === "number") {
      audit.score = typeof entry.score === "number" ? entry.score : null;
    }
    if (typeof entry.numericValue === "number") {
      audit.numericValue = entry.numericValue;
    }
    if (typeof entry.numericUnit === "string") {
      audit.numericUnit = entry.numericUnit.slice(0, 40);
    }
    audits.push(audit);
  }

  const hasAnySignal =
    categories.performance !== null ||
    categories.accessibility !== null ||
    categories.bestPractices !== null ||
    categories.seo !== null ||
    Object.values(metrics).some((v) => v !== null);

  if (!hasAnySignal) {
    return { ok: false, reason: "Lighthouse data unavailable" };
  }

  const version =
    typeof lighthouse.lighthouseVersion === "string"
      ? lighthouse.lighthouseVersion.slice(0, 40)
      : null;
  // Prefer the analysed final URL echoed by Google; fall back to the URL we sent.
  const echoed =
    typeof lighthouse.finalUrl === "string" && lighthouse.finalUrl !== ""
      ? lighthouse.finalUrl
      : meta.url;

  return {
    ok: true,
    evidence: {
      source: "pagespeed",
      provider: "google-pagespeed-insights",
      version,
      fetchedAt: meta.fetchedAt,
      url: echoed,
      strategy: meta.strategy,
      categories,
      metrics,
      audits,
    },
  };
}

export interface FetchPageSpeedOptions {
  apiKey?: string | null;
  env?: NodeJS.ProcessEnv;
  strategy?: PageSpeedStrategy;
  timeoutMs?: number;
  fetchFn?: PageSpeedFetchFn;
  now?: () => string;
  /** Overall audit deadline; combined with the per-request timeout. */
  signal?: AbortSignal;
}

/**
 * Run mobile PageSpeed analysis for the audit's final URL.
 * Never throws for expected failures — they become { ok: false, reason }.
 */
export async function fetchPageSpeed(
  targetUrl: string,
  options: FetchPageSpeedOptions = {},
): Promise<PageSpeedOutcome> {
  const {
    env = process.env,
    strategy = "mobile",
    timeoutMs = PAGESPEED_TIMEOUT_MS,
    fetchFn = globalThis.fetch.bind(globalThis),
    now = () => new Date().toISOString(),
    signal,
  } = options;
  const apiKey =
    options.apiKey !== undefined ? options.apiKey : getPageSpeedApiKey(env);

  if (!apiKey) {
    return { ok: false, reason: "PageSpeed API key not configured" };
  }

  let requestUrl: string;
  try {
    requestUrl = buildPageSpeedRequestUrl(targetUrl, apiKey, strategy);
  } catch {
    return { ok: false, reason: "PageSpeed request failed" };
  }

  const requestSignal =
    signal !== undefined
      ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs);

  let response: Response;
  try {
    response = await fetchFn(requestUrl, { signal: requestSignal });
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      return { ok: false, reason: "PageSpeed request failed" };
    }
    return { ok: false, reason: "PageSpeed request failed" };
  }

  if (!response.ok) {
    if (response.status === 400 || response.status === 403) {
      return { ok: false, reason: "PageSpeed request failed" };
    }
    if (response.status === 429) {
      return { ok: false, reason: "PageSpeed request failed" };
    }
    return { ok: false, reason: "PageSpeed request failed" };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { ok: false, reason: "Lighthouse data unavailable" };
  }

  return normalizePageSpeedResponse(json, {
    url: targetUrl,
    strategy,
    fetchedAt: now(),
  });
}

export interface FetchPageSpeedStrategiesOptions {
  apiKey?: string | null;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  fetchFn?: PageSpeedFetchFn;
  now?: () => string;
  /** Overall audit deadline; combined with each per-request timeout. */
  signal?: AbortSignal;
}

/**
 * Run both Lighthouse strategies (mobile + desktop) for the audit's final
 * URL — exactly two requests, in parallel. Each strategy degrades
 * independently: one may be assessed while the other is unavailable, and
 * the audit never fails because of PageSpeed.
 */
export async function fetchPageSpeedStrategies(
  targetUrl: string,
  options: FetchPageSpeedStrategiesOptions = {},
): Promise<PageSpeedAnalysis> {
  const {
    env = process.env,
    timeoutMs = PAGESPEED_TIMEOUT_MS,
    fetchFn = globalThis.fetch.bind(globalThis),
    now = () => new Date().toISOString(),
    signal,
  } = options;
  const apiKey =
    options.apiKey !== undefined ? options.apiKey : getPageSpeedApiKey(env);
  const fetchedAt = now();

  if (!apiKey) {
    return {
      provider: "google-pagespeed-insights",
      url: targetUrl,
      fetchedAt,
      mobile: null,
      desktop: null,
      mobileReason: "PageSpeed API key not configured",
      desktopReason: "PageSpeed API key not configured",
    };
  }

  const run = async (strategy: PageSpeedStrategy): Promise<PageSpeedOutcome> => {
    try {
      return await fetchPageSpeed(targetUrl, {
        apiKey,
        strategy,
        timeoutMs,
        fetchFn,
        now: () => fetchedAt,
        ...(signal ? { signal } : {}),
      });
    } catch {
      return { ok: false, reason: "PageSpeed request failed" };
    }
  };

  const [mobileOutcome, desktopOutcome] = await Promise.all([
    run("mobile"),
    run("desktop"),
  ]);

  return {
    provider: "google-pagespeed-insights",
    url: targetUrl,
    fetchedAt,
    mobile: mobileOutcome.ok ? mobileOutcome.evidence : null,
    desktop: desktopOutcome.ok ? desktopOutcome.evidence : null,
    mobileReason: mobileOutcome.ok ? null : mobileOutcome.reason,
    desktopReason: desktopOutcome.ok ? null : desktopOutcome.reason,
  };
}
