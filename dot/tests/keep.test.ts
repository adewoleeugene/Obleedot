import '@monimesl/dot-runtime/testing';
import { DashError } from '@monimesl/dot-runtime';
import { testPage } from '@monimesl/dot-runtime/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { matchChoice, reminderChoices, reminderKey, reminderText } from '../lib/reminders';
import eventPage from '../pages/event/controller';

const concert = { id: 'drizilik-audacity', title: 'Drizilik Live in Concert: Audacity', date: '2026-11-20', startTime: '19:00', venue: 'FBC Amphitheatre' };

describe('reminder choices', () => {
  it('offers the day before, the morning and two hours before', () => {
    expect(reminderChoices(concert, '2026-11-10 12:00').map((c) => [c.id, c.date, c.time, c.label])).toEqual([
      ['day-before', '2026-11-19', '18:00', 'The day before, at 6 pm'],
      ['morning', '2026-11-20', '10:00', 'On the day, at 10 am'],
      ['before', '2026-11-20', '17:00', '2 hours before, at 5 pm'],
    ]);
  });
  it('drops times that have passed, and the morning for a morning event', () => {
    expect(reminderChoices(concert, '2026-11-20 11:00').map((c) => c.id)).toEqual(['before']);
    expect(reminderChoices(concert, '2026-11-20 18:00')).toEqual([]);
    const brunch = { ...concert, startTime: '11:00' };
    expect(reminderChoices(brunch, '2026-11-10 12:00').map((c) => c.id)).toEqual(['day-before', 'before']);
    const tba = { ...concert, startTime: '' };
    expect(reminderChoices(tba, '2026-11-10 12:00').map((c) => c.id)).toEqual(['day-before', 'morning']);
  });
  it('words the notification and keeps the key and title inside Dash limits', () => {
    const [dayBefore] = reminderChoices(concert, '2026-11-10 12:00');
    expect(reminderText(concert, dayBefore!)).toEqual({ title: 'Drizilik Live in Concert: Audacity is tomorrow', message: '7 pm at FBC Amphitheatre' });
    const long = { ...concert, title: 'A'.repeat(120) };
    expect(reminderText(long, dayBefore!).title).toHaveLength(80);
    expect(reminderKey('x'.repeat(100))).toHaveLength(64);
  });
  it('recognises a reminder set earlier', () => {
    const choices = reminderChoices(concert, '2026-11-10 12:00');
    expect(matchChoice(choices, { start: '2026-11-20', time: '17:00' })).toBe('before');
    expect(matchChoice(choices, { start: '2026-11-18', time: '09:00' })).toBe('');
  });
});

describe('event page: save and remind', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 10, 12, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function open(host: Record<string, (params: never) => unknown> = {}) {
    const store = new Map<string, unknown>();
    return testPage(eventPage, {
      options: { event: 'drizilik-audacity' },
      host: {
        'dash.system.delay': () => undefined,
        'dash.storage.cache.get': (params: { key: string }) => store.get(params.key) ?? null,
        'dash.storage.cache.set': (params: { key: string; value: unknown }) => {
          store.set(params.key, params.value);
        },
        'dash.reminders.list': () => [],
        'dash.reminders.set': () => undefined,
        'dash.reminders.cancel': () => true,
        ...host,
      },
    });
  }

  it('saves and unsaves the event on the phone', async () => {
    const page = await open();
    expect(page.state.saved).toBe(false);
    await page.tap('toggleSave');
    expect(page.state.saved).toBe(true);
    const save = page.hostCalls.find((call) => call.method === 'dash.storage.cache.set');
    expect(save?.params).toMatchObject({ key: 'saved-events', value: ['drizilik-audacity'] });
    await page.tap('toggleSave');
    expect(page.state.saved).toBe(false);
  });

  it('sets a reminder that opens this event, and turns it off', async () => {
    const page = await open();
    expect(page.state.reminderChoices.map((c) => c.id)).toEqual(['day-before', 'morning', 'before']);
    await page.tap('openReminderSheet');
    await page.tap('setReminder', { value: 'day-before' });
    const set = page.hostCalls.find((call) => call.method === 'dash.reminders.set');
    expect(set?.params).toMatchObject({
      key: 'event-drizilik-audacity',
      page: '/event?event=drizilik-audacity',
      schedule: { start: '2026-11-19', time: '18:00' },
    });
    expect(page.state).toMatchObject({ reminderChoice: 'day-before', reminderSheetOpen: false, toastTone: 'success' });
    expect(page.state.toast).toBe("We'll remind you Thu 19 Nov, 6 pm");

    await page.tap('removeReminder');
    expect(page.state).toMatchObject({ reminderChoice: '', toast: 'Reminder turned off' });
  });

  it('shows a reminder set on an earlier visit', async () => {
    const page = await open({
      'dash.reminders.list': () => [{ key: 'event-drizilik-audacity', title: 'x', schedule: { start: '2026-11-20', time: '17:00' } }],
    });
    expect(page.state).toMatchObject({ reminderChoice: 'before', reminderWhen: 'Fri 20 Nov, 5 pm' });
  });

  it('explains when reminders are off or full, and leaves nothing set', async () => {
    const denied = await open({
      'dash.reminders.set': () => {
        throw new DashError('denied', 'No');
      },
    });
    await denied.tap('setReminder', { value: 'morning' });
    expect(denied.state).toMatchObject({ reminderChoice: '', toastTone: 'danger' });
    expect(denied.state.toast).toContain('Reminders are turned off');

    const full = await open({
      'dash.reminders.set': () => {
        throw new DashError('failed', 'Too many');
      },
    });
    await full.tap('setReminder', { value: 'morning' });
    expect(full.state.toast).toContain('12 reminders');
  });
});
