'use client';

import { useState, useEffect } from 'react';
import { invitationService, Invitation, resolveMediaUrl } from '@/lib/api';
import Image from 'next/image';
import ThemeRenderer from '@/components/ThemeRenderer';

export default function InvitationClient({ id }: { id: string }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    invitationService.getById(id, { trackView: true })
      .then(setInvitation)
      .catch(() => {/* stay null */})
      .finally(() => setLoading(false));
  }, [id]);

  const handleShareWhatsApp = () => {
    if (!invitation) return;
    invitationService.trackShare(invitation.id, 'whatsapp').catch(() => undefined);
    window.open(invitation.whatsapp_share_url, '_blank');
  };

  const handleCopyLink = async () => {
    if (!invitation) return;

    try {
      await navigator.clipboard.writeText(invitation.invitation_url);
      setCopied(true);
      invitationService.trackShare(invitation.id, 'link').catch(() => undefined);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadInvite = () => {
    if (!invitation) return;
    window.open(resolveMediaUrl(invitation.e_invite_image), '_blank');
  };

  // ── Aurora background (shared by all states) ──────────────────────────────
  const Aurora = () => (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-container/40 blur-[120px]" />
      <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-tertiary-container/30 blur-[100px]" />
      <div className="absolute -bottom-32 left-1/3 w-[480px] h-[480px] rounded-full bg-secondary-container/35 blur-[110px]" />
    </div>
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center">
        <Aurora />
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <p className="text-on-surface-variant text-sm font-label">Loading your invitation…</p>
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!invitation) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center px-4 sm:px-6">
        <Aurora />
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-6 sm:p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-red-400 text-3xl">sentiment_dissatisfied</span>
          </div>
          <h1 className="font-headline text-2xl text-on-lp-background mb-2">Invitation Not Found</h1>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            This invitation doesn't exist or may have been removed. Please check the link and try again.
          </p>
        </div>
      </div>
    );
  }

  const checkedIn = invitation.checked_in;
  const showEventBranding = invitation.show_event_branding;
  const publicBrandName = invitation.brand_name?.trim() || '';
  const publicBrandLogoUrl = resolveMediaUrl(invitation.brand_logo_url);
  const publicBrandLabel = publicBrandName || invitation.event_name || 'Event Host';

  return (
    <div className="min-h-screen bg-lp-background">
      <Aurora />

      {/* ── Top wordmark ──────────────────────────────────────────────────── */}
      <header className="flex justify-center pt-6 sm:pt-8 pb-0 px-4">
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Presented by</p>
              <p className="text-sm font-semibold text-on-lp-background">{publicBrandLabel}</p>
            </div>
          </div>
        ) : (
          <span className="font-headline italic text-brand text-xl tracking-tight select-none">
            youareinvited
          </span>
        )}
      </header>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex flex-col items-center px-4 sm:px-5 py-8 sm:py-10 gap-5 max-w-lg mx-auto">

        {/* Themed invitation card — takes priority over PIL image */}
        {invitation.event_theme ? (
          <div className="w-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/50">
            <ThemeRenderer
              themeId={invitation.event_theme}
              props={{
                eventName: invitation.event_name,
                inviteeName: invitation.name,
                eventDate: invitation.event_date,
                qrContent: invitation.qr_code ? (
                  <img
                    src={resolveMediaUrl(invitation.qr_code)}
                    alt="QR Code"
                    style={{ width: 120, height: 120 }}
                  />
                ) : undefined,
                ...invitation.event_theme_data,
              }}
            />
          </div>
        ) : invitation.e_invite_image ? (
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
        ) : null}

        {/* Guest details card */}
        <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
          {/* Name */}
          <div className="mb-5 text-center">
            <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-1">Guest</p>
            <h1 className="font-headline text-2xl sm:text-3xl text-on-lp-background">{invitation.name}</h1>
          </div>

          {/* Seat + Tag badges */}
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

          {/* Check-in status */}
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

        {/* QR code card */}
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
              Present this at the venue — security will scan to check you in
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5c] active:bg-[#19a850] text-white font-semibold text-sm py-3 px-4 rounded-2xl transition-colors shadow-md"
          >
            {/* WhatsApp SVG icon */}
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-dim active:bg-brand/90 text-white font-semibold text-sm py-3 px-4 rounded-2xl transition-colors shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {copied ? 'check' : 'link'}
            </span>
            {copied ? 'Copied' : 'Copy Link'}
          </button>
          <button
            onClick={handleDownloadInvite}
            className="flex items-center justify-center gap-2 bg-on-lp-background hover:bg-on-surface text-white font-semibold text-sm py-3 px-4 rounded-2xl transition-colors shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>download</span>
            Download
          </button>
        </div>

      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="text-center pb-8 sm:pb-10 px-4 sm:px-6">
        {showEventBranding && (
          <p className="text-xs text-on-surface-variant mb-1">
            Hosted by <span className="font-semibold text-on-lp-background">{publicBrandLabel}</span>
          </p>
        )}
        <p className="text-xs text-on-surface-variant">
          Powered by <span className="font-semibold text-brand">youareinvited</span>
        </p>
      </footer>
    </div>
  );
}
