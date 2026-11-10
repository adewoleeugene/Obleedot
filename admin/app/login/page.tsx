'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    setBusy(false);
    if (response.ok) {
      router.replace('/');
      router.refresh();
    } else {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Something went wrong. Try again.');
    }
  }

  return (
    <main className="page" style={{ maxWidth: 440, paddingTop: '18vh' }}>
      <h1 className="display">Salone Events</h1>
      <p className="lede">Team sign-in. Ask your lead for the passcode.</p>
      <form onSubmit={submit} style={{ marginTop: 32 }}>
        <div className="field">
          <label className="label" htmlFor="passcode">Passcode</label>
          <input
            id="passcode"
            className="input"
            type="password"
            autoComplete="current-password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            aria-invalid={error ? true : undefined}
            autoFocus
          />
          {error && <span className="error">{error}</span>}
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy || !passcode}>
          {busy ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
