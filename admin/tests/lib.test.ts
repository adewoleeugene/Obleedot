import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

import { createSessionValue, isValidSession, passcodeMatches } from '@/lib/auth';
import { planCleanup } from '@/lib/cleanup';
import { isExpired, isUpcoming } from '@/lib/dates';
import { eventId } from '@/lib/slug';
import type { StoredEvent } from '@/lib/types';
import { eventInputSchema } from '@/lib/validate';

function event(id: string, date: string, extra: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id, title: id, category: 'party', summary: 's', description: '', date, startTime: '', endTime: '',
    venue: '', address: '', city: 'Freetown', organizer: '', image: `https://x.public.blob.vercel-storage.com/${id}.jpg`,
    featured: false, prices: [], status: 'published', posterPathname: `posters/${id}.jpg`, createdAt: '', updatedAt: '',
    ...extra,
  };
}

describe('dates', () => {
  it('keeps an event showing through its last day and deletes it the morning after next', () => {
    const e = { date: '2026-12-28' };
    expect(isUpcoming(e, '2026-12-28')).toBe(true);
    expect(isUpcoming(e, '2026-12-29')).toBe(false);
    expect(isExpired(e, '2026-12-29')).toBe(false); // the day of grace: doors close at 3 am
    expect(isExpired(e, '2026-12-30')).toBe(true);
  });
  it('uses the last day of events over several days', () => {
    const festival = { date: '2026-11-25', endDate: '2026-11-30' };
    expect(isUpcoming(festival, '2026-11-30')).toBe(true);
    expect(isExpired(festival, '2026-12-01')).toBe(false);
    expect(isExpired(festival, '2026-12-02')).toBe(true);
  });
});

describe('planCleanup', () => {
  const now = new Date('2026-12-30T06:00:00Z');
  const old = new Date('2026-12-01T00:00:00Z');
  const fresh = new Date('2026-12-30T05:00:00Z');

  it('deletes expired events, their posters and stale orphans, and keeps everything in use', () => {
    const events = [
      event('ended', '2026-12-28'),
      event('soon', '2027-01-03'),
      // Two events sharing one poster: one expired, one not. The poster must stay.
      event('tour-a', '2026-12-23', { posterPathname: 'posters/tour.jpg' }),
      event('tour-b', '2027-01-03', { posterPathname: 'posters/tour.jpg' }),
    ];
    const posters = [
      { pathname: 'posters/ended.jpg', uploadedAt: old },
      { pathname: 'posters/soon.jpg', uploadedAt: old },
      { pathname: 'posters/tour.jpg', uploadedAt: old },
      { pathname: 'posters/abandoned.jpg', uploadedAt: old },
      { pathname: 'posters/still-uploading.jpg', uploadedAt: fresh },
    ];
    const plan = planCleanup(events, posters, '2026-12-30', now);
    expect(plan.expired.map((e) => e.id).sort()).toEqual(['ended', 'tour-a']);
    expect(plan.keep.map((e) => e.id).sort()).toEqual(['soon', 'tour-b']);
    expect(plan.deletePosters.sort()).toEqual(['posters/abandoned.jpg', 'posters/ended.jpg']);
  });
});

describe('validation', () => {
  const valid = {
    title: 'All Black Party', category: 'food', summary: 'Food, music and vibes', date: '2026-12-24',
    startTime: '20:00', endTime: 'late', city: 'Freetown', image: 'https://x.public.blob.vercel-storage.com/p.jpg',
    posterPathname: 'posters/p.jpg', phone: '+232 79 555 093', website: '', status: 'published',
    prices: [{ id: 'a', name: 'Per person', description: '', price: 200000, currency: 'SLE' }],
  };
  it('accepts a full event and tidies the phone number', () => {
    const parsed = eventInputSchema.parse(valid);
    expect(parsed.phone).toBe('+23279555093');
    expect(parsed.website).toBeUndefined();
  });
  it('rejects an end date before the start, and an end time with no start', () => {
    expect(eventInputSchema.safeParse({ ...valid, endDate: '2026-12-20' }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...valid, startTime: '', endTime: '23:00' }).success).toBe(false);
  });
  it('requires a poster', () => {
    expect(eventInputSchema.safeParse({ ...valid, image: '', posterPathname: '' }).success).toBe(false);
  });
});

describe('auth', () => {
  process.env.SESSION_SECRET = 'x'.repeat(40);
  process.env.ADMIN_PASSCODE = 'lumley beach at sunset';
  it('checks the passcode', () => {
    expect(passcodeMatches('lumley beach at sunset')).toBe(true);
    expect(passcodeMatches('lumley beach')).toBe(false);
  });
  it('accepts its own session, and rejects tampered or expired ones', () => {
    const { value } = createSessionValue(Date.now());
    expect(isValidSession(value)).toBe(true);
    expect(isValidSession(value.replace(/.$/, value.endsWith('A') ? 'B' : 'A'))).toBe(false);
    const old = createSessionValue(Date.now() - 31 * 24 * 60 * 60 * 1000).value;
    expect(isValidSession(old)).toBe(false);
  });
});

describe('eventId', () => {
  it('makes a readable id with a short random tail', () => {
    expect(eventId('Freetown Detty Rave: Word on the Street')).toMatch(/^freetown-detty-rave-word-on-the-street-[0-9a-f]{4}$/);
  });
});
