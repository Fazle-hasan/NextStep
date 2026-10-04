// Dates are stored in UTC and shown in the viewer's locale. India is the launch market (D-006),
// so server-rendered dates use Asia/Kolkata.

const TIME_ZONE = "Asia/Kolkata";

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: TIME_ZONE }).format(
    new Date(value),
  );
}

export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
    timeZoneName: "short",
  }).format(new Date(value));
}

// "today", "yesterday", "5 days ago", "3 weeks ago", then a date.
export function timeAgo(value: string | Date, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return formatDate(value);
}
