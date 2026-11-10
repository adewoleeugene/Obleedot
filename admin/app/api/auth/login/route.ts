import { NextResponse } from 'next/server';

import { COOKIE, createSessionValue, passcodeMatches } from '@/lib/auth';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { passcode?: unknown } | null;
  const attempt = typeof body?.passcode === 'string' ? body.passcode : '';
  if (!attempt || !passcodeMatches(attempt)) {
    // Slow down guessing.
    await new Promise((resolve) => setTimeout(resolve, 800));
    return NextResponse.json({ error: "That passcode isn't right." }, { status: 401 });
  }
  const { value, maxAge } = createSessionValue();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, value, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge });
  return response;
}
