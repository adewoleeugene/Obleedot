import '@monimesl/dot-runtime/testing';
import { describe, expect, it } from 'vitest';

import { upcoming } from '../lib/api';
import { filterCards, toCard } from '../lib/cards';
import { formatDateRange, formatMoney, formatTime, formatTimeRange, priceLabel } from '../lib/format';
import { SAMPLE_EVENTS } from '../lib/sample-data';

const byId = (id: string) => SAMPLE_EVENTS.find((event) => event.id === id)!;

describe('format', () => {
  it('formats money in minor units', () => {
    expect(formatMoney(15000)).toBe('SLE 150');
    expect(formatMoney(15050)).toBe('SLE 150.50');
    expect(formatMoney(200000)).toBe('SLE 2,000');
    expect(formatMoney(2500, 'USD')).toBe('$25');
  });
  it('formats dates and times', () => {
    expect(formatDateRange('2026-11-20')).toBe('Fri 20 Nov 2026');
    expect(formatDateRange('2026-11-25', '2026-11-30')).toBe('25 Nov – 30 Nov 2026');
    expect(formatTime('19:30')).toBe('7:30 pm');
    expect(formatTimeRange('15:00', '03:00')).toBe('3 pm – 3 am');
    expect(formatTimeRange('14:00', 'late')).toBe('2 pm till late');
    expect(formatTimeRange('', '')).toBe('To be announced');
  });
  it('labels prices', () => {
    expect(priceLabel(byId('drizilik-audacity'))).toBe('From SLE 150');
    expect(priceLabel(byId('heritage-affair'))).toBe('$100');
    expect(priceLabel(byId('freetown-detty-rave'))).toBe('From SLE 1,000');
    expect(priceLabel(byId('thoa'))).toBe('Price to be announced');
  });
});

describe('events', () => {
  it('hides events that have ended and sorts the rest by date', () => {
    const shown = upcoming(SAMPLE_EVENTS, '2026-11-22').map((event) => event.id);
    expect(shown).not.toContain('drizilik-audacity');
    expect(shown[0]).toBe('one-nation-reggae-festival-2');
    // A festival over several days shows until its last day.
    expect(upcoming(SAMPLE_EVENTS, '2026-11-30').map((e) => e.id)).toContain('one-nation-reggae-festival-2');
  });

  it('filters by category and search words', () => {
    const cards = SAMPLE_EVENTS.map(toCard);
    expect(filterCards(cards, '', 'music').map((c) => c.id)).toEqual(['drizilik-audacity']);
    expect(filterCards(cards, 'king sully', 'all')).toHaveLength(3);
    expect(filterCards(cards, 'chapter one', 'party').map((c) => c.id).sort()).toEqual(['freetown-detty-rave', 'rooftop-day-party']);
    expect(filterCards(cards, 'nothing matches', 'all')).toEqual([]);
  });
});

describe('categoriesFor', () => {
  it('lists only categories that have events', async () => {
    const { categoriesFor } = await import('../lib/cards');
    const cards = SAMPLE_EVENTS.filter((e) => e.category === 'party' || e.category === 'music').map(toCard);
    expect(categoriesFor(cards).map((c) => c.id)).toEqual(['party', 'music']);
    expect(categoriesFor([])).toEqual([]);
  });
});

describe('byMonth', () => {
  it('groups events by month and adds the year when it differs', async () => {
    const { byMonth } = await import('../lib/cards');
    const cards = upcoming(SAMPLE_EVENTS, '2026-11-01').map(toCard);
    const sections = byMonth(cards, 2026);
    expect(sections.map((s) => s.label)).toEqual(['November', 'December', 'January 2027']);
    expect(sections.reduce((n, s) => n + s.events.length, 0)).toBe(cards.length);
  });
});

describe('date filters', () => {
  it('works out the weekend, week and months', async () => {
    const { dateRange } = await import('../lib/dates');
    expect(dateRange('weekend', '2026-11-18')).toEqual(['2026-11-20', '2026-11-22']); // Wed → Fri–Sun
    expect(dateRange('weekend', '2026-11-21')).toEqual(['2026-11-21', '2026-11-22']); // Sat → Sat–Sun
    expect(dateRange('weekend', '2026-11-22')).toEqual(['2026-11-22', '2026-11-22']); // Sun
    expect(dateRange('week', '2026-11-28')).toEqual(['2026-11-28', '2026-12-04']);
    expect(dateRange('month:2026-11', '2026-11-18')).toEqual(['2026-11-18', '2026-11-30']);
    expect(dateRange('any', '2026-11-18')).toBeNull();
  });

  it('matches events over several days and offers only filters with events', async () => {
    const { dateOptionsFor, matchesDate } = await import('../lib/dates');
    const cards = upcoming(SAMPLE_EVENTS, '2026-11-18').map(toCard);
    const reggae = cards.find((c) => c.id === 'one-nation-reggae-festival-2')!;
    expect(matchesDate(reggae, 'date:2026-11-28', '2026-11-18')).toBe(true);
    expect(matchesDate(reggae, 'date:2026-12-01', '2026-11-18')).toBe(false);
    const ids = dateOptionsFor(cards, '2026-11-18').map((o) => o.id);
    expect(ids).toEqual(['any', 'weekend', 'week', 'month:2026-11', 'month:2026-12', 'month:2027-01']);
    // Nothing on 18 Nov itself, so no Today chip.
    expect(ids).not.toContain('today');
  });
});

describe('categories', () => {
  it('knows Hangouts and shows its chip only when a hangout is on', async () => {
    const { categoriesFor } = await import('../lib/cards');
    const hangout = toCard({ ...byId('drizilik-audacity'), id: 'chill', category: 'hangout' });
    expect(hangout.categoryLabel).toBe('Hangouts');
    expect(categoriesFor([hangout]).map((c) => c.label)).toEqual(['Hangouts']);
  });
  it('shows an event from a category this version does not know, with no label', () => {
    const future = toCard({ ...byId('drizilik-audacity'), category: 'sports' as never });
    expect(future.categoryLabel).toBe('');
  });
});

describe('ticket types', () => {
  it('adds the type under a ticket whose name does not already say it', async () => {
    const { ticketDetail } = await import('../lib/format');
    const base = { id: 't', price: 1000, currency: 'SLE' as const };
    expect(ticketDetail({ ...base, type: 'table', name: 'Table for 6', description: 'Includes a bottle' })).toBe('Includes a bottle');
    expect(ticketDetail({ ...base, type: 'vip', name: 'Front row', description: 'Includes a bottle' })).toBe('VIP · Includes a bottle');
    expect(ticketDetail({ ...base, type: 'early-bird', name: 'Early bird', description: 'Until 15 Dec' })).toBe('Until 15 Dec');
    expect(ticketDetail({ ...base, type: 'early-bird', name: 'Early bird kids', description: 'Under 12' })).toBe('Under 12');
    expect(ticketDetail({ ...base, type: 'early-bird', name: 'Kids', description: '' })).toBe('Early bird');
    expect(ticketDetail({ ...base, name: 'Per person', description: '' })).toBe('');
    expect(ticketDetail({ ...base, type: 'mystery' as never, name: 'Mystery', description: 'Soon' })).toBe('Soon');
  });
});
