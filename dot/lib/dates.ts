// Date filters for the event list. Dates are 'YYYY-MM-DD' text throughout, so comparing them as
// strings orders them correctly.

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export type DateOption = { id: string; label: string };

/** Anything with a start and, for events over several days, an end. */
type Dated = { date: string; endDate: string };

function toUtc(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

function fromUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addDays(date: string, days: number): string {
  const next = toUtc(date);
  next.setUTCDate(next.getUTCDate() + days);
  return fromUtc(next);
}

/** The weekend people mean when they go out: Friday to Sunday. From Monday to Thursday it's the coming one. */
function weekend(today: string): [string, string] {
  const weekday = toUtc(today).getUTCDay(); // 0 Sunday … 6 Saturday
  if (weekday === 0) {
    return [today, today];
  }
  if (weekday >= 5) {
    return [today, addDays(today, 7 - weekday)];
  }
  const friday = addDays(today, 5 - weekday);
  return [friday, addDays(friday, 2)];
}

function monthEnd(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return fromUtc(new Date(Date.UTC(year ?? 1970, month ?? 1, 0)));
}

/**
 * The days a filter covers, or null for "any date".
 * Ids: 'any', 'today', 'weekend', 'week', 'month:YYYY-MM', 'date:YYYY-MM-DD'.
 */
export function dateRange(id: string, today: string): [string, string] | null {
  if (id === 'today') {
    return [today, today];
  }
  if (id === 'weekend') {
    return weekend(today);
  }
  if (id === 'week') {
    return [today, addDays(today, 6)];
  }
  if (id.startsWith('month:')) {
    const key = id.slice(6);
    const start = `${key}-01`;
    return [start < today ? today : start, monthEnd(key)];
  }
  if (id.startsWith('date:')) {
    const day = id.slice(5);
    return [day, day];
  }
  return null;
}

/** Whether the event is on during any of the filter's days. */
export function matchesDate(item: Dated, id: string, today: string): boolean {
  const range = dateRange(id, today);
  if (!range) {
    return true;
  }
  const [start, end] = range;
  return item.date <= end && (item.endDate || item.date) >= start;
}

function monthName(monthKey: string, currentYear: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const name = MONTH_NAMES[(month ?? 1) - 1] ?? monthKey;
  return year === currentYear ? name : `${name} ${year}`;
}

/** "Any date", then only the quick filters and months that have at least one event. */
export function dateOptionsFor(items: readonly Dated[], today: string): DateOption[] {
  const currentYear = Number(today.slice(0, 4));
  const quick: DateOption[] = [
    { id: 'today', label: 'Today' },
    { id: 'weekend', label: 'This weekend' },
    { id: 'week', label: 'Next 7 days' },
  ];
  const months = [...new Set(items.map((item) => item.date.slice(0, 7)))]
    .sort()
    .map((key) => ({ id: `month:${key}`, label: monthName(key, currentYear) }));
  const options = [...quick, ...months].filter((option) => items.some((item) => matchesDate(item, option.id, today)));
  return [{ id: 'any', label: 'Any date' }, ...options];
}
