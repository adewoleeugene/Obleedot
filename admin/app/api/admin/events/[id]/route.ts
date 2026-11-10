// PUT /api/admin/events/:id updates an event; DELETE removes it and its poster.
import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/http';
import { deleteBlobs, mutateEvents } from '@/lib/store';
import { eventInputSchema, fieldErrors } from '@/lib/validate';

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;

  const parsed = eventInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }
  const oldPoster = await mutateEvents((events) => {
    const index = events.findIndex((event) => event.id === id);
    if (index === -1) return { events, result: undefined };
    const current = events[index]!;
    events[index] = { ...current, ...parsed.data, id, updatedAt: new Date().toISOString() };
    const replaced = current.posterPathname !== parsed.data.posterPathname ? current.posterPathname : null;
    return { events, result: replaced };
  });
  if (oldPoster === undefined) {
    return NextResponse.json({ error: 'This event no longer exists.' }, { status: 404 });
  }
  // A replaced poster is deleted straight away so it doesn't take up space.
  if (oldPoster) await deleteBlobs([oldPoster]);
  return NextResponse.json({ id });
}

export async function DELETE(_request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;

  const poster = await mutateEvents((events) => {
    const event = events.find((item) => item.id === id);
    return { events: events.filter((item) => item.id !== id), result: event?.posterPathname ?? null };
  });
  if (poster) await deleteBlobs([poster]);
  return new NextResponse(null, { status: 204 });
}
