// POST /api/admin/posters: upload a poster (the browser has already resized it).
import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/http';
import { savePoster } from '@/lib/store';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const form = await request.formData().catch(() => null);
  const file = form?.get('poster');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose a poster image.' }, { status: 400 });
  }
  if (!TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Use a JPEG, PNG or WebP image.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'That image is over 4 MB. Try a smaller one.' }, { status: 400 });
  }
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const poster = await savePoster(file, extension, new URL(request.url).origin);
  return NextResponse.json(poster, { status: 201 });
}
