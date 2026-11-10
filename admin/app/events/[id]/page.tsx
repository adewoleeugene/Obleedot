import { notFound, redirect } from 'next/navigation';

import { EventForm } from '@/components/EventForm';
import { isSignedIn } from '@/lib/auth';
import { readEvents } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isSignedIn())) redirect('/login');
  const { id } = await params;
  const { events } = await readEvents();
  const event = events.find((item) => item.id === id);
  if (!event) notFound();
  return <EventForm initial={event} />;
}
