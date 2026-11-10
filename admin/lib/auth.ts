// Team sign-in: one passcode, then a signed cookie that lasts 30 days.
import { createHmac, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';

export const COOKIE = 'se_admin';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error('SESSION_SECRET is missing or shorter than 32 characters');
  }
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function passcodeMatches(attempt: string): boolean {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) {
    throw new Error('ADMIN_PASSCODE is not set');
  }
  // Compare digests so the comparison takes the same time whatever the lengths.
  const digest = (v: string) => createHmac('sha256', 'passcode').update(v).digest('hex');
  return safeEqual(digest(attempt), digest(expected));
}

export function createSessionValue(now = Date.now()): { value: string; maxAge: number } {
  const expires = String(Math.floor(now / 1000) + MAX_AGE_SECONDS);
  return { value: `${expires}.${sign(expires)}`, maxAge: MAX_AGE_SECONDS };
}

export function isValidSession(value: string | undefined, now = Date.now()): boolean {
  if (!value) {
    return false;
  }
  const [expires, signature] = value.split('.');
  if (!expires || !signature || !safeEqual(signature, sign(expires))) {
    return false;
  }
  return Number(expires) * 1000 > now;
}

/** True when the request carries a valid team session. */
export async function isSignedIn(): Promise<boolean> {
  const store = await cookies();
  return isValidSession(store.get(COOKIE)?.value);
}
