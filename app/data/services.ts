// Re-export canonical service data from the single authoritative source.
// Keeping this file ensures both `@/data/services` and `@/app/data/services`
// resolve to the same data without duplication.
export * from "@/data/services";
