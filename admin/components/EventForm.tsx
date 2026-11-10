'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { CATEGORIES, CATEGORY_LABELS, type Currency, type StoredEvent } from '@/lib/types';

type PriceRow = { id: string; name: string; description: string; amount: string; currency: Currency; soldOut: boolean };

type FormState = {
  title: string;
  category: (typeof CATEGORIES)[number];
  summary: string;
  description: string;
  date: string;
  multiDay: boolean;
  endDate: string;
  startTime: string;
  endTime: string;
  tillLate: boolean;
  venue: string;
  address: string;
  city: string;
  organizer: string;
  dressCode: string;
  ageLimit: string;
  phone: string;
  website: string;
  featured: boolean;
  image: string;
  posterPathname: string;
  prices: PriceRow[];
};

const newId = () => Math.random().toString(36).slice(2, 10);

function fromEvent(event?: StoredEvent): FormState {
  return {
    title: event?.title ?? '',
    category: event?.category ?? 'party',
    summary: event?.summary ?? '',
    description: event?.description ?? '',
    date: event?.date ?? '',
    multiDay: Boolean(event?.endDate && event.endDate !== event.date),
    endDate: event?.endDate ?? '',
    startTime: event?.startTime ?? '',
    endTime: event?.endTime === 'late' ? '' : (event?.endTime ?? ''),
    tillLate: event?.endTime === 'late',
    venue: event?.venue ?? '',
    address: event?.address ?? '',
    city: event?.city ?? 'Freetown',
    organizer: event?.organizer ?? '',
    dressCode: event?.dressCode ?? '',
    ageLimit: event?.ageLimit ?? '',
    phone: event?.phone ?? '',
    website: event?.website ?? '',
    featured: event?.featured ?? false,
    image: event?.image ?? '',
    posterPathname: event?.posterPathname ?? '',
    prices: (event?.prices ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      amount: String(p.price / 100),
      currency: p.currency,
      soldOut: Boolean(p.soldOut),
    })),
  };
}

/** Shrinks a photo in the browser so uploads are quick on mobile data: longest side 1400px, JPEG. */
async function resizePoster(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read that image'))), 'image/jpeg', 0.82),
  );
}

type UploadResult = { url?: string; pathname?: string; error?: string };

/** Posts the poster with XMLHttpRequest, because fetch can't report upload progress. */
function uploadWithProgress(body: FormData, onProgress: (percent: number) => void): Promise<{ ok: boolean; result: UploadResult }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/posters');
    xhr.responseType = 'json';
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, result: (xhr.response ?? {}) as UploadResult });
    xhr.onerror = () => reject(new Error("The upload didn't go through. Check your connection and try again."));
    xhr.ontimeout = () => reject(new Error('The upload took too long. Check your connection and try again.'));
    xhr.timeout = 120_000;
    xhr.send(body);
  });
}

function sizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Where the poster upload is: shown on the poster itself, so nobody has to guess. */
type Upload =
  | { stage: 'idle' }
  | { stage: 'preparing'; preview: string }
  | { stage: 'uploading'; preview: string; percent: number }
  | { stage: 'done'; size: number }
  | { stage: 'failed'; error: string; file: File };

