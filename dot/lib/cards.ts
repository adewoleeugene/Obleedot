// Turns events into the plain rows the list pages show, and filters them.
import { CATEGORY_LABELS, formatDateRange, formatShortDate, formatTime, isSoldOut, monthLabel, priceLabel, weekdayDate } from './format';
import type { Category, EventItem } from './types';

export type EventCard = {
  id: string;
  title: string;
  image: string;
  /** Empty when the event has no landscape banner. */
  banner: string;
  category: Category;
  categoryLabel: string;
  dateLabel: string;
  subtitle: string;
  /** The row's first line, such as "Fri 20 Nov · 7 pm". */
  dateLine: string;
  /** The row's last line: the place, then the price when there is one. */
  metaLine: string;
  /** The date line on a featured card, such as "20 Nov, 7 pm". */
  when: string;
  /** The venue, or the city while it isn't announced. */
  place: string;
  /** Empty while prices aren't announced, to keep the row short. */
  priceLabel: string;
  soldOut: boolean;
  featured: boolean;
  /** 'YYYY-MM', for grouping by month. */
  monthKey: string;
  /** 'YYYY-MM-DD' start, and the last day ('' for one-day events), for date filters. */
  date: string;
  endDate: string;
  /** Lowercase text the search matches against. */
  searchText: string;
};

function when(event: EventItem): string {
  if (event.endDate && event.endDate !== event.date) {
    return `${formatShortDate(event.date)} – ${formatShortDate(event.endDate)}`;
  }
  return event.startTime ? `${weekdayDate(event.date)}, ${formatTime(event.startTime)}` : weekdayDate(event.date);
}

function dateLine(event: EventItem): string {
  if (event.endDate && event.endDate !== event.date) {
    return `${weekdayDate(event.date)} – ${weekdayDate(event.endDate)}`;
  }
  return event.startTime ? `${weekdayDate(event.date)} · ${formatTime(event.startTime)}` : weekdayDate(event.date);
}

export function toCard(event: EventItem): EventCard {
  return {
    id: event.id,
    title: event.title,
    image: event.image,
    banner: event.banner ?? '',
    category: event.category,
    categoryLabel: CATEGORY_LABELS[event.category],
    dateLabel: formatDateRange(event.date, event.endDate),
    subtitle: `${when(event)} · ${event.venue || event.city}`,
    when: when(event),
    dateLine: dateLine(event),
    metaLine: [event.venue || event.city, event.prices.length ? priceLabel(event) : ''].filter(Boolean).join(' · '),
    place: event.venue || event.city,
    priceLabel: event.prices.length ? priceLabel(event) : '',
    soldOut: isSoldOut(event),
    featured: event.featured,
    monthKey: event.date.slice(0, 7),
    date: event.date,
    endDate: event.endDate ?? '',
    searchText: [event.title, event.venue, event.address, event.city, event.organizer, event.summary, CATEGORY_LABELS[event.category]]
      .join(' ')
      .toLowerCase(),
  };
}

export function filterCards(cards: readonly EventCard[], query: string, category: string): EventCard[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return cards.filter(
    (card) =>
      (category === 'all' || card.category === category) && words.every((word) => card.searchText.includes(word)),
  );
}

const CATEGORY_ORDER: Category[] = ['party', 'music', 'festival', 'culture', 'food'];

/** Only the categories that have at least one event. No chip chosen means all of them. */
export function categoriesFor(cards: readonly EventCard[]): { id: string; label: string }[] {
  const present = new Set(cards.map((card) => card.category));
  return CATEGORY_ORDER.filter((id) => present.has(id)).map((id) => ({ id, label: CATEGORY_LABELS[id] }));
}

export type MonthSection = { id: string; label: string; events: EventCard[] };

/** Groups cards, already in date order, by the month they start in. */
export function byMonth(cards: readonly EventCard[], currentYear: number): MonthSection[] {
  const sections: MonthSection[] = [];
  for (const card of cards) {
    let section = sections[sections.length - 1];
    if (!section || section.id !== card.monthKey) {
      section = { id: card.monthKey, label: monthLabel(card.monthKey, currentYear), events: [] };
      sections.push(section);
    }
    section.events.push(card);
  }
  return sections;
}
