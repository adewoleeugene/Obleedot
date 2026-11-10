// GET /api/events/:id: one published event, for the dot's event page and share links.
import { NextResponse } from 'next/server';

import { PUBLIC_HEADERS } from '@/lib/http';
import { readEvents } from '@/lib/store';
import { toPublic } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { events } = await readEvents();
  const event = events.find((item) => item.id === id && item.status === 'published');
  if (!event) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: PUBLIC_HEADERS });
  }
  return NextResponse.json(toPublic(event), { headers: PUBLIC_HEADERS });
}
