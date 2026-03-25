'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface Guest {
  id: string;
  name: string;
  seat_number: string | null;
  tag: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
}

// ── Inner component that uses useSearchParams ──────────────────────────────────
function CheckInContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [invitationInput, setInvitationInput] = useState('');
  const [guest, setGuest] = useState<Guest | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // Read token from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(`security_token_${eventId}`);
    if (!stored) {
      router.replace(`/security/event/${eventId}`);
      return;
    }
    setToken(stored);
  }, [eventId, router]);

  // Auto-load guest from ?invitation= param
  const invitationParam = searchParams.get('invitation');
  useEffect(() => {
    if (invitationParam && token) {
      setInvitationInput(invitationParam);
      loadGuest(invitationParam);
    }
  }, [invitationParam, token]);

  const loadGuest = useCallback(async (id: string) => {
    setGuestLoading(true);
    setGuestError(null);
    setGuest(null);
    try {
      const res = await fetch(`/api/invitations/${id}/`);
      if (res.status === 404) {
        setGuestError('Invitation not found.');
        return;
      }
      if (!res.ok) {
        setGuestError('Failed to load guest.');
        return;
      }
      setGuest(await res.json());
    } catch {
      setGuestError('Network error loading guest.');
    } finally {
      setGuestLoading(false);
    }
  }, []);

  const handleCheckIn = async () => {
    if (!guest || !token) return;
    setCheckingIn(true);
    setCheckInError(null);
    try {
      const res = await fetch(`/api/invitations/${guest.id}/check_in/`, {
        method: 'POST',
        headers: { 'X-Security-Token': token },
      });
      if (res.status === 401) {
        const data = await res.json();
        if (data.detail?.toLowerCase().includes('expired')) {
          setSessionExpired(true);
          return;
        }
        setCheckInError('Authentication failed.');
        return;
      }
      if (res.status === 400) {
        const data = await res.json();
        setCheckInError(data.detail || 'Check-in failed.');
        return;
      }
      if (!res.ok) {
        setCheckInError('Check-in failed. Please try again.');
        return;
      }
      setGuest(await res.json());
    } catch {
      setCheckInError('Network error. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem(`security_token_${eventId}`);
    await fetch('/api/auth/security/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    });
    router.push(`/security/event/${eventId}`);
  };

  // ── Aurora background ────────────────────────────────────────────────────────
  const Aurora = () => (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-container/40 blur-[120px]" />
      <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-tertiary-container/30 blur-[100px]" />
      <div className="absolute -bottom-32 left-1/3 w-[480px] h-[480px] rounded-full bg-secondary-container/35 blur-[110px]" />
    </div>
  );

  // ── Session expired screen ───────────────────────────────────────────────────
  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center px-6">
        <Aurora />
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-10 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-amber-500 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
          </div>
          <h1 className="font-headline text-2xl text-on-lp-background mb-2">Session Expired</h1>
          <p className="text-on-surface-variant text-sm mb-6">
            Your security session has expired. Please re-enter the PIN to continue.
          </p>
          <a
            href={`/security/event/${eventId}`}
            className="inline-flex items-center justify-center gap-2 bg-brand text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-brand/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            Re-enter PIN
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lp-background">
      <Aurora />

      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-8 pb-0 max-w-xl mx-auto">
        <span className="font-headline italic text-brand text-xl tracking-tight select-none">
          youareinvited
        </span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-lp-background transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          End Session
        </button>
      </header>

      <main className="max-w-xl mx-auto px-5 py-8 space-y-5">
        {/* Title */}
        <div>
          <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-1">Gate Scanner</p>
          <h1 className="font-headline text-3xl text-on-lp-background">Check-In</h1>
        </div>

        {/* Search */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-6">
          <label className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">
            Invitation ID
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={invitationInput}
              onChange={e => setInvitationInput(e.target.value)}
              placeholder="Scan QR or enter UUID"
              className="flex-1 h-11 rounded-2xl bg-surface-container border border-outline-variant/30 px-4 text-sm text-on-lp-background focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all"
            />
            <button
              onClick={() => loadGuest(invitationInput.trim())}
              disabled={!invitationInput.trim() || guestLoading}
              className="h-11 px-5 rounded-2xl bg-brand text-white text-sm font-semibold disabled:opacity-50 hover:bg-brand/90 transition-colors"
            >
              {guestLoading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : 'Load'}
            </button>
          </div>
          {guestError && (
            <p className="text-sm text-red-600 mt-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {guestError}
            </p>
          )}
        </div>

        {/* Guest card */}
        {guest && (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-6">
            {/* Name */}
            <div className="mb-4">
              <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-1">Guest</p>
              <h2 className="font-headline text-2xl text-on-lp-background">{guest.name}</h2>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-5">
              {guest.seat_number && (
                <div className="flex items-center gap-1.5 bg-brand-container/40 px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-brand text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>chair</span>
                  <span className="text-sm font-semibold text-brand">Seat {guest.seat_number}</span>
                </div>
              )}
              {guest.tag && (
                <div className="flex items-center gap-1.5 bg-secondary-container/40 px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-on-surface text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>label</span>
                  <span className="text-sm font-semibold text-on-surface">{guest.tag}</span>
                </div>
              )}
            </div>

            {/* Status */}
            {guest.checked_in ? (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-green-600 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-700">Already Checked In</p>
                  {guest.checked_in_at && (
                    <p className="text-xs text-green-600 mt-0.5">{new Date(guest.checked_in_at).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {checkInError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-3">
                    <span className="material-symbols-outlined text-red-400 text-base mt-0.5">warning</span>
                    <p className="text-sm text-red-700">{checkInError}</p>
                  </div>
                )}
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="w-full h-12 rounded-full bg-brand text-white font-semibold text-sm hover:bg-brand/90 active:bg-brand/80 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {checkingIn ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
                      Check In Guest
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Page export — wrap in Suspense for useSearchParams ────────────────────────
export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-lp-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    }>
      <CheckInContent />
    </Suspense>
  );
}
