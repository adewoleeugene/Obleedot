// The event shape. The public API sends the dot exactly the `EventItem` fields; the admin
// fields stay on the server. Keep EventItem in step with the dot's lib/types.ts.

export const CATEGORIES = ['party', 'music', 'festival', 'culture', 'food', 'hangout'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  party: 'Parties',
  music: 'Concerts',
  festival: 'Festivals',
  culture: 'Culture & art',
  food: 'Food & drink',
  hangout: 'Hangouts',
};

export type Currency = 'SLE' | 'USD';

export type TicketPrice = {
  id: string;
  name: string;
  description: string;
  /** Minor units: SLE 150 is 15000. */
  price: number;
  currency: Currency;
  soldOut?: boolean;
};

export type EventItem = {
  id: string;
  title: string;
  category: Category;
  summary: string;
  description: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  venue: string;
  address: string;
  city: string;
  organizer: string;
  /** The poster's public Blob URL. */
  image: string;
  banner?: string;
  featured: boolean;
  dressCode?: string;
  ageLimit?: string;
  phone?: string;
  website?: string;
  prices: TicketPrice[];
};

export type StoredEvent = EventItem & {
  status: 'draft' | 'published';
  /** The poster's Blob pathname, to delete it with the event. */
  posterPathname: string;
  createdAt: string;
  updatedAt: string;
};

/** What the dot receives: the stored event without the admin fields. */
export function toPublic(event: StoredEvent): EventItem {
  const { status: _s, posterPathname: _p, createdAt: _c, updatedAt: _u, ...item } = event;
  return item;
}
