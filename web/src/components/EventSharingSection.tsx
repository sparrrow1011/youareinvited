'use client';

import type { Event, InvitationStats } from '@/lib/api';

type PinSaveStatus = 'idle' | 'saved' | 'cleared' | 'error';

export interface EventSharingSectionProps {
  event?: Event | null;
  stats?: InvitationStats | null;
  securityPinSet: boolean;
  securityPin: string;
  savingPin: boolean;
  pinSaveStatus: PinSaveStatus;
  onSecurityPinChange: (value: string) => void;
  onSavePin: () => void;
  onClearPin: () => void;
  onCopyStaffLink: () => void;
  waTemplate: string;
  savingWaTemplate: boolean;
  waTemplateSaved: boolean;
  waTemplateError: string | null;
  onWaTemplateChange: (value: string) => void;
  onSaveWaTemplate: () => void;
}

/**
 * Organizer Sharing tab: security PIN management, staff link sharing,
 * WhatsApp message template, and event summary.
 */
export default function EventSharingSection({
  event,
  stats,
  securityPinSet,
  securityPin,
  savingPin,
  pinSaveStatus,
  onSecurityPinChange,
  onSavePin,
  onClearPin,
  onCopyStaffLink,
  waTemplate,
  savingWaTemplate,
  waTemplateSaved,
  waTemplateError,
  onWaTemplateChange,
  onSaveWaTemplate,
}: EventSharingSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      <div className="contents">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-brand-container/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-brand text-base" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            </div>
            <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest">Security PIN</p>
          </div>

          {securityPinSet ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                <span className="material-symbols-outlined text-green-600 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                <div>
                  <p className="text-sm font-semibold text-green-700">PIN Active</p>
                  <p className="text-xs text-green-600">••••</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClearPin}
                disabled={savingPin}
                className="w-full h-10 rounded-full border border-outline-variant/30 text-sm text-on-surface-variant hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-all"
              >
                {savingPin ? 'Clearing…' : 'Clear PIN'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label htmlFor="organizer-security-pin" className="sr-only">New security PIN</label>
              <input
                id="organizer-security-pin"
                name="security-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                spellCheck={false}
                pattern="\d{4,6}"
                minLength={4}
                maxLength={6}
                value={securityPin}
                onChange={(e) => onSecurityPinChange(e.target.value.replace(/\D/g, ''))}
                aria-invalid={pinSaveStatus === 'error' ? true : undefined}
                aria-describedby="organizer-security-pin-hint organizer-security-pin-status"
                placeholder="4–6 digit PIN"
                className="w-full h-10 rounded-2xl bg-surface-container border border-outline-variant/30 px-4 text-center text-base font-semibold tracking-widest text-on-lp-background focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all"
                disabled={savingPin}
              />
              <p id="organizer-security-pin-hint" className="sr-only">Enter a 4 to 6 digit PIN to share with your security team.</p>
              <button
                type="button"
                onClick={onSavePin}
                disabled={savingPin || securityPin.length < 4}
                className="w-full h-10 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-50 transition-all"
              >
                {savingPin ? 'Saving…' : 'Save PIN'}
              </button>
            </div>
          )}

          <div id="organizer-security-pin-status" aria-live="polite" aria-atomic="true">
            {pinSaveStatus === 'saved' && (
              <p className="text-xs text-green-600 text-center mt-3 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">check_circle</span>
                PIN saved
              </p>
            )}
            {pinSaveStatus === 'cleared' && (
              <p className="text-xs text-on-surface-variant text-center mt-3">PIN cleared</p>
            )}
            {pinSaveStatus === 'error' && (
              <p className="text-xs text-red-600 text-center mt-3" role="alert">Something went wrong. Please try again.</p>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-outline-variant/20">
            <p className="text-xs text-on-surface-variant mb-3">Share this link + PIN with your security team</p>
            <button
              onClick={onCopyStaffLink}
              className="w-full h-10 rounded-full border border-brand/30 text-brand text-sm font-semibold hover:bg-brand-container/20 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">link</span>
              Copy Staff Link
            </button>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[#25D366]/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#25D366]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <p className="text-xs font-label font-semibold text-on-surface uppercase tracking-widest">WhatsApp Message</p>
          </div>
          <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
            Customise the message sent when sharing via WhatsApp. Use{' '}
            <code className="bg-surface-container px-1 py-0.5 rounded font-mono text-brand">{'{{brand_name}}'}</code>{', '}
            <code className="bg-surface-container px-1 py-0.5 rounded font-mono text-brand">{'{{name}}'}</code>{', '}
            <code className="bg-surface-container px-1 py-0.5 rounded font-mono text-brand">{'{{seat_number}}'}</code>{', '}
            <code className="bg-surface-container px-1 py-0.5 rounded font-mono text-brand">{'{{tag}}'}</code>{', '}
            <code className="bg-surface-container px-1 py-0.5 rounded font-mono text-brand">{'{{link}}'}</code>{' '}as placeholders.
          </p>
          <textarea
            value={waTemplate}
            onChange={(e) => onWaTemplateChange(e.target.value)}
            rows={20}
            placeholder={`{{brand_name}} invited you! 🎉\n\nName: {{name}}\nSeat: {{seat_number}}\n\nView your invitation: {{link}}`}
            className="w-full rounded-2xl bg-surface-container border border-outline-variant/30 px-4 py-3 text-sm text-on-lp-background placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all resize-none font-mono"
          />
          <button
            onClick={onSaveWaTemplate}
            disabled={savingWaTemplate}
            className="w-full h-10 mt-3 rounded-full bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1ebe5c] disabled:opacity-50 transition-all"
          >
            {savingWaTemplate ? 'Saving…' : 'Save Message'}
          </button>
          {waTemplateSaved && (
            <p className="text-xs text-green-600 text-center mt-2 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              Saved
            </p>
          )}
          {waTemplateError && (
            <p className="text-xs text-red-600 text-center mt-2 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[14px]">error</span>
              {waTemplateError}
            </p>
          )}
        </div>
      </div>

      <div className="contents">
        <div className="bg-surface-container-low rounded-[2rem] p-5 sm:p-6 border border-outline-variant/10">
          <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-4">Event Details</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="material-symbols-outlined text-brand text-sm">calendar_today</span>
              <span className="text-on-surface">{event?.date}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="material-symbols-outlined text-brand text-sm">group</span>
              <span className="text-on-surface">{stats?.total_invitations ?? 0} guests</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="material-symbols-outlined text-brand text-sm">how_to_reg</span>
              <span className="text-on-surface">{stats?.checked_in ?? 0} checked in</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-[2rem] p-5 sm:p-6 border border-outline-variant/10">
          <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-4">Sharing Flow</p>
          <div className="space-y-4 text-sm text-on-surface-variant">
            <p>1. Share the public invitation link with guests.</p>
            <p>2. Share the staff link and PIN only with security.</p>
            <p>3. Update the WhatsApp message so your invite copy matches this event.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
