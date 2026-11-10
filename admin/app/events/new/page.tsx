import { redirect } from 'next/navigation';

import { EventForm } from '@/components/EventForm';
import { isSignedIn } from '@/lib/auth';

export default async function NewEventPage() {
  if (!(await isSignedIn())) redirect('/login');
  return <EventForm />;
}
