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
