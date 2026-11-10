// All events live in one private JSON blob; posters are public blobs. Every events write sends
// the ETag it read, so if a teammate saved in between, the write fails and is retried on the
// fresh copy instead of overwriting their change.
//
// Without BLOB_READ_WRITE_TOKEN, outside production, everything is kept in local folders instead
// (.local-data/ and public/local-posters/), so the admin runs on a laptop with no Vercel account.
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { BlobPreconditionFailedError, del, get, list, put } from '@vercel/blob';

import type { StoredEvent } from './types';

const EVENTS_PATH = 'data/events.json';
const LOCAL = !process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV !== 'production';
const LOCAL_EVENTS = path.join(process.cwd(), '.local-data', 'events.json');
const LOCAL_POSTERS = path.join(process.cwd(), 'public', 'local-posters');

type Snapshot = { events: StoredEvent[]; etag: string | null };
export type PosterBlob = { pathname: string; uploadedAt: Date };

class ConflictError extends Error {}

export async function readEvents(): Promise<Snapshot> {
  if (LOCAL) {
    const text = await readFile(LOCAL_EVENTS, 'utf8').catch(() => null);
    return { events: text ? (JSON.parse(text) as StoredEvent[]) : [], etag: text ? String(text.length) : null };
  }
  const result = await get(EVENTS_PATH, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) {
    return { events: [], etag: null };
  }
  const parsed: unknown = JSON.parse(await new Response(result.stream).text());
  return { events: Array.isArray(parsed) ? (parsed as StoredEvent[]) : [], etag: result.blob.etag };
}

async function writeEvents(events: StoredEvent[], etag: string | null): Promise<void> {
  const body = JSON.stringify(events);
  if (LOCAL) {
    await mkdir(path.dirname(LOCAL_EVENTS), { recursive: true });
    await writeFile(LOCAL_EVENTS, body);
    return;
  }
  try {
    await put(EVENTS_PATH, body, {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      cacheControlMaxAge: 60,
      ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
    });
  } catch (error) {
    // Someone else saved first (or created the file first): read again and retry.
    if (error instanceof BlobPreconditionFailedError || (etag === null && /exist/i.test(String(error)))) {
      throw new ConflictError();
    }
    throw error;
  }
}

/**
 * Reads the events, applies `change`, and writes them back, retrying when someone else saved
 * first. `change` returns the new list and a value for the caller.
 */
export async function mutateEvents<T>(change: (events: StoredEvent[]) => { events: StoredEvent[]; result: T }): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const { events, etag } = await readEvents();
    const { events: next, result } = change(structuredClone(events));
    try {
      await writeEvents(next, etag);
      return result;
    } catch (error) {
      if (!(error instanceof ConflictError) || attempt >= 3) throw error;
    }
  }
}

/** Saves a poster and returns its public URL and the pathname to delete it by. */
export async function savePoster(file: File, extension: string, origin: string): Promise<{ url: string; pathname: string }> {
  if (LOCAL) {
    const name = `poster-${randomUUID()}.${extension}`;
    await mkdir(LOCAL_POSTERS, { recursive: true });
    await writeFile(path.join(LOCAL_POSTERS, name), Buffer.from(await file.arrayBuffer()));
    return { url: `${origin}/local-posters/${name}`, pathname: `posters/${name}` };
  }
  const blob = await put(`posters/poster.${extension}`, file, { access: 'public', addRandomSuffix: true, contentType: file.type });
  return { url: blob.url, pathname: blob.pathname };
}

export async function listPosters(): Promise<PosterBlob[]> {
  if (LOCAL) {
    const names = await readdir(LOCAL_POSTERS).catch(() => [] as string[]);
    return Promise.all(
      names.map(async (name) => ({ pathname: `posters/${name}`, uploadedAt: (await stat(path.join(LOCAL_POSTERS, name))).mtime })),
    );
  }
  const posters: PosterBlob[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: 'posters/', cursor, limit: 1000 });
    posters.push(...page.blobs.map((blob) => ({ pathname: blob.pathname, uploadedAt: new Date(blob.uploadedAt) })));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return posters;
}

export async function deleteBlobs(pathnames: string[]): Promise<void> {
  const unique = [...new Set(pathnames.filter(Boolean))];
  if (!unique.length) return;
  if (LOCAL) {
    await Promise.all(unique.map((p) => rm(path.join(LOCAL_POSTERS, path.basename(p)), { force: true })));
    return;
  }
  await del(unique);
}
