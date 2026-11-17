import {
  applyRuleDestination,
  matchRulePath,
  normalizeRequestPath,
  type RedirectMatchType,
  type RedirectStatusCode,
} from "./paths";

export type RedirectSnapshotRule = {
  id: string;
  sourcePath: string;
  destinationPath: string;
  matchType: RedirectMatchType;
  statusCode: RedirectStatusCode;
  preserveQuery: boolean;
  expiresAt: Date | null;
};

export type GoneSnapshotRule = {
  id: string;
  sourcePath: string;
  matchType: RedirectMatchType;
  expiresAt: Date | null;
};

export type RouteSnapshot = {
  generation: number;
  redirects: RedirectSnapshotRule[];
  gone: GoneSnapshotRule[];
  routes: Array<
    | ({ kind: "redirect" } & RedirectSnapshotRule)
    | ({ kind: "gone" } & GoneSnapshotRule)
  >;
};

export type RouteResolution =
  | { kind: "redirect"; ruleId: string; destinationPath: string; statusCode: RedirectStatusCode; preserveQuery: boolean }
  | { kind: "gone"; ruleId: string }
  | { kind: "none" };

const specificity = (rule: { sourcePath: string; matchType: RedirectMatchType }) => {
  const kind = rule.matchType === "exact" ? 3 : rule.matchType === "segment" ? 2 : 1;
  return [kind, rule.sourcePath.length] as const;
};

function sortRules<T extends { sourcePath: string; matchType: RedirectMatchType }>(rules: T[]): T[] {
  return [...rules].sort((left, right) => {
    const [leftKind, leftLength] = specificity(left);
    const [rightKind, rightLength] = specificity(right);
    return rightKind - leftKind || rightLength - leftLength || left.sourcePath.localeCompare(right.sourcePath);
  });
}

export function buildRouteSnapshot(
  generation: number,
  redirects: RedirectSnapshotRule[],
  gone: GoneSnapshotRule[],
): RouteSnapshot {
  const sources = new Set<string>();
  for (const rule of [...redirects, ...gone]) {
    if (sources.has(rule.sourcePath)) throw new Error(`Conflicting active route rule for ${rule.sourcePath}.`);
    sources.add(rule.sourcePath);
  }
  const sortedRedirects = sortRules(redirects);
  const sortedGone = sortRules(gone);
  return {
    generation,
    redirects: sortedRedirects,
    gone: sortedGone,
    routes: sortRules([
      ...sortedRedirects.map(rule => ({ ...rule, kind: "redirect" as const })),
      ...sortedGone.map(rule => ({ ...rule, kind: "gone" as const })),
    ]),
  };
}

function active(expiresAt: Date | null, now: Date): boolean {
  return expiresAt === null || expiresAt.getTime() > now.getTime();
}

export function resolveRoute(
  pathname: string,
  snapshot: RouteSnapshot,
  now = new Date(),
): RouteResolution {
  let normalized: string;
  try {
    normalized = normalizeRequestPath(pathname);
  } catch {
    return { kind: "none" };
  }

  for (const rule of snapshot.routes) {
    if (!active(rule.expiresAt, now)) continue;
    const capture = matchRulePath(normalized, rule.sourcePath, rule.matchType);
    if (capture === null) continue;
    if (rule.kind === "gone") return { kind: "gone", ruleId: rule.id };
    const destinationPath = applyRuleDestination(rule.destinationPath, rule.matchType, capture);
    if (destinationPath === normalized) return { kind: "none" };
    return {
      kind: "redirect",
      ruleId: rule.id,
      destinationPath,
      statusCode: rule.statusCode,
      preserveQuery: rule.preserveQuery,
    };
  }

  return { kind: "none" };
}

export function redirectLocation(requestUrl: URL, resolution: Extract<RouteResolution, { kind: "redirect" }>): URL {
  const location = new URL(resolution.destinationPath, requestUrl.origin);
  if (resolution.preserveQuery) location.search = requestUrl.search;
  return location;
}

function representativePath(path: string, matchType: RedirectMatchType): string {
  if (matchType === "segment") return path.replace(/:segment$/, "example");
  if (matchType === "splat") return path.replace(/:path\*$/, "example/path");
  return path;
}

function representativePaths(path: string, matchType: RedirectMatchType): string[] {
  if (matchType === "exact") return [path];
  const token = matchType === "segment" ? "/:segment" : "/:path*";
  const prefix = path.slice(0, -token.length) || "/";
  if (matchType === "segment") return [`${prefix === "/" ? "" : prefix}/example`];
  return [prefix, `${prefix === "/" ? "" : prefix}/example`, `${prefix === "/" ? "" : prefix}/example/path`];
}

function destinationPattern(rule: RedirectSnapshotRule): { path: string; matchType: RedirectMatchType } {
  const token = rule.matchType === "segment" ? "/:segment" : "/:path*";
  return rule.matchType !== "exact" && rule.destinationPath.endsWith(token)
    ? { path: rule.destinationPath, matchType: rule.matchType }
    : { path: rule.destinationPath, matchType: "exact" };
}

function patternsOverlap(
  left: { path: string; matchType: RedirectMatchType },
  right: { path: string; matchType: RedirectMatchType },
): boolean {
  const candidates = [
    ...representativePaths(left.path, left.matchType),
    ...representativePaths(right.path, right.matchType),
  ];
  return candidates.some(path =>
    matchRulePath(path, left.path, left.matchType) !== null &&
    matchRulePath(path, right.path, right.matchType) !== null,
  );
}

/** Reject every direct loop and redirect chain before a rule is persisted. */
export function assertNoRedirectChains(rules: RedirectSnapshotRule[]): void {
  const sorted = sortRules(rules);
  for (const rule of sorted) {
    const sourceExample = representativePath(rule.sourcePath, rule.matchType);
    const capture = matchRulePath(sourceExample, rule.sourcePath, rule.matchType);
    if (capture === null) throw new Error(`Could not validate source pattern ${rule.sourcePath}.`);
    const destinationExample = applyRuleDestination(rule.destinationPath, rule.matchType, capture);
    const output = destinationPattern(rule);

    for (const candidate of sorted) {
      if (
        matchRulePath(destinationExample, candidate.sourcePath, candidate.matchType) === null &&
        !patternsOverlap(output, { path: candidate.sourcePath, matchType: candidate.matchType })
      ) continue;
      if (candidate.id === rule.id) throw new Error(`Redirect loop detected for ${rule.sourcePath}.`);
      throw new Error(`Redirect chain detected: ${rule.sourcePath} points to ${candidate.sourcePath}.`);
    }
  }
}
