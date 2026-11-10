export type EventDetails = {
  id: string;
  title: string;
  image: string;
  categoryLabel: string;
  /** Such as "Parties · 18+". */
  kicker: string;
  summary: string;
  description: string;
  dateLabel: string;
  timeLabel: string;
  venue: string;
  address: string;
  organizer: string;
  dressCode: string;
  ageLimit: string;
  phone: string;
  phoneLabel: string;
  website: string;
  priceLabel: string;
  soldOut: boolean;
  prices: { id: string; name: string; description: string; priceLabel: string; soldOut: boolean }[];
};

export default {
  eventId: '',
  loading: true,
  notFound: false,
  error: '',
  event: null as EventDetails | null,
  toast: '',
  /** The poster panel's shape, matched to the poster once it loads. */
  posterAspect: '3:4' as '1:1' | '3:4' | '2:3' | '4:3',
};
