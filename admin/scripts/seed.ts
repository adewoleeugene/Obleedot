// One-time: uploads the dot's sample events and their posters to Vercel Blob, so the admin starts
// with real data. Needs BLOB_READ_WRITE_TOKEN in .env.local. Refuses to run if events exist.
//   npm run seed
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { get, put } from '@vercel/blob';

import type { StoredEvent } from '../lib/types';
import { SAMPLE_EVENTS } from '../../dot/lib/sample-data.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const dot = path.resolve(here, '../../dot');

const existing = await get('data/events.json', { access: 'private', useCache: false });
if (existing) {
  console.error('data/events.json already exists. Not seeding over real data.');
  process.exit(1);
}

const uploaded = new Map<string, { url: string; pathname: string }>();
const now = new Date().toISOString();
const events: StoredEvent[] = [];

for (const event of SAMPLE_EVENTS) {
  // Events sharing a poster (the King Sully tour) upload it once.
  let poster = uploaded.get(event.image);
  if (!poster) {
    const body = await readFile(path.join(dot, event.image));
    const blob = await put('posters/poster.jpg', body, { access: 'public', addRandomSuffix: true, contentType: 'image/jpeg' });
    poster = { url: blob.url, pathname: blob.pathname };
    uploaded.set(event.image, poster);
    console.log(`Uploaded ${event.image}`);
  }
  events.push({ ...event, image: poster.url, posterPathname: poster.pathname, status: 'published', createdAt: now, updatedAt: now });
}

await put('data/events.json', JSON.stringify(events), {
  access: 'private',
  contentType: 'application/json',
  addRandomSuffix: false,
  cacheControlMaxAge: 60,
});
console.log(`Seeded ${events.length} events and ${uploaded.size} posters.`);
