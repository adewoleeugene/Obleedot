import type { EventCard, MonthSection } from '../../lib/cards';

export default {
  loading: true,
  error: '',
  query: '',
  category: 'all',
  /** 'all', or the one category chip that's on. */
  categories: [] as { id: string; label: string }[],
  /** 'any', 'today', 'weekend', 'week', 'month:YYYY-MM' or 'date:YYYY-MM-DD'. */
  dateFilter: 'any',
  /** Only the date filters that have events. */
  dateOptions: [] as { id: string; label: string }[],
  /** What the date chip says: "Any date", "This weekend", "December" or a picked day. */
  dateChipLabel: 'Any date',
  dateSheetOpen: false,
  /** The date chosen with Pick a date, such as "Sat 21 Nov". */
  pickedLabel: '',
  /** Today on the phone, 'YYYY-MM-DD', set when events load. */
  today: '',
  /** The last day any event is on, the latest date the picker offers. */
  lastDay: '',
  /** Shown when nothing matches, such as "Nothing on Sat 21 Nov". */
  emptyTitle: 'No events found',
  emptyText: 'Try another search or category.',
  /** Every event, as loaded. */
  cards: [] as EventCard[],
  featured: [] as EventCard[],
  /** The events that match the search and category. */
  results: [] as EventCard[],
  /** The same events, grouped by month. */
  sections: [] as MonthSection[],
  showFeatured: true,
  /** Such as "16 events · 20 Nov to 3 Jan". */
  summary: '',
  /** The summary with no filters on. */
  allSummary: '',
  sampleData: false,
};
