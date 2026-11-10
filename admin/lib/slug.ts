import { randomBytes } from 'node:crypto';

/** "Freetown Detty Rave: Word on the Street" → "freetown-detty-rave-word-on-the-street-3f9a". */
export function eventId(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .slice(0, 48)
    .replace(/-$/, '');
  return `${base || 'event'}-${randomBytes(2).toString('hex')}`;
}
