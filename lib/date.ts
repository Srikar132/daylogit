const TIME_ZONE = "Asia/Kolkata";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  month: "short",
  day: "numeric",
});

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  month: "long",
  day: "numeric",
  year: "numeric",
});

/**
 * "Today" in IST as a "YYYY-MM-DD" string. The server may run in UTC, so this
 * must be the only place `new Date()` is used to derive "today" — never
 * inline it in route/tool code, or a session near midnight IST logs against
 * the wrong date once UTC rolls over.
 */
export function todayIST(): string {
  return dateFormatter.format(new Date());
}

/** Adds (or subtracts, for negative `days`) whole days to a "YYYY-MM-DD" date string. */
export function addDaysIST(dateStr: string, days: number): string {
  const anchor = new Date(`${dateStr}T00:00:00Z`).getTime() + days * 86_400_000;
  return dateFormatter.format(anchor);
}

/**
 * Human label for a "YYYY-MM-DD" date string relative to today in IST:
 * "Today", "Yesterday", or "Jul 27".
 */
export function formatDateLabel(dateStr: string): string {
  const today = todayIST();
  if (dateStr === today) return "Today";
  if (dateStr === addDaysIST(today, -1)) return "Yesterday";
  return monthDayFormatter.format(new Date(`${dateStr}T00:00:00Z`));
}

/** Full date for the table view: "July 29, 2026". */
export function formatFullDate(dateStr: string): string {
  return fullDateFormatter.format(new Date(`${dateStr}T00:00:00Z`));
}
