export type UserAgentClass = "browser" | "search" | "ai" | "social" | "automation" | "unknown";

export function classifyUserAgent(value: string): UserAgentClass {
  const userAgent = value.toLowerCase();
  if (/googlebot|bingbot|duckduckbot|yandexbot|baiduspider/.test(userAgent)) return "search";
  if (/gptbot|chatgpt|claudebot|anthropic|perplexitybot|bytespider/.test(userAgent)) return "ai";
  if (/facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp/.test(userAgent)) return "social";
  if (/bot|crawler|spider|curl|wget|python|httpclient|headless/.test(userAgent)) return "automation";
  if (/mozilla|safari|chrome|firefox|edge|opera/.test(userAgent)) return "browser";
  return "unknown";
}
