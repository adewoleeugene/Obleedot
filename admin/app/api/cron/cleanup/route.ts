// GET /api/cron/cleanup: Vercel runs this every morning (vercel.json). It deletes events a day
// after they end, their posters, and posters that were uploaded but never saved with an event.
import { NextResponse } from 'next/server';

import { planCleanup } from '@/lib/cleanup';
import { todayInFreetown } from '@/lib/dates';
import { deleteBlobs, listPosters, mutateEvents } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const now = new Date();
  const today = todayInFreetown(now);
  const posters = await listPosters();

  const plan = await mutateEvents((events) => {
    const result = planCleanup(events, posters, today, now);
    return { events: result.keep, result };
  });
  await deleteBlobs(plan.deletePosters);

  return NextResponse.json({
    today,
    deletedEvents: plan.expired.map((event) => event.id),
    deletedPosters: plan.deletePosters.length,
  });
}
