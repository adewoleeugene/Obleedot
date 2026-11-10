import { errorMessage, isDashError, unlessCancelled } from '@monimesl/dot-runtime';

import { getEvent } from '../../lib/api';
import { categoryLabel, ticketDetail, TBA, formatDateRange, formatMoney, formatTimeRange, isSoldOut, priceLabel } from '../../lib/format';
import { matchChoice, nowOnPhone, reminderChoices, reminderKey, reminderText, whenLabel } from '../../lib/reminders';
import { savedIds, setSaved } from '../../lib/saved';
import type { EventItem } from '../../lib/types';
import state, { type EventDetails } from './state';

/** '+23279555093' → "+232 79 555 093". */
function formatPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('232') && digits.length === 11) {
    return `+232 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return phone;
}

function toDetails(event: EventItem): EventDetails {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    startTime: event.startTime,
    image: event.image,
    categoryLabel: categoryLabel(event.category),
    kicker: [categoryLabel(event.category), event.ageLimit].filter(Boolean).join(' · '),
    summary: event.summary,
    description: event.description,
    dateLabel: formatDateRange(event.date, event.endDate),
    timeLabel: formatTimeRange(event.startTime, event.endTime),
    venue: event.venue || TBA,
    address: [event.address, event.city].filter(Boolean).join(', '),
    organizer: event.organizer,
    dressCode: event.dressCode ?? '',
    ageLimit: event.ageLimit ?? '',
    phone: event.phone ?? '',
    phoneLabel: event.phone ? formatPhone(event.phone) : '',
    website: event.website ?? '',
    priceLabel: priceLabel(event),
    soldOut: isSoldOut(event),
    prices: event.prices.map((price) => ({
      id: price.id,
      name: price.name,
      description: price.description,
      detail: ticketDetail(price),
      priceLabel: price.price === 0 ? 'Free' : formatMoney(price.price, price.currency),
      soldOut: price.soldOut === true,
    })),
  };
}

/** What to tell the person when Dash refuses a reminder. */
function reminderError(error: unknown): string {
  if (isDashError(error, 'denied')) {
    return 'Reminders are turned off for Salone Events. Turn them on in Dash to use this.';
  }
  if (isDashError(error, 'failed')) {
    return 'You already have 12 reminders coming up. Turn one off first.';
  }
  return errorMessage(error) || "The reminder wasn't set.";
}

export default definePage({
  initialState: state,
  // A share link such as https://dashit.to/d/<code>/event?event=drizilik-audacity opens this page.
  share: { options: ['event'] },
  hooks: {
    async onLoad(options) {
      this.setState({ eventId: options.event ?? '' });
      await this.actions.load();
    },
    async onRefresh() {
      await this.actions.load();
    },
  },
  mutations: {
    clearToast: () => ({ toast: '' }),
    openReminderSheet: () => ({ reminderSheetOpen: true }),
    closeReminderSheet: () => ({ reminderSheetOpen: false }),
    /** Picks the panel shape closest to the poster's, so it shows whole with no empty bands. */
    posterLoaded: (_state, event: DotEvent<{ width: number; height: number }>) => {
      const ratio = event.detail.width / event.detail.height;
      const shapes = [
        ['2:3', 2 / 3],
        ['3:4', 3 / 4],
        ['1:1', 1],
        ['4:3', 4 / 3],
      ] as const;
      const [posterAspect] = shapes.reduce((best, shape) =>
        Math.abs(shape[1] - ratio) < Math.abs(best[1] - ratio) ? shape : best,
      );
      return { posterAspect };
    },
  },
  actions: {
    async load(state) {
      if (!state.eventId) {
        this.setState({ loading: false, notFound: true });
        return;
      }
      this.setState({ loading: this.state.event === null, error: '', notFound: false });
      try {
        const event = await getEvent(this.dash, state.eventId);
        if (!event) {
          this.setState({ notFound: true, event: null });
          return;
        }
        const details = toDetails(event);
        this.setState({ event: details, reminderChoices: reminderChoices(details, nowOnPhone()) });
        await this.actions.loadPersonal();
      } catch (error) {
        this.setState({ error: errorMessage(error) || "We couldn't load this event." });
      } finally {
        this.setState({ loading: false });
      }
    },
    /** Whether it's saved and which reminder is set. Neither is worth an error if Dash can't say. */
    async loadPersonal(state) {
      if (!state.event) {
        return;
      }
      const id = state.event.id;
      const [saved, reminders] = await Promise.all([
        savedIds(this.dash).catch(() => [] as string[]),
        this.dash.reminders.list().catch(() => []),
      ]);
      const existing = reminders.find((reminder) => reminder.key === reminderKey(id));
      this.setState((current) => ({
        saved: saved.includes(id),
        reminderChoice: existing ? matchChoice(current.reminderChoices, existing.schedule) : '',
        reminderWhen: existing ? whenLabel(existing.schedule.start, existing.schedule.time ?? '09:00') : '',
      }));
    },
    async toggleSave(state) {
      if (!state.event) {
        return;
      }
      const saved = !state.saved;
      this.setState({ saved });
      try {
        await setSaved(this.dash, state.event.id, saved);
      } catch (error) {
        this.setState({ saved: !saved, toast: errorMessage(error) || "That didn't save.", toastTone: 'danger' });
      }
    },
    async setReminder(state, event: ValueEvent) {
      const details = state.event;
      const choice = state.reminderChoices.find((item) => item.id === event.detail.value);
      if (!details || !choice) {
        return;
      }
      // Only show it as set once Dash says so: the first time, Dash asks the person first.
      const when = whenLabel(choice.date, choice.time);
      try {
        await this.dash.reminders.set({
          key: reminderKey(details.id),
          ...reminderText(details, choice),
          page: `/event?event=${encodeURIComponent(details.id)}`,
          schedule: { start: choice.date, time: choice.time },
        });
        this.setState({ reminderChoice: choice.id, reminderWhen: when, reminderSheetOpen: false, toast: `We'll remind you ${when}`, toastTone: 'success' });
      } catch (error) {
        this.setState({ toast: reminderError(error), toastTone: 'danger' });
      }
    },
    async removeReminder(state) {
      if (!state.event) {
        return;
      }
      try {
        await this.dash.reminders.cancel(reminderKey(state.event.id));
        this.setState({ reminderChoice: '', reminderWhen: '', reminderSheetOpen: false, toast: 'Reminder turned off', toastTone: 'success' });
      } catch (error) {
        this.setState({ toast: reminderError(error), toastTone: 'danger' });
      }
    },
    async share(state) {
      const event = state.event;
      if (!event) {
        return;
      }
      const where = event.venue === TBA ? '' : ` at ${event.venue}`;
      const text = `${event.title}: ${event.dateLabel}${where}. Find it in Salone Events on Dash.`;
      const url = env.SHARE_URL ? `${env.SHARE_URL.replace(/\/$/, '')}/event?event=${encodeURIComponent(event.id)}` : undefined;
      try {
        await unlessCancelled(this.dash.system.share({ title: event.title, text, url }));
      } catch (error) {
        this.setState({ toast: errorMessage(error), toastTone: 'danger' });
      }
    },
    async call(state) {
      if (!state.event?.phone) {
        return;
      }
      try {
        await unlessCancelled(this.dash.system.dial(state.event.phone));
      } catch (error) {
        if (!isDashError(error, 'cancelled')) {
          this.setState({ toast: errorMessage(error), toastTone: 'danger' });
        }
      }
    },
    backToEvents() {
      this.navigation.reset('index');
    },
  },
});