function Field({ label, optional, hint, error, children, htmlFor }: {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={htmlFor}>
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      {children}
      {error ? <span className="error">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function EventForm({ initial }: { initial?: StoredEvent }) {
  const router = useRouter();
  const editing = Boolean(initial);
  const [form, setForm] = useState<FormState>(() => fromEvent(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState<'draft' | 'published' | null>(null);
  const [upload, setUpload] = useState<Upload>({ stage: 'idle' });
  const uploading = upload.stage === 'preparing' || upload.stage === 'uploading';
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setPrice = (id: string, patch: Partial<PriceRow>) =>
    setForm((f) => ({ ...f, prices: f.prices.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  async function choosePoster(file: File | undefined) {
    if (!file || uploading) return;
    if (fileInput.current) fileInput.current.value = '';
    // Show what they picked straight away, before it's shrunk or sent.
    const preview = URL.createObjectURL(file);
    setUpload({ stage: 'preparing', preview });
    try {
      const resized = await resizePoster(file).catch(() => {
        throw new Error("That file couldn't be read as a picture. Try a JPEG, PNG or WebP.");
      });
      const body = new FormData();
      body.append('poster', new File([resized], 'poster.jpg', { type: 'image/jpeg' }));
      setUpload({ stage: 'uploading', preview, percent: 0 });
      const { ok, result } = await uploadWithProgress(body, (percent) => setUpload({ stage: 'uploading', preview, percent }));
      if (!ok || !result.url || !result.pathname) throw new Error(result.error ?? "The upload didn't finish. Try again.");
      setForm((f) => ({ ...f, image: result.url!, posterPathname: result.pathname! }));
      setErrors((e) => ({ ...e, image: '', posterPathname: '' }));
      setUpload({ stage: 'done', size: resized.size });
    } catch (error) {
      setUpload({ stage: 'failed', error: error instanceof Error ? error.message : "The upload didn't finish. Try again.", file });
    } finally {
      URL.revokeObjectURL(preview);
    }
  }

  async function save(status: 'draft' | 'published') {
    setSaving(status);
    setNotice('');
    setErrors({});
    const payload = {
      title: form.title,
      category: form.category,
      summary: form.summary,
      description: form.description,
      date: form.date,
      endDate: form.multiDay ? form.endDate : '',
      startTime: form.startTime,
      endTime: form.tillLate ? 'late' : form.endTime,
      venue: form.venue,
      address: form.address,
      city: form.city,
      organizer: form.organizer,
      image: form.image,
      posterPathname: form.posterPathname,
      featured: form.featured,
      dressCode: form.dressCode,
      ageLimit: form.ageLimit,
      phone: form.phone,
      website: form.website,
      prices: form.prices.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Math.round(Number(p.amount || 0) * 100),
        currency: p.currency,
        soldOut: p.soldOut || undefined,
      })),
      status,
    };
    const response = await fetch(editing ? `/api/admin/events/${initial!.id}` : '/api/admin/events', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(null);
    if (response.ok) {
      router.push('/');
      router.refresh();
      return;
    }
    const body = (await response.json().catch(() => ({}))) as { errors?: Record<string, string>; error?: string };
    if (response.status === 401) {
      router.replace('/login');
      return;
    }
    setErrors(body.errors ?? {});
    setNotice(body.errors ? 'Some details need fixing. They’re marked below.' : (body.error ?? 'Could not save. Try again.'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove() {
    if (!initial || !window.confirm(`Delete “${initial.title}” and its poster? This can’t be undone.`)) return;
    const response = await fetch(`/api/admin/events/${initial.id}`, { method: 'DELETE' });
    if (response.ok) {
      router.push('/');
      router.refresh();
    } else {
      setNotice('Could not delete. Try again.');
    }
  }

  const err = (key: string) => errors[key] || undefined;
  const invalid = (key: string) => (errors[key] ? true : undefined);

  return (
    <main className="page">
      <div className="topbar">
        <Link href="/" className="back">← Events</Link>
        {editing && initial?.status === 'published' && <span className="badge badge-live">Live</span>}
        {editing && initial?.status === 'draft' && <span className="badge">Draft</span>}
      </div>
      <header className="masthead">
        <h1 className="display">{editing ? 'Edit event' : 'Add event'}</h1>
      </header>

      {notice && <div className="notice" role="alert">{notice}</div>}

      <section className="section">
        <h2 className="section-title">Poster</h2>
        <p className="section-hint">Shown whole on the event page. Portrait or square both work.</p>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => choosePoster(e.target.files?.[0])} />
        {uploading ? (
          // The picked photo, dimmed, with where the upload is over it.
          <div className="poster-preview is-busy">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={upload.preview} alt="" />
            <div className="upload-overlay">
              <strong>{upload.stage === 'preparing' ? 'Getting it ready…' : `Uploading ${upload.percent}%`}</strong>
              <div className="upload-track" role="progressbar" aria-label="Poster upload" aria-valuemin={0} aria-valuemax={100} aria-valuenow={upload.stage === 'uploading' ? upload.percent : 0}>
                <div className="upload-fill" style={{ width: `${upload.stage === 'uploading' ? upload.percent : 4}%` }} />
              </div>
            </div>
          </div>
        ) : form.image ? (
          <div className="poster-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.image} alt="Poster preview" />
          </div>
        ) : (
          <button type="button" className="poster-drop" onClick={() => fileInput.current?.click()} aria-invalid={invalid('image')}>
            <strong style={{ color: 'var(--text)' }}>Choose a poster</strong>
            <span>JPEG, PNG or WebP. We shrink it before uploading.</span>
          </button>
        )}

        {/* Status in words, announced to screen readers too. */}
        <div className="upload-status" aria-live="polite">
          {upload.stage === 'done' && (
            <p className="upload-ok"><span aria-hidden="true">✓</span> Poster uploaded · {sizeLabel(upload.size)}</p>
          )}
          {upload.stage === 'failed' && (
            <div className="upload-failed" role="alert">
              <p>{upload.error}{form.image ? ' Your previous poster is kept.' : ''}</p>
              <button type="button" className="btn btn-small" onClick={() => choosePoster(upload.file)}>Try again</button>
            </div>
          )}
        </div>

        {(form.image || uploading) && (
          <div className="poster-actions">
            <button type="button" className="btn btn-small" onClick={() => fileInput.current?.click()} disabled={uploading}>
              {form.image ? 'Replace poster' : 'Choose another'}
            </button>
          </div>
        )}
        {err('image') && <p className="error">{err('image')}</p>}
      </section>

      <section className="section">
        <h2 className="section-title">The event</h2>
        <Field label="Title" htmlFor="title" error={err('title')}>
          <input id="title" className="input" value={form.title} onChange={(e) => set('title', e.target.value)} aria-invalid={invalid('title')} maxLength={80} />
        </Field>
        <Field label="Category" htmlFor="category">
          <select id="category" className="select" value={form.category} onChange={(e) => set('category', e.target.value as FormState['category'])}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </Field>
        <Field label="Summary" htmlFor="summary" hint="One line people read in the list." error={err('summary')}>
          <input id="summary" className="input" value={form.summary} onChange={(e) => set('summary', e.target.value)} aria-invalid={invalid('summary')} maxLength={140} />
        </Field>
        <Field label="About" optional htmlFor="description" hint="Line-up, what's included, anything people should know. **Bold** and - lists work.">
          <textarea id="description" className="textarea" value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={3000} />
        </Field>
      </section>

      <section className="section">
        <h2 className="section-title">When</h2>
        <div className="grid-2">
          <Field label={form.multiDay ? 'First day' : 'Date'} htmlFor="date" error={err('date')}>
            <input id="date" type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} aria-invalid={invalid('date')} />
          </Field>
          {form.multiDay && (
            <Field label="Last day" htmlFor="endDate" error={err('endDate')}>
              <input id="endDate" type="date" className="input" value={form.endDate} min={form.date} onChange={(e) => set('endDate', e.target.value)} aria-invalid={invalid('endDate')} />
            </Field>
          )}
        </div>
        <label className="check">
          <input type="checkbox" checked={form.multiDay} onChange={(e) => set('multiDay', e.target.checked)} />
          Runs over several days
        </label>
        <div className="grid-2" style={{ marginTop: 12 }}>
          <Field label="Starts" htmlFor="startTime" error={err('startTime')}>
            <input id="startTime" type="time" className="input" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} aria-invalid={invalid('startTime')} />
          </Field>
          {!form.tillLate && (
            <Field label="Ends" optional htmlFor="endTime" error={err('endTime')}>
              <input id="endTime" type="time" className="input" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} aria-invalid={invalid('endTime')} />
            </Field>
          )}
        </div>
        <label className="check">
          <input type="checkbox" checked={form.tillLate} onChange={(e) => set('tillLate', e.target.checked)} />
          Goes on till late
        </label>
      </section>

      <section className="section">
        <h2 className="section-title">Where</h2>
        <Field label="Venue" optional htmlFor="venue" hint="Leave empty while it's not announced.">
          <input id="venue" className="input" value={form.venue} onChange={(e) => set('venue', e.target.value)} maxLength={80} />
        </Field>
        <div className="grid-2">
          <Field label="Address or area" optional htmlFor="address">
            <input id="address" className="input" value={form.address} onChange={(e) => set('address', e.target.value)} maxLength={120} />
          </Field>
          <Field label="City" htmlFor="city" error={err('city')}>
            <input id="city" className="input" value={form.city} onChange={(e) => set('city', e.target.value)} aria-invalid={invalid('city')} maxLength={60} />
          </Field>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Ticket prices</h2>
        <p className="section-hint">For information only. Nothing is sold in the dot. Leave empty if prices aren't out yet.</p>
        {form.prices.map((p, i) => (
          <div className="price-row" key={p.id}>
            <Field label="Ticket" htmlFor={`pn-${p.id}`} error={err(`prices.${i}.name`)}>
              <input id={`pn-${p.id}`} className="input" placeholder="Early bird" value={p.name} onChange={(e) => setPrice(p.id, { name: e.target.value })} maxLength={40} />
            </Field>
            <Field label="Price" htmlFor={`pa-${p.id}`} error={err(`prices.${i}.price`)}>
              <div className="amount">
                <select className="select" value={p.currency} onChange={(e) => setPrice(p.id, { currency: e.target.value as Currency })} aria-label="Currency">
                  <option value="SLE">SLE</option>
                  <option value="USD">USD</option>
                </select>
                <input id={`pa-${p.id}`} className="input" inputMode="decimal" placeholder="150" value={p.amount} onChange={(e) => setPrice(p.id, { amount: e.target.value.replace(/[^\d.]/g, '') })} />
              </div>
            </Field>
            <div className="wide">
              <Field label="Note" optional htmlFor={`pd-${p.id}`}>
                <input id={`pd-${p.id}`} className="input" placeholder="Before the day" value={p.description} onChange={(e) => setPrice(p.id, { description: e.target.value })} maxLength={60} />
              </Field>
            </div>
            <label className="check">
              <input type="checkbox" checked={p.soldOut} onChange={(e) => setPrice(p.id, { soldOut: e.target.checked })} />
              Sold out
            </label>
            <div style={{ justifySelf: 'end' }}>
              <button type="button" className="btn btn-danger" onClick={() => setForm((f) => ({ ...f, prices: f.prices.filter((x) => x.id !== p.id) }))}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-small"
          style={{ marginTop: form.prices.length ? 8 : 0 }}
          disabled={form.prices.length >= 8}
          onClick={() => setForm((f) => ({ ...f, prices: [...f.prices, { id: newId(), name: '', description: '', amount: '', currency: 'SLE', soldOut: false }] }))}
        >
          Add a ticket price
        </button>
      </section>

      <section className="section">
        <h2 className="section-title">More details</h2>
        <Field label="Presented by" optional htmlFor="organizer">
          <input id="organizer" className="input" value={form.organizer} onChange={(e) => set('organizer', e.target.value)} maxLength={100} />
        </Field>
        <div className="grid-2">
          <Field label="Dress code" optional htmlFor="dressCode">
            <input id="dressCode" className="input" value={form.dressCode} onChange={(e) => set('dressCode', e.target.value)} maxLength={60} />
          </Field>
          <Field label="Age limit" optional htmlFor="ageLimit" hint="Such as 18+">
            <input id="ageLimit" className="input" value={form.ageLimit} onChange={(e) => set('ageLimit', e.target.value)} maxLength={10} />
          </Field>
        </div>
        <Field label="Phone for reservations" optional htmlFor="phone" error={err('phone')}>
          <input id="phone" type="tel" className="input" placeholder="+232 79 555 093" value={form.phone} onChange={(e) => set('phone', e.target.value)} aria-invalid={invalid('phone')} />
        </Field>
        <Field label="Website" optional htmlFor="website" error={err('website')}>
          <input id="website" type="url" className="input" placeholder="https://" value={form.website} onChange={(e) => set('website', e.target.value)} aria-invalid={invalid('website')} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
          Feature it in “Don’t miss” at the top of the dot
        </label>
      </section>

      {editing && (
        <section className="section">
          <button type="button" className="btn btn-danger" onClick={remove}>Delete this event</button>
        </section>
      )}

      <div className="actionbar">
        <div className="actionbar-inner">
          <span className="hint spacer">{uploading ? 'Poster uploading…' : ''}</span>
          <button type="button" className="btn" onClick={() => save('draft')} disabled={saving !== null || uploading}>
            {saving === 'draft' ? 'Saving…' : editing && initial?.status === 'published' ? 'Unpublish' : 'Save draft'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => save('published')} disabled={saving !== null || uploading}>
            {saving === 'published' ? 'Publishing…' : editing && initial?.status === 'published' ? 'Save changes' : 'Publish'}
          </button>
        </div>
      </div>
    </main>
  );
}
