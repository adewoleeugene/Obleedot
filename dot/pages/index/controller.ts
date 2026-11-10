import { errorMessage, unlessCancelled } from '@monimesl/dot-runtime';

import { listEvents, today as todayOnPhone, usingSampleData } from '../../lib/api';
import { byMonth, categoriesFor, filterCards, toCard, type EventCard } from '../../lib/cards';
import { dateOptionsFor, matchesDate } from '../../lib/dates';
import { formatShortDate, weekdayDate } from '../../lib/format';
import { pruneSaved, savedIds } from '../../lib/saved';
import type { EventItem } from '../../lib/types';
import state from './state';

const currentYear = new Date().getFullYear();

type Filters = {
  query: string;
  category: string;
  dateFilter: string;
  pickedLabel: string;
  today: string;
  dateOptions: readonly { id: string; label: string }[];
  allSummary: string;
};

function view(cards: readonly EventCard[], f: Filters) {
  const filtering = f.query.trim() !== '' || f.category !== 'all' || f.dateFilter !== 'any';
  const results = filterCards(cards, f.query, f.category).filter((card) => matchesDate(card, f.dateFilter, f.today));
  const picked = f.dateFilter.startsWith('date:');
  const dateChipLabel = picked
    ? f.pickedLabel
    : f.dateFilter === 'any'
      ? 'Any date'
      : (f.dateOptions.find((option) => option.id === f.dateFilter)?.label ?? 'Any date');
  const count = `${results.length} of ${cards.length} ${cards.length === 1 ? 'event' : 'events'}`;
  return {
    summary: filtering ? count : f.allSummary,
    dateChipLabel,
    results,
    sections: byMonth(results, currentYear),
    showFeatured: !filtering,
    emptyTitle: picked ? `Nothing on ${f.pickedLabel}` : 'No events found',
    emptyText: picked ? 'Try another day, or see every date.' : 'Try another search, category or date.',
  };
}

/** Saved ids → their cards, in saved order, skipping any that have ended. */
function savedCardsFor(cards: readonly EventCard[], ids: readonly string[]): EventCard[] {
  const byId = new Map(cards.map((card) => [card.id, card]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

function summarise(events: readonly EventItem[]): string {
  if (events.length === 0) {
    return 'Nothing on right now';
  }
  const first = events[0]!;
  const last = events[events.length - 1]!;
  const count = `${events.length} ${events.length === 1 ? 'event' : 'events'}`;
  return first.date === last.date
    ? `${count} · ${formatShortDate(first.date)}`
    : `${count} · ${formatShortDate(first.date)} to ${formatShortDate(last.date)}`;
}

export default definePage({
  initialState: state,
  hooks: {
    async onLoad() {
      this.setState({ sampleData: usingSampleData });
      await this.actions.load();
    },
    async onRefresh() {
      await this.actions.load();
    },
    // Coming back from an event page, where the person may have saved or unsaved it.
    async onShow() {
      await this.actions.refreshSaved();
    },
  },
  mutations: {
    setQuery: (state, event: ValueEvent) => ({
      query: event.detail.value,
      ...view(state.cards, { ...state, query: event.detail.value }),
    }),
    /** Tapping a category turns it on; tapping it again turns it off and shows every category. */
    toggleCategory: (state, event: DataEvent<{ id: string }>) => {
      const category = state.category === event.data.id ? 'all' : event.data.id;
      return { category, ...view(state.cards, { ...state, category }) };
    },
    openDateSheet: () => ({ dateSheetOpen: true }),
    closeDateSheet: () => ({ dateSheetOpen: false }),
    chooseDate: (state, event: ValueEvent) => ({
      dateFilter: event.detail.value,
      pickedLabel: '',
      dateSheetOpen: false,
      ...view(state.cards, { ...state, dateFilter: event.detail.value, pickedLabel: '' }),
    }),
    clearFilters: (state) => {
      const cleared = { query: '', category: 'all', dateFilter: 'any', pickedLabel: '', dateSheetOpen: false };
      return { ...cleared, ...view(state.cards, { ...state, ...cleared }) };
    },
  },
  actions: {
    async load() {
      this.setState({ loading: this.state.cards.length === 0, error: '' });
      try {
        const events = await listEvents(this.dash);
        const today = todayOnPhone();
        const cards = events.map(toCard);
        const categories = categoriesFor(cards);
        const dateOptions = dateOptionsFor(cards, today);
        const lastDay = events.reduce((last, e) => ((e.endDate || e.date) > last ? e.endDate || e.date : last), today);
        this.setState((current) => {
          // A filter whose events have all ended is gone: go back to showing everything.
          const category = categories.some((item) => item.id === current.category) ? current.category : 'all';
          const keepDate =
            current.dateFilter.startsWith('date:') || dateOptions.some((item) => item.id === current.dateFilter);
          const dateFilter = keepDate ? current.dateFilter : 'any';
          const pickedLabel = keepDate ? current.pickedLabel : '';
          return {
            cards,
            categories,
            category,
            dateOptions,
            dateFilter,
            pickedLabel,
            today,
            lastDay,
            allSummary: summarise(events),
            featured: cards.filter((card) => card.featured),
            ...view(cards, { query: current.query, category, dateFilter, pickedLabel, today, dateOptions, allSummary: summarise(events) }),
          };
        });
        // Events that ended or were taken down drop out of the saved list for good.
        const kept = await pruneSaved(this.dash, new Set(cards.map((card) => card.id))).catch(() => [] as string[]);
        this.setState({ savedCards: savedCardsFor(cards, kept) });
      } catch (error) {
        this.setState({ error: errorMessage(error) || "We couldn't load events." });
      } finally {
        this.setState({ loading: false });
      }
    },
    async refreshSaved() {
      if (this.state.cards.length === 0) {
        return;
      }
      const ids = await savedIds(this.dash).catch(() => null);
      if (ids) {
        this.setState((current) => ({ savedCards: savedCardsFor(current.cards, ids) }));
      }
    },
    async pickDate(state) {
      this.setState({ dateSheetOpen: false });
      try {
        const picked = await unlessCancelled(
          this.dash.ui.pickDate({
            title: 'Pick a date',
            value: state.dateFilter.startsWith('date:') ? state.dateFilter.slice(5) : state.today,
            min: state.today,
            max: state.lastDay,
          }),
        );
        if (!picked) {
          return;
        }
        const dateFilter = `date:${picked}`;
        const pickedLabel = weekdayDate(picked);
        this.setState((current) => ({
          dateFilter,
          pickedLabel,
          ...view(current.cards, { ...current, dateFilter, pickedLabel }),
        }));
      } catch (error) {
        this.setState({ error: errorMessage(error) });
      }
    },
    openEvent(_state, event: DataEvent<{ id: string }>) {
      this.navigation.push('event', { event: event.data.id });
    },
  },
});
