// GET /api/events: what the dot shows. Published events that haven't ended, soonest first.
import { NextResponse } from 'next/server';

import { isUpcoming, todayInFreetown } from '@/lib/dates';
import { PUBLIC_HEADERS } from '@/lib/http';
import { readEvents } from '@/lib/store';
import { toPublic } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { events } = await readEvents();
  const today = todayInFreetown();
  const body = events
    .filter((event) => event.status === 'published' && isUpcoming(event, today))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
    .map(toPublic);
  return NextResponse.json(body, { headers: PUBLIC_HEADERS });
}
