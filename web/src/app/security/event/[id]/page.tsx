'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { buildApiUrl, resolveMediaUrl } from '@/lib/api';

type PublicEventInfo = {
  name: string;
  brand_name: string;
  brand_logo_url: string | null;
  show_event_branding: boolean;
};

export default function SecurityPinPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [eventInfo, setEventInfo] = useState<PublicEventInfo | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);

  // If a token is already saved, skip PIN entry and go straight to check-in
  useEffect(() => {
    const stored = localStorage.getItem(`security_token_${eventId}`);
    if (stored) {
      router.replace(`/security/event/${eventId}/checkin`);
    }
  }, [eventId, router]);

  useEffect(() => {
    fetch(buildApiUrl(`/events/${eventId}/public_info/`))
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setEventInfo(data))
      .catch(() => setFetchError(true));
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(buildApiUrl(`/events/${eventId}/verify_security_pin/`), {
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

      // Store token in localStorage so the session persists across browser restarts
      localStorage.setItem(`security_token_${eventId}`, token);

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
      <div className="min-h-screen bg-lp-background flex items-center justify-center px-4 sm:px-6">
        <Aurora />
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-6 sm:p-10 max-w-sm w-full text-center">
          <span className="material-symbols-outlined text-red-400 text-4xl mb-4 block">error</span>
          <h1 className="font-headline text-2xl text-on-lp-background mb-2">Event Not Found</h1>
          <p className="text-on-surface-variant text-sm">This event doesn&apos;t exist or the link is invalid.</p>
        </div>
      </div>
    );
  }

  const showEventBranding = eventInfo?.show_event_branding;
  const publicBrandName = eventInfo?.brand_name?.trim() || '';
  const publicBrandLogoUrl = resolveMediaUrl(eventInfo?.brand_logo_url);
  const publicBrandLabel = publicBrandName || eventInfo?.name || 'Event Host';

  return (
    <div className="min-h-screen bg-lp-background flex items-center justify-center px-4 sm:px-6 py-8 sm:py-10">
      <Aurora />

      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="text-center mb-6 sm:mb-8">
          {showEventBranding ? (
            <div className="inline-flex items-center gap-3 rounded-full border border-white/50 bg-white/75 px-4 py-2 shadow-sm backdrop-blur-xl">
              {publicBrandLogoUrl && (
                <img
                  src={publicBrandLogoUrl}
                  alt={`${publicBrandLabel} logo`}
                  className="h-9 w-9 rounded-2xl object-cover border border-white/60 bg-white"
                />
              )}
              <div className="text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Event Access</p>
                <p className="text-sm font-semibold text-on-lp-background">{publicBrandLabel}</p>
              </div>
            </div>
          ) : (
            <span className="font-headline italic text-brand text-xl tracking-tight select-none">
              youareinvited
            </span>
          )}
        </div>

        {/* Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-6 sm:p-8">
          {/* Lock icon */}
          <div className="w-14 h-14 rounded-2xl bg-brand-container/40 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-brand text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
          </div>

          {/* Event name */}
          {eventInfo?.name ? (
            <div className="text-center mb-6">
              <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-1">Security Access</p>
              <h1 className="font-headline text-2xl text-on-lp-background">{eventInfo.name}</h1>
              {showEventBranding && (
                <p className="text-xs text-on-surface-variant mt-2">
                  Check-in flow powered by <span className="font-semibold text-on-lp-background">{publicBrandLabel}</span>
                </p>
              )}
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
              <label htmlFor="security-pin" className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">
                Security PIN
              </label>
              <input
                id="security-pin"
                name="security-pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                spellCheck={false}
                pattern="\d{4,6}"
                minLength={4}
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'security-pin-hint security-pin-error' : 'security-pin-hint'}
                placeholder="••••"
                className="w-full h-12 rounded-2xl bg-surface-container border border-outline-variant/30 px-4 text-center text-lg sm:text-xl font-semibold tracking-[0.35em] sm:tracking-[0.5em] text-on-lp-background focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all"
                disabled={loading}
              />
              <p id="security-pin-hint" className="sr-only">Enter the 4 to 6 digit PIN provided by the event organizer.</p>
            </div>

            {/* Error */}
            {error && (
              <div id="security-pin-error" role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <span className="material-symbols-outlined text-red-400 text-base mt-0.5 shrink-0" aria-hidden="true">warning</span>
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
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />
                  Unlocking check-in…
                </>
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
