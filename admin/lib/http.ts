import { NextResponse } from 'next/server';

import { isSignedIn } from './auth';

/** Returns a 401 response when the request isn't from a signed-in teammate, else null. */
export async function requireAdmin(): Promise<NextResponse | null> {
  return (await isSignedIn()) ? null : NextResponse.json({ error: 'Sign in again.' }, { status: 401 });
}

/** Public, cached for a minute at Vercel's edge, then refreshed in the background. */
export const PUBLIC_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  'Access-Control-Allow-Origin': '*',
};
