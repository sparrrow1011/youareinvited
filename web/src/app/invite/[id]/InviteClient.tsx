'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { invitationService, eventService, Invitation, EventPhoto, resolveMediaUrl } from '@/lib/api';
import PoweredByFooter from '@/components/PoweredByFooter';
import ThemeRenderer from '@/components/ThemeRenderer';
import PhotoGallery from '@/components/PhotoGallery';

export default function InviteClient({ id }: { id: string }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingRsvp, setSavingRsvp] = useState(false);
  const [rsvpError, setRsvpError] = useState('');
  const [rsvpForm, setRsvpForm] = useState({
    attending: false,
    guest_count: 1,
    meal_preference: '',
    allergies: '',
    needs_parking: false,
    needs_hotel_info: false,
    note: '',
  });

  // Photo gallery state
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    invitationService.getById(id, { trackView: true })
      .then(setInvitation)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!invitation) return;
    setRsvpForm({
      attending: Boolean(invitation.rsvp_responded_at && invitation.rsvp_attending),
      guest_count: invitation.rsvp_guest_count || 1,
      meal_preference: invitation.meal_preference || '',
      allergies: invitation.allergies || '',
      needs_parking: invitation.needs_parking || false,
      needs_hotel_info: invitation.needs_hotel_info || false,
      note: invitation.rsvp_note || '',
    });
  }, [invitation?.id]);

  // Load photos once we know the guest is checked in
  useEffect(() => {
    if (!invitation?.checked_in || !invitation?.event_features?.gallery) return;
    setPhotosLoading(true);
    eventService.listPhotos(invitation.event, invitation.id)
      .then(setPhotos)
      .catch(() => {})
      .finally(() => setPhotosLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitation?.checked_in, invitation?.event_features?.gallery, invitation?.event, invitation?.id]);

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

  const saveRsvp = async (nextForm = rsvpForm) => {
    setSavingRsvp(true);
    setRsvpError('');
    try {
      const updated = await invitationService.rsvp(invitation.id, nextForm);
      setInvitation(updated);
    } catch {
      setRsvpError('Could not save your RSVP. Please try again.');
    } finally {
      setSavingRsvp(false);
    }
  };

  const handleRsvpChange = async (attending: boolean) => {
    const confirmed = window.confirm(
      attending
        ? 'Are you sure you will be attending?'
        : 'Are you sure you will not be attending?'
    );
    if (!confirmed) return;

    const nextForm = { ...rsvpForm, attending };
    setRsvpForm(nextForm);
    await saveRsvp(nextForm);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadError('');
    setUploadingPhoto(true);
    try {
      const newPhoto = await eventService.uploadPhoto(invitation.event, invitation.id, file);
      setPhotos((prev) => [newPhoto, ...prev]);
    } catch {
      setUploadError('Could not upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const rsvpLabel = !invitation.rsvp_responded_at
    ? 'No RSVP yet'
    : invitation.rsvp_attending
      ? 'You are attending'
      : 'You are not attending';

  const eventDateTime = new Date(`${invitation.event_date}T${invitation.event_start_time || '00:00:00'}`);
  const countdownDays = Math.max(
    0,
    Math.ceil((eventDateTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
  const eventDateLabel = eventDateTime.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const eventTimeLabel = invitation.event_start_time
    ? eventDateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';
  const hasLocation = Boolean(
    invitation.event_venue_name ||
    invitation.event_venue_address ||
    invitation.event_google_maps_url ||
    invitation.event_parking_info ||
    invitation.event_hotel_info ||
    invitation.event_travel_note
  );
  const hasSeating = Boolean(invitation.table_number || invitation.seat_number || invitation.group_label);

  const rsvpCard = (
    <div id="rsvp" className="w-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-1">RSVP</p>
          <h2 className="font-headline text-xl text-on-lp-background">Confirm your plans</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{rsvpLabel}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          { value: true, label: 'Yes, I am coming', icon: 'event_available' },
          { value: false, label: 'No, I cannot attend', icon: 'event_busy' },
        ].map((option) => {
          const selected = Boolean(invitation.rsvp_responded_at) && rsvpForm.attending === option.value;
          return (
            <label
              key={option.label}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                selected
                  ? 'border-brand bg-brand-container/35'
                  : 'border-outline-variant/20 bg-surface-container/70 hover:border-brand/30'
              } ${savingRsvp ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="radio"
                name="rsvp-attendance"
                checked={selected}
                onChange={() => handleRsvpChange(option.value)}
                disabled={savingRsvp}
                className="h-4 w-4 accent-brand"
              />
              <span className={`material-symbols-outlined text-[18px] ${selected ? 'text-brand' : 'text-on-surface-variant'}`}>
                {option.icon}
              </span>
              <span className="text-sm font-semibold text-on-surface">{option.label}</span>
            </label>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">People attending</span>
          <input
            type="number"
            min={1}
            max={20}
            value={rsvpForm.guest_count}
            onChange={(event) => setRsvpForm((current) => ({ ...current, guest_count: Number(event.target.value) || 1 }))}
            className="mt-2 h-11 w-full rounded-2xl border border-outline-variant/20 bg-surface-container px-3 text-sm outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Meal preference</span>
          <input
            value={rsvpForm.meal_preference}
            onChange={(event) => setRsvpForm((current) => ({ ...current, meal_preference: event.target.value }))}
            placeholder="e.g. Chicken, vegan"
            className="mt-2 h-11 w-full rounded-2xl border border-outline-variant/20 bg-surface-container px-3 text-sm outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Allergies or note</span>
          <textarea
            value={rsvpForm.allergies}
            onChange={(event) => setRsvpForm((current) => ({ ...current, allergies: event.target.value }))}
            rows={2}
            placeholder="Tell the host anything important."
            className="mt-2 w-full rounded-2xl border border-outline-variant/20 bg-surface-container px-3 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <label className="flex items-center gap-2 rounded-2xl bg-surface-container/70 px-3 py-3 text-sm font-medium text-on-surface">
          <input
            type="checkbox"
            checked={rsvpForm.needs_parking}
            onChange={(event) => setRsvpForm((current) => ({ ...current, needs_parking: event.target.checked }))}
          />
          Need parking info
        </label>
        <label className="flex items-center gap-2 rounded-2xl bg-surface-container/70 px-3 py-3 text-sm font-medium text-on-surface">
          <input
            type="checkbox"
            checked={rsvpForm.needs_hotel_info}
            onChange={(event) => setRsvpForm((current) => ({ ...current, needs_hotel_info: event.target.checked }))}
          />
          Need hotel info
        </label>
      </div>
      <button
        type="button"
        onClick={() => saveRsvp()}
        disabled={savingRsvp}
        className="mt-4 h-11 w-full rounded-full bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50"
      >
        {savingRsvp ? 'Saving...' : 'Save RSVP details'}
      </button>
      {savingRsvp && <p className="mt-3 text-xs text-on-surface-variant">Saving RSVP...</p>}
      {rsvpError && <p className="mt-3 text-xs text-tertiary">{rsvpError}</p>}
    </div>
  );

  const guestHome = (
    <div className="w-full bg-white/75 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
      <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-2">Welcome, {invitation.name}</p>
      <h1 className="font-headline text-3xl text-on-lp-background">{invitation.event_name}</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        {eventDateLabel}{eventTimeLabel ? ` at ${eventTimeLabel}` : ''}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-brand-container/35 px-4 py-3">
          <p className="text-xs text-on-surface-variant">Countdown</p>
          <p className="text-2xl font-bold text-brand">{countdownDays}</p>
          <p className="text-xs text-brand">day{countdownDays === 1 ? '' : 's'} to go</p>
        </div>
        <div className="rounded-2xl bg-surface-container px-4 py-3">
          <p className="text-xs text-on-surface-variant">RSVP</p>
          <p className="text-base font-semibold text-on-surface">{rsvpLabel}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {[
          ['#rsvp', 'event_available', 'RSVP'],
          ['#location', 'location_on', 'Location'],
          ['#schedule', 'calendar_month', 'Schedule'],
          ['#gifts', 'card_giftcard', 'Gifts'],
          ['#memories', 'add_a_photo', 'Memories'],
        ].map(([href, icon, label]) => (
          <a key={href} href={href} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-surface-container px-3 py-2 text-xs font-semibold text-on-surface">
            <span className="material-symbols-outlined text-[16px]">{icon}</span>
            {label}
          </a>
        ))}
      </div>
    </div>
  );

  const scheduleSection = invitation.event_schedule_items.length > 0 ? (
    <div id="schedule" className="w-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
      <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-4">Schedule</p>
      <div className="space-y-4">
        {invitation.event_schedule_items.map((item) => (
          <div key={`${item.time}-${item.title}`} className="flex gap-3">
            <div className="w-20 shrink-0 text-sm font-semibold text-brand">{item.time.slice(0, 5)}</div>
            <div className="border-l border-outline-variant/30 pl-4">
              <p className="text-sm font-semibold text-on-surface">{item.title}</p>
              {item.description && <p className="mt-1 text-xs text-on-surface-variant">{item.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const locationSection = hasLocation ? (
    <div id="location" className="w-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
      <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-3">Location</p>
      {invitation.event_venue_name && <h2 className="font-headline text-xl text-on-lp-background">{invitation.event_venue_name}</h2>}
      {invitation.event_venue_address && <p className="mt-2 text-sm text-on-surface-variant">{invitation.event_venue_address}</p>}
      {invitation.event_google_maps_url && (
        <a href={invitation.event_google_maps_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white">
          <span className="material-symbols-outlined text-[18px]">map</span>
          Open map
        </a>
      )}
      <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
        {invitation.event_parking_info && <p><span className="font-semibold text-on-surface">Parking:</span> {invitation.event_parking_info}</p>}
        {invitation.event_hotel_info && <p><span className="font-semibold text-on-surface">Hotels:</span> {invitation.event_hotel_info}</p>}
        {invitation.event_travel_note && <p><span className="font-semibold text-on-surface">Travel:</span> {invitation.event_travel_note}</p>}
      </div>
    </div>
  ) : null;

  const giftSection = invitation.event_gift_links.length > 0 ? (
    <div id="gifts" className="w-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
      <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-3">Gifts</p>
      <h2 className="font-headline text-xl text-on-lp-background">Gift and contribution links</h2>
      <div className="mt-4 grid gap-3">
        {invitation.event_gift_links.map((link) => (
          <a
            key={link.id ?? `${link.title}-${link.url}`}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-start justify-between gap-3 rounded-2xl bg-surface-container/80 px-4 py-3 transition hover:bg-surface-container-high"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-on-surface">{link.title}</span>
              {link.description && (
                <span className="mt-1 block text-xs leading-5 text-on-surface-variant">{link.description}</span>
              )}
            </span>
            <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-brand">open_in_new</span>
          </a>
        ))}
      </div>
    </div>
  ) : null;

  const seatingSection = hasSeating ? (
    <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
      <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-3">Your Seat</p>
      <div className="grid grid-cols-2 gap-3">
        {invitation.table_number && <div className="rounded-2xl bg-surface-container px-4 py-3"><p className="text-xs text-on-surface-variant">Table</p><p className="font-semibold">{invitation.table_number}</p></div>}
        {invitation.seat_number && <div className="rounded-2xl bg-surface-container px-4 py-3"><p className="text-xs text-on-surface-variant">Seat</p><p className="font-semibold">{invitation.seat_number}</p></div>}
        {invitation.group_label && <div className="col-span-2 rounded-2xl bg-surface-container px-4 py-3"><p className="text-xs text-on-surface-variant">Group</p><p className="font-semibold">{invitation.group_label}</p></div>}
      </div>
    </div>
  ) : null;

  // ── Guest photo gallery (only visible after check-in and when gallery feature is enabled) ───
  const guestPhotoSection = invitation.checked_in && invitation.event_features?.gallery ? (
    <div id="memories" className="w-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div>
          <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-0.5">
            Event Photos
          </p>
          <p className="font-headline text-lg text-on-lp-background">
            {photos.length > 0
              ? `${photos.length} photo${photos.length !== 1 ? 's' : ''}`
              : 'Gallery'}
          </p>
        </div>

        {/* Upload button — hidden file input */}
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handlePhotoUpload}
            disabled={uploadingPhoto}
          />
          <span
            className={`flex items-center gap-1.5 bg-brand text-white text-sm font-semibold
                        px-4 py-2 rounded-full transition-all select-none
                        ${uploadingPhoto ? 'opacity-60 cursor-not-allowed' : 'hover:bg-brand/90 active:scale-95 cursor-pointer'}`}
          >
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              add_a_photo
            </span>
            {uploadingPhoto ? 'Uploading…' : 'Add Photo'}
          </span>
        </label>
      </div>

      {uploadError && (
        <p className="px-5 pb-3 text-xs text-red-500">{uploadError}</p>
      )}

      {/* Gallery grid */}
      <div className="px-5 pb-5">
        {photosLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-surface-container rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <PhotoGallery photos={photos} showUploaderName />
        )}
      </div>
    </div>
  ) : null;

  const qrCard = invitation.qr_code ? (
    <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6 text-center">
      <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-4">Your QR Code</p>
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
  ) : null;

  if (invitation.event_guest_app_template === 'spotlight') {
    return (
      <div className="min-h-screen bg-[#141414] text-white">
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-8">
          <section className="grid min-h-[420px] gap-6 overflow-hidden rounded-[2rem] bg-[#f4f7f2] text-[#201b17] lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#b2472d]">Welcome, {invitation.name}</p>
                <h1 className="mt-4 max-w-2xl font-headline text-4xl leading-tight sm:text-5xl lg:text-6xl">
                  {invitation.event_name}
                </h1>
                <p className="mt-5 text-base font-medium text-[#65584f]">
                  {eventDateLabel}{eventTimeLabel ? ` at ${eventTimeLabel}` : ''}
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#7b6d62]">Countdown</p>
                  <p className="mt-2 text-3xl font-bold text-[#b2472d]">{countdownDays}</p>
                  <p className="text-xs font-semibold text-[#b2472d]">day{countdownDays === 1 ? '' : 's'} to go</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-4 shadow-sm sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#7b6d62]">RSVP</p>
                  <p className="mt-2 text-lg font-semibold text-[#201b17]">{rsvpLabel}</p>
                </div>
              </div>
            </div>

            <div className="flex min-h-[320px] items-center justify-center bg-[#2d6f6d] p-5 sm:p-8">
              {invitation.e_invite_image ? (
                <div className="w-full max-w-[360px] overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
                  <Image
                    src={resolveMediaUrl(invitation.e_invite_image)}
                    alt="Your invitation"
                    width={600}
                    height={900}
                    className="h-auto w-full object-contain"
                    priority
                  />
                </div>
              ) : (
                <div className="w-full max-w-[360px] rounded-[1.75rem] border border-white/25 bg-white/10 p-6 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Private Invite</p>
                  <p className="mt-4 font-headline text-3xl">{invitation.name}</p>
                  <p className="mt-3 text-sm text-white/75">{invitation.tag || invitation.seat_number || 'Your personal guest portal'}</p>
                </div>
              )}
            </div>
          </section>

          <nav className="grid gap-3 sm:grid-cols-5">
            {[
              ['#rsvp', 'event_available', 'RSVP'],
              ['#location', 'location_on', 'Location'],
              ['#schedule', 'calendar_month', 'Schedule'],
              ['#gifts', 'card_giftcard', 'Gifts'],
              ['#memories', 'add_a_photo', 'Memories'],
            ].map(([href, icon, label]) => (
              <a
                key={href}
                href={href}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15"
              >
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                {label}
              </a>
            ))}
          </nav>

          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col gap-6">
              {rsvpCard}
              {seatingSection}
              {qrCard}
            </div>
            <div className="flex flex-col gap-6">
              {scheduleSection}
              {locationSection}
              {giftSection}
              {guestPhotoSection}
            </div>
          </section>
        </main>
        <PoweredByFooter />
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
            seatNumber: invitation.seat_number,
            tag: invitation.tag,
            eventDate: invitation.event_date,
            qrContent,
            ...invitation.event_theme_data,
          }}
        />
        <div className="w-full max-w-lg px-4 sm:px-5 pb-10 flex flex-col gap-5">
          {guestHome}
          {rsvpCard}
          {scheduleSection}
          {locationSection}
          {giftSection}
          {seatingSection}
          {guestPhotoSection}
        </div>
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
          {guestHome}

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

          {rsvpCard}

          {scheduleSection}

          {locationSection}

          {giftSection}

          {seatingSection}

          {guestPhotoSection}

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
        {guestHome}

        {/* Invitee name */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-1">You're Invited</p>
          <h1 className="font-headline text-3xl sm:text-4xl text-on-lp-background">{invitation.name}</h1>
          {(invitation.seat_number || invitation.tag) && (
            <div className="mt-3 flex flex-wrap justify-center gap-3">
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
          )}
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

        {rsvpCard}

        {scheduleSection}

        {locationSection}

        {giftSection}

        {seatingSection}

        {guestPhotoSection}

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

      <PoweredByFooter />
    </div>
  );
}
