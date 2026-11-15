const BUSINESS_TIME_ZONE = "Africa/Johannesburg";

export function formatPromotionInstant(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-ZA", {
      timeZone: BUSINESS_TIME_ZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).map(part => [part.type, part.value]),
  );
  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} SAST (UTC+02:00)`;
}
