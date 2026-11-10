import type { Category, Currency, EventItem } from './types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const TBA = 'To be announced';

export const CATEGORY_LABELS: Record<Category, string> = {
  music: 'Concerts',
  party: 'Parties',
  festival: 'Festivals',
  culture: 'Culture & art',
  food: 'Food & drink',
  hangout: 'Hangouts',
};

/** The category's label, or '' for one this version of the dot doesn't know yet. */
export function categoryLabel(category: string): string {
  return (CATEGORY_LABELS as Record<string, string>)[category] ?? '';
}

function groupThousands(whole: number): string {
  return String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 15000 → "SLE 150", 15050 → "SLE 150.50", USD 2500 → "$25". */
export function formatMoney(value: number, currency: Currency = 'SLE'): string {
  const whole = Math.floor(value / 100);
  const cents = value % 100;
  const amount = cents === 0 ? groupThousands(whole) : `${groupThousands(whole)}.${String(cents).padStart(2, '0')}`;
  return currency === 'USD' ? `$${amount}` : `${currency} ${amount}`;
}

function parts(date: string): [number, number, number] | null {
  const [year, month, day] = date.split('-').map(Number);
  return year && month && day ? [year, month, day] : null;
}

/** '2026-11-28' → "Sat 28 Nov 2026". */
export function formatDate(date: string): string {
  const p = parts(date);
  if (!p) {
    return date;
  }
  const [year, month, day] = p;
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${DAYS[weekday]} ${day} ${MONTHS[month - 1]} ${year}`;
}

/** '2026-11-28' → "28 Nov". */
export function formatShortDate(date: string): string {
  const p = parts(date);
  return p ? `${p[2]} ${MONTHS[p[1] - 1]}` : date;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** '2026-11-28' → "Sat 28 Nov". */
export function weekdayDate(date: string): string {
  const p = parts(date);
  if (!p) {
    return date;
  }
  const weekday = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
  return `${DAYS[weekday]} ${p[2]} ${MONTHS[p[1] - 1]}`;
}

/** '2026-12' → "December", or "January 2027" when it isn't this year. */
export function monthLabel(monthKey: string, currentYear: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) {
    return monthKey;
  }
  const name = MONTH_NAMES[month - 1] ?? monthKey;
  return year === currentYear ? name : `${name} ${year}`;
}

/** "Sat 28 Nov 2026", or "25 Nov – 30 Nov 2026" over several days. */
export function formatDateRange(date: string, endDate?: string): string {
  if (!endDate || endDate === date) {
    return formatDate(date);
  }
  const end = parts(endDate);
  return end ? `${formatShortDate(date)} – ${formatShortDate(endDate)} ${end[0]}` : formatDate(date);
}

/** '19:30' → "7:30 pm", 'late' → "late". */
export function formatTime(time: string): string {
  if (time === 'late') {
    return 'late';
  }
  const [hours, minutes] = time.split(':').map(Number);
  if (hours === undefined || minutes === undefined || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }
  const suffix = hours < 12 ? 'am' : 'pm';
  const hour = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0 ? `${hour} ${suffix}` : `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export function formatTimeRange(start: string, end: string): string {
  if (!start) {
    return TBA;
  }
  if (!end) {
    return `From ${formatTime(start)}`;
  }
  return end === 'late' ? `${formatTime(start)} till late` : `${formatTime(start)} – ${formatTime(end)}`;
}

/** The venue and city, or the city alone while the venue isn't announced. */
export function placeLabel(event: EventItem): string {
  return event.venue ? `${event.venue}, ${event.city}` : `${event.city} · venue to be announced`;
}

export function isSoldOut(event: EventItem): boolean {
  return event.prices.length > 0 && event.prices.every((price) => price.soldOut);
}

/** "From SLE 150", "$100", "Free", "Sold out" or "Price to be announced". */
export function priceLabel(event: EventItem): string {
  if (event.prices.length === 0) {
    return 'Price to be announced';
  }
  if (isSoldOut(event)) {
    return 'Sold out';
  }
  const open = event.prices.filter((price) => !price.soldOut);
  // Compare like with like: the lowest price in the currency most prices use, preferring SLE.
  const currency: Currency = open.some((price) => price.currency === 'SLE') ? 'SLE' : 'USD';
  const values = open.filter((price) => price.currency === currency).map((price) => price.price);
  const lowest = Math.min(...values);
  if (lowest === 0) {
    return 'Free';
  }
  return open.length === 1 ? formatMoney(lowest, currency) : `From ${formatMoney(lowest, currency)}`;
}
