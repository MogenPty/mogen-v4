/**
 * Instant client-side URL pre-validation for the audit form.
 *
 * No network, no DNS — catches obviously invalid input immediately so the
 * visitor gets a friendly message without waiting on a server round-trip.
 * The server always performs the full SSRF-safe validation regardless.
 *
 * Returns a human-friendly message, or null when the input is worth sending
 * to the server.
 */
export function prevalidateUrl(raw: string): string | null {
  const target = raw.trim();
  if (!target) return "Please enter your website address.";
  if (/\s/.test(target)) {
    return "Website addresses cannot contain spaces. Try something like yourbusiness.co.za.";
  }
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)
    ? target
    : `https://${target}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return "That doesn't look like a website address. Try something like yourbusiness.co.za.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Please enter a web address starting with http:// or https://.";
  }
  const host = parsed.hostname;
  if (host === "") return "Please enter your website address.";
  // Bare names without a domain ending can never be websites.
  if (!host.includes(".") && !host.includes(":") && !/^\d+$/.test(host)) {
    return "That looks incomplete — a website address needs a domain ending like .co.za or .com.";
  }
  return null;
}
