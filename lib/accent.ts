/**
 * Accent selection (Task 7B §9–12).
 *
 * Appearance model:
 *   Appearance
 *   ├── Light / Dark / System  (owned by next-themes, untouched)
 *   └── Accent
 *       ├── Green   (default)
 *       └── Orange  (retained alternative)
 *
 * The accent is a semantic token switch only: `data-accent` on
 * `<html>` remaps --accent/--catalyst/--ring (see app/globals.css).
 * No stylesheet duplication, no backend, localStorage persistence.
 */

export const ACCENTS = ["green", "orange"] as const;
export type Accent = (typeof ACCENTS)[number];

export const DEFAULT_ACCENT: Accent = "green";
export const ACCENT_STORAGE_KEY = "mogen-accent";

export function isAccent(value: unknown): value is Accent {
  return value === "green" || value === "orange";
}

export function normalizeAccent(value: unknown): Accent {
  return isAccent(value) ? value : DEFAULT_ACCENT;
}

/** Read the persisted accent without touching the DOM (safe on server). */
export function getStoredAccent(): Accent {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  try {
    return normalizeAccent(window.localStorage.getItem(ACCENT_STORAGE_KEY));
  } catch {
    return DEFAULT_ACCENT;
  }
}

/** Persist the accent and apply it to <html data-accent>. */
export function setStoredAccent(accent: Accent): void {
  const normalized = normalizeAccent(accent);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ACCENT_STORAGE_KEY, normalized);
    } catch {
      // Persistence is best-effort; the attribute still applies for this session.
    }
    document.documentElement.dataset.accent = normalized;
  }
}

/**
 * Inline-script source for layout <head>: applies the stored (or default)
 * accent before first paint to avoid a flash of the wrong accent.
 * Must stay dependency-free — it runs before the bundle loads.
 */
export const ACCENT_INIT_SCRIPT = `(function(){try{var a=localStorage.getItem("${ACCENT_STORAGE_KEY}");if(a!=="green"&&a!=="orange")a="${DEFAULT_ACCENT}";document.documentElement.dataset.accent=a;}catch(e){document.documentElement.dataset.accent="${DEFAULT_ACCENT}";}})();`;
