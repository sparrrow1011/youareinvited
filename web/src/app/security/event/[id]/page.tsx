'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function SecurityPinPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [eventName, setEventName] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/events/${eventId}/public_info/`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setEventName(data.name))
      .catch(() => setFetchError(true));
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/events/${eventId}/verify_security_pin/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (res.status === 401) {
        setError('Invalid PIN. Please try again.');
        return;
      }
      if (res.status === 403) {
        setError('No security PIN is configured for this event.');
        return;
      }
      if (!res.ok) {
        setError('Something went wrong. Please try again.');
        return;
      }

      const { token } = await res.json();

      // Store token in sessionStorage for API calls (httpOnly cookie can't be read by JS)
      sessionStorage.setItem(`security_token_${eventId}`, token);

      // Set httpOnly cookie via Next.js API route (for middleware gating only)
      await fetch('/api/auth/security/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, token }),
      });

      router.push(`/security/event/${eventId}/checkin`);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // ── Aurora background ──────────────────────────────────────────────────────
  const Aurora = () => (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-container/40 blur-[120px]" />
      <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-tertiary-container/30 blur-[100px]" />
      <div className="absolute -bottom-32 left-1/3 w-[480px] h-[480px] rounded-full bg-secondary-container/35 blur-[110px]" />
    </div>
  );

  if (fetchError) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center px-6">
        <Aurora />
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-10 max-w-sm w-full text-center">
          <span className="material-symbols-outlined text-red-400 text-4xl mb-4 block">error</span>
          <h1 className="font-headline text-2xl text-on-lp-background mb-2">Event Not Found</h1>
          <p className="text-on-surface-variant text-sm">This event doesn&apos;t exist or the link is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lp-background flex items-center justify-center px-6">
      <Aurora />

      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <span className="font-headline italic text-brand text-xl tracking-tight select-none">
            youareinvited
          </span>
        </div>

        {/* Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-8">
          {/* Lock icon */}
          <div className="w-14 h-14 rounded-2xl bg-brand-container/40 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-brand text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
          </div>

          {/* Event name */}
          {eventName ? (
            <div className="text-center mb-6">
              <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-1">Security Access</p>
              <h1 className="font-headline text-2xl text-on-lp-background">{eventName}</h1>
            </div>
          ) : (
            <div className="text-center mb-6">
              <div className="h-4 bg-surface-container rounded animate-pulse w-32 mx-auto mb-2" />
              <div className="h-7 bg-surface-container rounded animate-pulse w-48 mx-auto" />
            </div>
          )}

          {/* PIN form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">
                Security PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4,6}"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full h-12 rounded-2xl bg-surface-container border border-outline-variant/30 px-4 text-center text-xl font-semibold tracking-[0.5em] text-on-lp-background focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all"
                disabled={loading}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <span className="material-symbols-outlined text-red-400 text-base mt-0.5 shrink-0">warning</span>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="w-full h-12 rounded-full bg-brand text-white font-semibold text-sm hover:bg-brand/90 active:bg-brand/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock_open</span>
                  Unlock Check-In
                </>
              )}
            </button>
          </form>

          {/* Helper */}
          <p className="text-center text-xs text-on-surface-variant mt-5">
            Enter the PIN provided by the event organizer
          </p>
        </div>
      </div>
    </div>
  );
}
