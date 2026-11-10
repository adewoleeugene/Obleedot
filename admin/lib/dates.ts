// Dates are 'YYYY-MM-DD' text, so they compare correctly as strings. Sierra Leone keeps GMT all
// year, so UTC is Freetown time.

export function todayInFreetown(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The event's last day. */
export function lastDay(event: { date: string; endDate?: string }): string {
  return event.endDate && event.endDate > event.date ? event.endDate : event.date;
}

/** Still showing in the dot: it hasn't ended yet. */
export function isUpcoming(event: { date: string; endDate?: string }, today: string): boolean {
  return lastDay(event) >= today;
}

/**
 * Ready to delete: a full day has passed since its last day. The day of grace keeps events that
 * run past midnight (doors close at 3 am) until the morning after.
 */
export function isExpired(event: { date: string; endDate?: string }, today: string, graceDays = 1): boolean {
  return addDays(lastDay(event), graceDays) < today;
}
