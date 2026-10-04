/**
 * Duplicate / near-duplicate content detection.
 *
 * Compares actually-crawled page text — never URL similarity.
 * - Exact duplicates: normalized SHA-256 hash match.
 * - Near duplicates: Jaccard similarity over word 5-shingles.
 */

import { createHash } from "node:crypto";

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function contentHash(normalized: string): string {
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

function shingles(words: string[], k = 5): Set<string> {
  const set = new Set<string>();
  if (words.length === 0) return set;
  if (words.length <= k) {
    set.add(words.join(" "));
    return set;
  }
  for (let i = 0; i <= words.length - k; i += 1) {
    set.add(words.slice(i, i + k).join(" "));
  }
  return set;
}

/** Jaccard similarity in [0,1] over word shingles. */
export function jaccardSimilarity(a: string, b: string): number {
  const wordsA = a.split(" ").filter(Boolean);
  const wordsB = b.split(" ").filter(Boolean);
  if (wordsA.length === 0 && wordsB.length === 0) return 1;
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  const setA = shingles(wordsA);
  const setB = shingles(wordsB);
  let intersection = 0;
  for (const s of setA) {
    if (setB.has(s)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

export interface DuplicatePair {
  urlA: string;
  urlB: string;
  exact: boolean;
  similarity: number;
}

export interface DuplicateReport {
  pairs: DuplicatePair[];
  exactCount: number;
  nearCount: number;
}

/**
 * Compare crawled pages. Pages with < 30 normalized words are skipped
 * (too thin to assess duplication — caller reports NOT_ASSESSED instead).
 */
export function detectDuplicates(
  pages: { url: string; visibleText: string }[],
  nearThreshold = 0.8,
): DuplicateReport {
  const normalized = pages
    .map((p) => ({ url: p.url, text: normalizeText(p.visibleText) }))
    .filter((p) => p.text.split(" ").filter(Boolean).length >= 30);

  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = i + 1; j < normalized.length; j += 1) {
      const a = normalized[i];
      const b = normalized[j];
      const exact = contentHash(a.text) === contentHash(b.text);
      const similarity = exact ? 1 : jaccardSimilarity(a.text, b.text);
      if (exact || similarity >= nearThreshold) {
        pairs.push({ urlA: a.url, urlB: b.url, exact, similarity });
      }
    }
  }
  return {
    pairs,
    exactCount: pairs.filter((p) => p.exact).length,
    nearCount: pairs.filter((p) => !p.exact).length,
  };
}
