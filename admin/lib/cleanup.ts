// What the daily clean-up removes. Pure, so it can be tested without Blob.
import { isExpired } from './dates';
import type { StoredEvent } from './types';

export type PosterBlob = { pathname: string; uploadedAt: Date };

export function planCleanup(events: readonly StoredEvent[], posters: readonly PosterBlob[], today: string, now: Date) {
  const expired = events.filter((event) => isExpired(event, today));
  const keep = events.filter((event) => !isExpired(event, today));
  const inUse = new Set(keep.map((event) => event.posterPathname));
  const dayAgo = now.getTime() - 24 * 60 * 60 * 1000;
  // Posters no kept event uses: those of expired events, and uploads never saved with an event
  // (left a day, in case someone is still filling in the form).
  const orphans = posters.filter((blob) => !inUse.has(blob.pathname) && blob.uploadedAt.getTime() < dayAgo);
  const deletePosters = [...new Set([...expired.map((e) => e.posterPathname), ...orphans.map((b) => b.pathname)])].filter(
    (pathname) => !inUse.has(pathname),
  );
  return { keep, expired, deletePosters };
}
