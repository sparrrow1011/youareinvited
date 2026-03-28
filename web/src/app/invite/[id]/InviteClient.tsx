'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { invitationService, Invitation, resolveMediaUrl } from '@/lib/api';
import ThemeRenderer from '@/components/ThemeRenderer';

export default function InviteClient({ id }: { id: string }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invitationService.getById(id, { trackView: true })
      .then(setInvitation)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (!invitation) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center px-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-8 max-w-sm w-full text-center">
          <span className="material-symbols-outlined text-4xl text-red-400 mb-4 block">sentiment_dissatisfied</span>
          <h1 className="font-headline text-2xl text-on-lp-background mb-2">Invitation Not Found</h1>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            This invitation doesn't exist or may have been removed.
          </p>
        </div>
      </div>
    );
  }

  // ── Themed full-page experience ──────────────────────────────────────────
  if (invitation.event_theme) {
    const qrContent = invitation.qr_code ? (
      <img
        src={resolveMediaUrl(invitation.qr_code)}
        alt="QR Code"
        style={{ width: 120, height: 120 }}
      />
    ) : undefined;

    return (
      <div className="min-h-screen w-full flex flex-col items-center bg-lp-background">
        <ThemeRenderer
          themeId={invitation.event_theme}
          props={{
            eventName: invitation.event_name,
            inviteeName: invitation.name,
            eventDate: invitation.event_date,
            qrContent,
            ...invitation.event_theme_data,
          }}
        />
      </div>
    );
  }

  const useMinimalPublicInvite = !invitation.event_theme && !invitation.event_has_template;

  if (useMinimalPublicInvite) {
    const checkedIn = invitation.checked_in;

    return (
      <div className="min-h-screen bg-lp-background">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-container/40 blur-[120px]" />
          <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-tertiary-container/30 blur-[100px]" />
          <div className="absolute -bottom-32 left-1/3 w-[480px] h-[480px] rounded-full bg-secondary-container/35 blur-[110px]" />
        </div>

        <main className="flex flex-col items-center px-4 sm:px-5 py-12 sm:py-16 gap-5 max-w-lg mx-auto">
          <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
            <div className="mb-5 text-center">
              <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-1">Guest</p>
              <h1 className="font-headline text-2xl sm:text-3xl text-on-lp-background">{invitation.name}</h1>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mb-5">
              {invitation.seat_number && (
                <div className="flex items-center gap-1.5 bg-brand-container/40 px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-brand text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>chair</span>
                  <span className="text-sm font-semibold text-brand">Seat {invitation.seat_number}</span>
                </div>
              )}
              {invitation.tag && (
                <div className="flex items-center gap-1.5 bg-secondary-container/40 px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-on-surface text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>label</span>
                  <span className="text-sm font-semibold text-on-surface">{invitation.tag}</span>
                </div>
              )}
            </div>

            {checkedIn ? (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-green-600 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-700">Checked In</p>
                  {invitation.checked_in_at && (
                    <p className="text-xs text-green-600 mt-0.5">
                      {new Date(invitation.checked_in_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-brand-container/20 border border-brand/20 rounded-2xl px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-brand-container/40 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-brand text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_scanner</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand">Not yet checked in</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Show your QR code at the venue entrance</p>
                </div>
              </div>
            )}
          </div>

          {invitation.qr_code && (
            <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
              <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-4 text-center">Your QR Code</p>
              <div className="flex justify-center">
                <div className="bg-white rounded-2xl p-4 shadow-md border border-outline-variant/20">
                  <Image
                    src={resolveMediaUrl(invitation.qr_code)}
                    alt="QR Code"
                    width={180}
                    height={180}
                  />
                </div>
              </div>
              <p className="text-center text-xs text-on-surface-variant mt-4">
                Present this at the venue entrance to check in
              </p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── No theme — clean PIL image page ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-lp-background flex flex-col items-center">
      {/* Fixed aurora background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-container/40 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-tertiary-container/30 blur-[100px]" />
        <div className="absolute -bottom-32 left-1/3 w-[480px] h-[480px] rounded-full bg-secondary-container/35 blur-[110px]" />
      </div>

      <main className="flex flex-col items-center px-4 sm:px-5 py-10 gap-6 max-w-lg w-full mx-auto">
        {/* Invitee name */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-1">You're Invited</p>
          <h1 className="font-headline text-3xl sm:text-4xl text-on-lp-background">{invitation.name}</h1>
        </div>

        {/* PIL invitation image */}
        {invitation.e_invite_image && (
          <div className="w-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/50">
            <Image
              src={resolveMediaUrl(invitation.e_invite_image)}
              alt="Your invitation"
              width={600}
              height={900}
              className="w-full h-auto object-contain"
              priority
            />
          </div>
        )}

        {/* QR code */}
        {invitation.qr_code && (
          <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-4">Your Entry QR Code</p>
            <div className="flex justify-center">
              <div className="bg-white rounded-2xl p-4 shadow-md border border-outline-variant/20">
                <Image
                  src={resolveMediaUrl(invitation.qr_code)}
                  alt="QR Code"
                  width={180}
                  height={180}
                />
              </div>
            </div>
            <p className="text-xs text-on-surface-variant mt-4">
              Present this at the venue entrance to check in
            </p>
          </div>
        )}
      </main>

      <footer className="pb-8 text-center">
        <p className="text-xs text-on-surface-variant">
          Powered by <span className="font-semibold text-brand">youareinvited</span>
        </p>
      </footer>
    </div>
  );
}
