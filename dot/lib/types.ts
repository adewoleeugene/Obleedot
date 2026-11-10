// The shapes the dot and its server share. The dot only shows events; nothing is bought in it.
// Money is in minor units: SLE 150.00 is 15000.

export type Currency = 'SLE' | 'USD';

export type Category = 'music' | 'party' | 'festival' | 'culture' | 'food' | 'hangout';

export type TicketType = 'early-bird' | 'regular' | 'gate' | 'vip' | 'vvip' | 'table' | 'group' | 'student' | 'other';

export type TicketPrice = {
  id: string;
  /** Left out on tickets saved before types existed, and may be one this dot doesn't know. */
  type?: TicketType;
  /** Always set: the type's label, or a name such as "Table for 6". */
  name: string;
  description: string;
  price: number;
  currency: Currency;
  soldOut?: boolean;
};

export type EventItem = {
  id: string;
  title: string;
  category: Category;
  summary: string;
  /** Markdown. */
  description: string;
  /** 'YYYY-MM-DD' */
  date: string;
  /** 'YYYY-MM-DD', for events over several days. */
  endDate?: string;
  /** 'HH:MM', 24-hour. Empty when not announced. */
  startTime: string;
  /** 'HH:MM', or 'late'. Empty when not given. */
  endTime: string;
  /** Empty when not announced. */
  venue: string;
  address: string;
  city: string;
  organizer: string;
  /** The poster: statics/... or an https address on a host in dot.json network.hosts. */
  image: string;
  /** A landscape (16:9) picture for the featured carousel. Without one, the card shows the poster beside the details. */
  banner?: string;
  featured: boolean;
  dressCode?: string;
  ageLimit?: string;
  /** A phone number for reservations or RSVP, such as '+23279555093'. */
  phone?: string;
  /** An https address. */
  website?: string;
  /** Empty when prices aren't announced. */
  prices: TicketPrice[];
};
