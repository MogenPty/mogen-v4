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
  return { generation, redirects: sortRules(redirects), gone: sortRules(gone) };
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

  for (const rule of snapshot.redirects) {
    if (!active(rule.expiresAt, now)) continue;
    const capture = matchRulePath(normalized, rule.sourcePath, rule.matchType);
    if (capture === null) continue;
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

  for (const rule of snapshot.gone) {
    if (!active(rule.expiresAt, now)) continue;
    if (matchRulePath(normalized, rule.sourcePath, rule.matchType) !== null) {
      return { kind: "gone", ruleId: rule.id };
    }
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

/** Reject every direct loop and redirect chain before a rule is persisted. */
export function assertNoRedirectChains(rules: RedirectSnapshotRule[]): void {
  const sorted = sortRules(rules);
  for (const rule of sorted) {
    const sourceExample = representativePath(rule.sourcePath, rule.matchType);
    const capture = matchRulePath(sourceExample, rule.sourcePath, rule.matchType);
    if (capture === null) throw new Error(`Could not validate source pattern ${rule.sourcePath}.`);
    const destinationExample = applyRuleDestination(rule.destinationPath, rule.matchType, capture);

    for (const candidate of sorted) {
      if (matchRulePath(destinationExample, candidate.sourcePath, candidate.matchType) === null) continue;
      if (candidate.id === rule.id) throw new Error(`Redirect loop detected for ${rule.sourcePath}.`);
      throw new Error(`Redirect chain detected: ${rule.sourcePath} points to ${candidate.sourcePath}.`);
    }
  }
}

