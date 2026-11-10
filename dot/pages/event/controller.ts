import { errorMessage, isDashError, unlessCancelled } from '@monimesl/dot-runtime';

import { getEvent } from '../../lib/api';
import { CATEGORY_LABELS, TBA, formatDateRange, formatMoney, formatTimeRange, isSoldOut, priceLabel } from '../../lib/format';
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
    image: event.image,
    categoryLabel: CATEGORY_LABELS[event.category],
    kicker: [CATEGORY_LABELS[event.category], event.ageLimit].filter(Boolean).join(' · '),
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
      priceLabel: price.price === 0 ? 'Free' : formatMoney(price.price, price.currency),
      soldOut: price.soldOut === true,
    })),
  };
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
        this.setState({ event: toDetails(event) });
      } catch (error) {
        this.setState({ error: errorMessage(error) || "We couldn't load this event." });
      } finally {
        this.setState({ loading: false });
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
        this.setState({ toast: errorMessage(error) });
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
          this.setState({ toast: errorMessage(error) });
        }
      }
    },
    backToEvents() {
      this.navigation.reset('index');
    },
  },
});
