import { applyRuleDestination, matchRulePath, type RedirectMatchType } from "./paths";

export type GscSuggestion = { destination: string | null; reason: string };
export type GscRedirectRule = {
  sourcePath: string;
  destinationPath: string;
  matchType: RedirectMatchType;
};

export function suggestGscDestination(
  sourcePath: string,
  existingRedirects: GscRedirectRule[],
  currentPages: Set<string>,
  articleSlugs: Set<string>,
  promotionSlugs: Set<string>,
): GscSuggestion {
  for (const rule of existingRedirects) {
    const capture = matchRulePath(sourcePath, rule.sourcePath, rule.matchType);
    if (capture === null) continue;
    const destination = applyRuleDestination(rule.destinationPath, rule.matchType, capture);
    return { destination: null, reason: `An existing redirect already sends this path to ${destination}; no new rule is needed.` };
  }
  if (currentPages.has(sourcePath)) return { destination: null, reason: "This is already a current published page; a redirect is not suggested." };
  const finalSegment = sourcePath.split("/").filter(Boolean).at(-1) ?? "";
  if (articleSlugs.has(finalSegment)) {
    return { destination: `/articles/${finalSegment}`, reason: "The final slug exactly matches a published article." };
  }
  if (promotionSlugs.has(finalSegment)) {
    return { destination: `/promotions/${finalSegment}`, reason: "The final slug exactly matches a current promotion." };
  }
  return { destination: null, reason: "No reliable exact match was found; review manually before taking action." };
}
