import type { ReminderChoice } from '../../lib/reminders';

export type EventDetails = {
  id: string;
  title: string;
  /** 'YYYY-MM-DD' and 'HH:MM' (or ''), for reminders. */
  date: string;
  startTime: string;
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
  toastTone: 'danger' as 'danger' | 'success',
  /** Whether this event is in the person's saved events. */
  saved: false,
  /** The reminder times still to come; empty once the event is under way. */
  reminderChoices: [] as ReminderChoice[],
  /** The chosen reminder's id, or '' when none is set. */
  reminderChoice: '',
  /** Such as "Thu 19 Nov, 6 pm". */
  reminderWhen: '',
  reminderSheetOpen: false,
  /** The poster panel's shape, matched to the poster once it loads. */
  posterAspect: '3:4' as '1:1' | '3:4' | '2:3' | '4:3',
};
