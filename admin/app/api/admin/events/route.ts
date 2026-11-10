// POST /api/admin/events: create an event.
import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/http';
import { eventId } from '@/lib/slug';
import { mutateEvents } from '@/lib/store';
import type { StoredEvent } from '@/lib/types';
import { eventInputSchema, fieldErrors } from '@/lib/validate';

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = eventInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }
  const now = new Date().toISOString();
  const event: StoredEvent = { ...parsed.data, id: eventId(parsed.data.title), createdAt: now, updatedAt: now };
  await mutateEvents((events) => ({ events: [...events, event], result: null }));
  return NextResponse.json({ id: event.id }, { status: 201 });
}
