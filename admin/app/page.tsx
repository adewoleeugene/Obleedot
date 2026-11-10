import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/SignOutButton';
import { isSignedIn } from '@/lib/auth';
import { isUpcoming, todayInFreetown } from '@/lib/dates';
import { dateLine } from '@/lib/format';
import { readEvents } from '@/lib/store';
import type { StoredEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

function EventRow({ event, ended }: { event: StoredEvent; ended?: boolean }) {
  return (
    <li>
      <Link href={`/events/${event.id}`} className="row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="row-thumb" src={event.image} alt="" />
        <div style={{ minWidth: 0 }}>
          <div className="row-date">{dateLine(event)}</div>
          <div className="row-title">{event.title}</div>
          <div className="row-meta">{event.venue || event.city}</div>
        </div>
        <div className="row-side">
          {ended ? (
            <span className="badge badge-ended">Ended</span>
          ) : event.status === 'published' ? (
            <span className="badge badge-live">Live</span>
          ) : (
            <span className="badge">Draft</span>
          )}
          {event.featured && !ended && <span className="hint">Featured</span>}
        </div>
      </Link>
    </li>
  );
}

export default async function EventsPage() {
  if (!(await isSignedIn())) redirect('/login');

  const { events } = await readEvents();
  const today = todayInFreetown();
  const sorted = [...events].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  const upcoming = sorted.filter((event) => isUpcoming(event, today));
  const ended = sorted.filter((event) => !isUpcoming(event, today));
  const live = upcoming.filter((event) => event.status === 'published').length;

  return (
    <main className="page">
      <div className="topbar">
        <span className="brand">Oblee</span>
        <SignOutButton />
      </div>
      <header className="masthead">
        <div>
          <h1 className="display">Events</h1>
          <p className="lede">
            {live} live in the dot{upcoming.length > live ? ` · ${upcoming.length - live} draft` : ''}
          </p>
        </div>
        <Link href="/events/new" className="btn btn-primary">Add event</Link>
      </header>

      {upcoming.length === 0 ? (
        <div className="empty">
          <p>No upcoming events yet.</p>
          <Link href="/events/new" className="btn">Add the first one</Link>
        </div>
      ) : (
        <ul className="rows">
          {upcoming.map((event) => <EventRow key={event.id} event={event} />)}
        </ul>
      )}

      {ended.length > 0 && (
        <section className="section" style={{ marginTop: 32 }}>
          <h2 className="section-title">Ended</h2>
          <p className="section-hint">Hidden from the dot. Deleted with their posters the morning after their last day.</p>
          <ul className="rows">
            {ended.map((event) => <EventRow key={event.id} event={event} ended />)}
          </ul>
        </section>
      )}
    </main>
  );
}
