// Saved events: a list of event ids kept on the phone in the dot's cache. No account, no server.
import type { Dash } from '@monimesl/dot-runtime';

const KEY = 'saved-events';

export async function savedIds(dash: Dash): Promise<string[]> {
  const value = await dash.storage.cache.get<string[]>(KEY);
  return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];
}

/** Saves or unsaves the event and returns the new list, newest saved first. */
export async function setSaved(dash: Dash, id: string, saved: boolean): Promise<string[]> {
  const current = (await savedIds(dash)).filter((other) => other !== id);
  const next = saved ? [id, ...current] : current;
  await dash.storage.cache.set(KEY, next);
  return next;
}

/** Drops events that have ended or been taken down, so the list doesn't grow for ever. */
export async function pruneSaved(dash: Dash, liveIds: ReadonlySet<string>): Promise<string[]> {
  const current = await savedIds(dash);
  const kept = current.filter((id) => liveIds.has(id));
  if (kept.length !== current.length) {
    await dash.storage.cache.set(KEY, kept);
  }
  return kept;
}
