// Reads events from the events server. With no API_URL in .env, it answers from the sample events
// so the dot runs in the simulator before the server exists. The dot only reads: no purchases.
//
// Endpoints the server needs:
//   GET {API_URL}/events       → EventItem[]
//   GET {API_URL}/events/:id   → EventItem (404 when unknown)
import type { Dash } from '@monimesl/dot-runtime';

import { SAMPLE_EVENTS } from './sample-data';
import type { EventItem } from './types';

export const usingSampleData = !env.API_URL;

function url(path: string): string {
  return `${env.API_URL.replace(/\/$/, '')}${path}`;
}

function byDate(a: EventItem, b: EventItem): number {
  return `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`);
}

/** Today on the phone, as 'YYYY-MM-DD'. */
export function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Events that haven't ended yet, soonest first. */
export function upcoming(events: readonly EventItem[], on: string = today()): EventItem[] {
  return events.filter((event) => (event.endDate || event.date) >= on).sort(byDate);
}

export async function listEvents(dash: Dash): Promise<EventItem[]> {
  if (usingSampleData) {
    await dash.system.delay(300);
    return upcoming(SAMPLE_EVENTS);
  }
  const response = await dash.network.http.request<EventItem[]>({ url: url('/events'), as: 'json' });
  if (!response.ok) {
    throw new Error(`Events failed to load (${response.status})`);
  }
  return upcoming(response.body);
}

/** The event, or null when there's no event with this id. */
export async function getEvent(dash: Dash, id: string): Promise<EventItem | null> {
  if (usingSampleData) {
    await dash.system.delay(200);
    return SAMPLE_EVENTS.find((event) => event.id === id) ?? null;
  }
  const response = await dash.network.http.request<EventItem>({
    url: url(`/events/${encodeURIComponent(id)}`),
    as: 'json',
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Event failed to load (${response.status})`);
  }
  return response.body;
}
