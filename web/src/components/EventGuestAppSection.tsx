'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { EventGiftLink } from '@/lib/api';
import FormField from '@/components/FormField';

type GuestAppTemplate = 'classic' | 'spotlight';

export type GuestAppForm = {
  guest_app_template: GuestAppTemplate;
  start_time: string;
  venue_name: string;
  venue_address: string;
  google_maps_url: string;
  parking_info: string;
  hotel_info: string;
  travel_note: string;
  schedule_items: Array<{ time: string; title: string; description: string; sort_order: number }>;
  gift_links: EventGiftLink[];
};

const GUEST_APP_TEMPLATES: Array<{
  id: GuestAppTemplate;
  name: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'The current clean invite page with RSVP, QR, location, and guest details.',
    icon: 'view_agenda',
  },
  {
    id: 'spotlight',
    name: 'Spotlight',
    description: 'A richer guest portal with a bold welcome screen and quick action layout.',
    icon: 'auto_awesome',
  },
];

export interface EventGuestAppSectionProps {
  form: GuestAppForm;
  onChange: Dispatch<SetStateAction<GuestAppForm>>;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}

/**
 * Organizer Guest App tab: template choice, location/travel details,
 * itinerary, and gift/contribution links.
 */
export default function EventGuestAppSection({
  form,
  onChange,
  saving,
  saved,
  onSave,
}: EventGuestAppSectionProps) {
  const setGuestAppForm = onChange;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest">Invitee Interface</p>
          <h2 className="mt-1 font-headline text-2xl text-on-lp-background">Choose what guests see</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {GUEST_APP_TEMPLATES.map((template) => {
            const isSelected = form.guest_app_template === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setGuestAppForm((current) => ({ ...current, guest_app_template: template.id }))}
                className={`min-h-[132px] rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? 'border-brand bg-brand-container/30 shadow-sm'
                    : 'border-outline-variant/20 bg-surface-container/70 hover:border-brand/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`material-symbols-outlined mt-0.5 text-[24px] ${isSelected ? 'text-brand' : 'text-on-surface-variant'}`}>
                    {template.icon}
                  </span>
                  <span className="block min-w-0">
                    <span className="block text-sm font-semibold text-on-lp-background">{template.name}</span>
                    <span className="mt-1 block text-sm leading-5 text-on-surface-variant">{template.description}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest">Guest App Details</p>
          <h2 className="mt-1 font-headline text-2xl text-on-lp-background">Location and travel</h2>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Event start time', key: 'start_time', type: 'time', placeholder: '' },
            { label: 'Venue name', key: 'venue_name', type: 'text', placeholder: 'e.g. The Civic Centre' },
            { label: 'Venue address', key: 'venue_address', type: 'text', placeholder: 'Street, city, country' },
            { label: 'Google Maps URL', key: 'google_maps_url', type: 'url', placeholder: 'https://maps.google.com/...' },
            { label: 'Parking info', key: 'parking_info', type: 'text', placeholder: 'Where guests should park' },
            { label: 'Hotel info', key: 'hotel_info', type: 'text', placeholder: 'Recommended hotel or area' },
            { label: 'Travel note', key: 'travel_note', type: 'text', placeholder: 'Taxi, airport, or arrival notes' },
          ].map(({ label, key, type, placeholder }) => (
            <FormField
              key={key}
              id={`guest-app-${key}`}
              label={label}
              labelClassName="text-xs font-semibold uppercase tracking-widest text-on-surface-variant"
            >
              {(fieldProps) => (
                <input
                  {...fieldProps}
                  type={type}
                  value={(form as any)[key]}
                  onChange={(event) => setGuestAppForm((current) => ({ ...current, [key]: event.target.value }))}
                  placeholder={placeholder}
                  className="mt-2 h-11 w-full rounded-2xl border border-outline-variant/20 bg-surface-container px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-brand/30"
                />
              )}
            </FormField>
          ))}
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest">Itinerary</p>
            <h2 className="mt-1 font-headline text-2xl text-on-lp-background">Guest timeline</h2>
          </div>
          <button
            type="button"
            onClick={() => setGuestAppForm((current) => ({
              ...current,
              schedule_items: [
                ...current.schedule_items,
                { time: '18:00', title: '', description: '', sort_order: current.schedule_items.length },
              ],
            }))}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-3 text-xs font-semibold text-white"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add
          </button>
        </div>

        <div className="space-y-4">
          {form.schedule_items.map((item, index) => (
            <div key={index} className="rounded-2xl border border-outline-variant/20 bg-surface-container/70 p-4">
              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                <input
                  type="time"
                  value={item.time}
                  onChange={(event) => setGuestAppForm((current) => ({
                    ...current,
                    schedule_items: current.schedule_items.map((row, rowIndex) => rowIndex === index ? { ...row, time: event.target.value } : row),
                  }))}
                  className="h-10 rounded-xl border border-outline-variant/20 bg-white/70 px-3 text-sm outline-none focus:ring-2 focus:ring-brand/30"
                />
                <input
                  value={item.title}
                  onChange={(event) => setGuestAppForm((current) => ({
                    ...current,
                    schedule_items: current.schedule_items.map((row, rowIndex) => rowIndex === index ? { ...row, title: event.target.value } : row),
                  }))}
                  placeholder="Schedule title"
                  className="h-10 rounded-xl border border-outline-variant/20 bg-white/70 px-3 text-sm outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
              <textarea
                value={item.description}
                onChange={(event) => setGuestAppForm((current) => ({
                  ...current,
                  schedule_items: current.schedule_items.map((row, rowIndex) => rowIndex === index ? { ...row, description: event.target.value } : row),
                }))}
                rows={2}
                placeholder="Optional description"
                className="mt-3 w-full rounded-xl border border-outline-variant/20 bg-white/70 px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-brand/30"
              />
              {form.schedule_items.length > 1 && (
                <button
                  type="button"
                  onClick={() => setGuestAppForm((current) => ({
                    ...current,
                    schedule_items: current.schedule_items.filter((_, rowIndex) => rowIndex !== index),
                  }))}
                  className="mt-2 text-xs font-semibold text-tertiary"
                >
                  Remove item
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest">Gifts & Payments</p>
            <h2 className="mt-1 font-headline text-2xl text-on-lp-background">Gift and contribution links</h2>
          </div>
          <button
            type="button"
            onClick={() => setGuestAppForm((current) => ({
              ...current,
              gift_links: [
                ...current.gift_links,
                { title: '', url: '', description: '', is_active: true, sort_order: current.gift_links.length },
              ],
            }))}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-3 text-xs font-semibold text-white"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {form.gift_links.map((link, index) => (
            <div key={index} className="rounded-2xl border border-outline-variant/20 bg-surface-container/70 p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
                <input
                  value={link.title}
                  onChange={(event) => setGuestAppForm((current) => ({
                    ...current,
                    gift_links: current.gift_links.map((row, rowIndex) => rowIndex === index ? { ...row, title: event.target.value } : row),
                  }))}
                  placeholder="Link title, e.g. Gift registry"
                  className="h-10 rounded-xl border border-outline-variant/20 bg-white/70 px-3 text-sm outline-none focus:ring-2 focus:ring-brand/30"
                />
                <input
                  type="url"
                  value={link.url}
                  onChange={(event) => setGuestAppForm((current) => ({
                    ...current,
                    gift_links: current.gift_links.map((row, rowIndex) => rowIndex === index ? { ...row, url: event.target.value } : row),
                  }))}
                  placeholder="https://..."
                  className="h-10 rounded-xl border border-outline-variant/20 bg-white/70 px-3 text-sm outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
              <textarea
                value={link.description}
                onChange={(event) => setGuestAppForm((current) => ({
                  ...current,
                  gift_links: current.gift_links.map((row, rowIndex) => rowIndex === index ? { ...row, description: event.target.value } : row),
                }))}
                rows={2}
                placeholder="Optional description, e.g. Contribute to the honeymoon fund."
                className="mt-3 w-full rounded-xl border border-outline-variant/20 bg-white/70 px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-brand/30"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-on-surface">
                  <input
                    type="checkbox"
                    checked={link.is_active}
                    onChange={(event) => setGuestAppForm((current) => ({
                      ...current,
                      gift_links: current.gift_links.map((row, rowIndex) => rowIndex === index ? { ...row, is_active: event.target.checked } : row),
                    }))}
                  />
                  Show to guests
                </label>
                {form.gift_links.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setGuestAppForm((current) => ({
                      ...current,
                      gift_links: current.gift_links.filter((_, rowIndex) => rowIndex !== index),
                    }))}
                    className="text-xs font-semibold text-tertiary"
                  >
                    Remove link
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {saved && (
          <span className="text-sm font-semibold text-brand">Guest app saved</span>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="h-11 rounded-full bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Guest App'}
        </button>
      </div>
    </div>
  );
}
