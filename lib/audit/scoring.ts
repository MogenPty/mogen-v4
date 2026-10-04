/**
 * Deterministic evidence-based scoring.
 *
 * - Only PASS / FAIL / WARN with weight > 0 participate.
 * - PASS earns full weight, WARN earns half, FAIL earns zero.
 * - NOT_ASSESSED / NOT_APPLICABLE / HISTORICAL / INFERRED are excluded
 *   from both numerator and denominator — they never dilute the score.
 * - Same evidence in → same score out (pure function, no randomness).
 */

import {
  QUADRANT_LABELS,
  RULE_MAP,
  SCORED_STATUSES,
  type AuditSummary,
  type Finding,
  type QuadrantId,
  type QuadrantScore,
} from "./types";

export const PROVISIONAL_COVERAGE_THRESHOLD = 0.5;

export function scoreFindings(findings: Finding[]): AuditSummary {
  let earned = 0;
  let eligible = 0;
  let passed = 0;
  let warnings = 0;
  let failed = 0;
  let notAssessed = 0;
  let applicable = 0;

  for (const finding of findings) {
    const rule = RULE_MAP.get(finding.ruleId);
    if (!rule || rule.weight <= 0) continue; // informational rules never score
    if (finding.status === "NOT_APPLICABLE") continue;
    if (finding.status === "HISTORICAL" || finding.status === "INFERRED") continue;
    applicable += 1;
    if (!SCORED_STATUSES.has(finding.status)) {
      notAssessed += 1;
      continue;
    }
    eligible += rule.weight;
    if (finding.status === "PASS") {
      earned += rule.weight;
      passed += 1;
    } else if (finding.status === "WARN") {
      earned += rule.weight / 2;
      warnings += 1;
    } else {
      failed += 1;
    }
  }

  const assessed = passed + warnings + failed;
  const coverage = applicable === 0 ? 0 : assessed / applicable;
  const score = eligible === 0 ? null : Math.round((earned / eligible) * 100);
  const provisional = score !== null && coverage < PROVISIONAL_COVERAGE_THRESHOLD;

  return {
    score,
    provisional,
    coverage: Math.round(coverage * 100) / 100,
    passed,
    warnings,
    failed,
    notAssessed,
    assessed,
    applicable,
  };
}

export function scoreQuadrants(findings: Finding[]): QuadrantScore[] {
  const byQuadrant = new Map<QuadrantId, Finding[]>();
  for (const finding of findings) {
    const rule = RULE_MAP.get(finding.ruleId);
    if (!rule) continue;
    const list = byQuadrant.get(rule.quadrant) ?? [];
    list.push(finding);
    byQuadrant.set(rule.quadrant, list);
  }
  const order: QuadrantId[] = ["technical", "content", "search", "authority"];
  return order.map((id) => {
    const list = byQuadrant.get(id) ?? [];
    const summary = scoreFindings(list);
    return {
      id,
      label: QUADRANT_LABELS[id],
      score: summary.score,
      coverage: summary.coverage,
      assessed: summary.assessed,
      applicable: summary.applicable,
    };
  });
}

/**
 * Regression guard: every scored finding must carry evidence.
 * Returns the rule IDs that violate the contract.
 */
export function findingsMissingEvidence(findings: Finding[]): string[] {
  return findings
    .filter((f) => {
      const rule = RULE_MAP.get(f.ruleId);
      return (
        rule !== undefined &&
        rule.weight > 0 &&
        SCORED_STATUSES.has(f.status) &&
        f.evidence.length === 0
      );
    })
    .map((f) => f.ruleId);
}
