export type GscSuggestion = { destination: string | null; reason: string };

export function suggestGscDestination(
  sourcePath: string,
  existingRedirects: Map<string, string>,
  currentPages: Set<string>,
  articleSlugs: Set<string>,
  promotionSlugs: Set<string>,
): GscSuggestion {
  const existing = existingRedirects.get(sourcePath);
  if (existing) return { destination: null, reason: `An existing redirect already sends this path to ${existing}; no new rule is needed.` };
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
