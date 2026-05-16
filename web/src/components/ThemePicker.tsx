'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { THEMES } from '@/themes';
import ThemeCardPreview from '@/components/ThemeCardPreview';

interface Props {
  selectedTheme: string;
  themeData: Record<string, unknown>;
  onSave: (theme: string, themeData: Record<string, unknown>) => void;
  onImageUpload?: (field: 'theme_hero_image' | 'theme_secondary_image', file: File) => Promise<void>;
  onImageClear?: (field: 'theme_hero_image' | 'theme_secondary_image') => Promise<void>;
  saving?: boolean;
  saved?: boolean;
  imageSavingField?: 'theme_hero_image' | 'theme_secondary_image' | null;
  eventName?: string;
  eventDate?: string;
  themeHeroImage?: string | null;
  themeSecondaryImage?: string | null;
  hasTemplate?: boolean;
}

const NONE_THEME = {
  id: '',
  name: 'No Theme',
  description: 'Keep the invite page minimal and let your uploaded artwork or plain layout carry the moment.',
  accentColor: '#ECEEF1',
  extraFields: [] as { key: string; label: string; placeholder?: string }[],
};

export default function ThemePicker({
  selectedTheme,
  themeData,
  onSave,
  onImageUpload,
  onImageClear,
  saving = false,
  saved = false,
  imageSavingField = null,
  eventName,
  eventDate,
  themeHeroImage,
  themeSecondaryImage,
  hasTemplate = false,
}: Props) {
  const [draftTheme, setDraftTheme] = useState(selectedTheme);
  const [draftThemeData, setDraftThemeData] = useState<Record<string, unknown>>(themeData);

  useEffect(() => {
    setDraftTheme(selectedTheme);
    setDraftThemeData(themeData);
  }, [selectedTheme, themeData]);

  const activeMeta = THEMES.find((theme) => theme.id === draftTheme);
  const serializedDraft = JSON.stringify({ theme: draftTheme, data: draftThemeData });
  const serializedSaved = JSON.stringify({ theme: selectedTheme, data: themeData });
  const hasChanges = serializedDraft !== serializedSaved;
  const previewEventName = eventName?.trim() || 'Aurelia at Thirty';
  const previewEventDate = eventDate || '2026-10-24';

  const themeOptions = useMemo(() => [NONE_THEME, ...THEMES], []);

  const handleThemeSelect = (themeId: string) => {
    setDraftTheme(themeId);
    if (!themeId) {
      setDraftThemeData({});
      return;
    }

    if (themeId === selectedTheme) {
      setDraftThemeData(themeData);
      return;
    }

    setDraftThemeData({});
  };

  const handleFieldChange = (key: string, value: string) => {
    setDraftThemeData((current) => ({ ...current, [key]: value }));
  };

  const handleApply = () => {
    onSave(draftTheme, draftThemeData);
  };

  const handleClear = () => {
    setDraftTheme('');
    setDraftThemeData({});
    onSave('', {});
  };

  const imageSlots = [
    {
      field: 'theme_hero_image' as const,
      label: 'Hero Image',
      description: 'Main portrait or editorial photo used at the top of the guest invitation.',
      icon: 'photo_camera',
      src: themeHeroImage,
    },
    {
      field: 'theme_secondary_image' as const,
      label: 'Detail Image',
      description: 'Optional supporting image for rings, cake, florals, venue, or celebration details.',
      icon: 'image',
      src: themeSecondaryImage,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="max-w-2xl space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-container/30 px-4 py-1.5 text-xs font-label font-semibold uppercase tracking-widest text-on-brand-container">
          <span className="material-symbols-outlined text-sm text-brand">style</span>
          Invitation Theme
        </div>
        <div>
          <h3 className="font-headline text-2xl sm:text-3xl text-on-surface">Choose the guest-facing mood.</h3>
          <p className="mt-2 text-sm sm:text-base leading-relaxed text-on-surface-variant">
            This theme shapes the public invitation page guests open from their link. Keep it clean, or pair it with a more expressive style.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 xl:gap-8 items-start">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-8">
          {themeOptions.map((theme, index) => {
            const isSelected = theme.id === draftTheme;
            const previewThemeData = theme.id
              ? Object.fromEntries(
                  theme.extraFields.map((field) => [
                    field.key,
                    draftTheme === theme.id
                      ? String(draftThemeData[field.key] ?? field.placeholder ?? '')
                      : String(themeData[field.key] ?? field.placeholder ?? ''),
                  ]),
                )
              : {};

            return (
              <div
                key={theme.id || 'none'}
                className={`group relative transition-all duration-500 ${index % 2 === 1 ? 'md:translate-y-8' : ''}`}
              >
                <div
                  className={`relative overflow-hidden rounded-[1.6rem] p-[1px] ${
                    isSelected
                      ? 'bg-gradient-to-br from-brand via-tertiary to-secondary shadow-[0_24px_60px_rgba(47,51,54,0.12)]'
                      : 'bg-white/55'
                  }`}
                >
                  <div className="rounded-[calc(1.6rem-1px)] bg-surface-container-lowest">
                    <button
                      type="button"
                      onClick={() => handleThemeSelect(theme.id)}
                      className="relative block w-full overflow-hidden rounded-t-[calc(1.6rem-1px)] text-left transition-all hover:shadow-[0_20px_50px_rgba(47,51,54,0.06)]"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden">
                        <ThemeCardPreview
                          themeId={theme.id}
                          themeName={theme.name}
                          accentColor={theme.accentColor}
                          previewEventName={previewEventName}
                          previewThemeData={previewThemeData}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-on-lp-background/28 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        {isSelected && (
                          <div className="absolute top-4 left-4 rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-md">
                            Selected
                          </div>
                        )}
                      </div>

                      <div className="p-6">
                        <h4 className="font-headline text-xl font-semibold text-on-surface">{theme.name}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                          {theme.description}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center justify-between gap-3 border-t border-outline-variant/10 px-6 py-4">
                      {theme.id ? (
                        <Link
                          href={`/templates/${theme.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand transition-colors hover:text-brand-dim"
                        >
                          Preview
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </Link>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                          Utility View
                        </span>
                      )}

                      {!isSelected && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                          Click card to select
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="lg:col-span-4 lg:sticky lg:top-28">
          <div className="overflow-hidden rounded-[2rem] border border-white/40 bg-[radial-gradient(circle_at_top_right,rgba(115,242,221,0.15),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(185,17,86,0.08),transparent_48%)] bg-surface-container-low p-6 sm:p-8 shadow-[0_20px_60px_rgba(47,51,54,0.06)]">
            <div className="space-y-8">
              <div>
                <h4 className="font-headline text-2xl text-on-surface">Theme Fine-Tuning</h4>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {draftTheme
                    ? 'Adjust the theme-specific details before you apply the style to this event.'
                    : 'No theme is selected. Guests will see the plain invitation page unless you apply a style below.'}
                </p>
              </div>

              <div className="rounded-2xl bg-white/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Current Selection</p>
                    <p className="mt-2 font-headline text-xl text-on-surface">
                      {activeMeta?.name || 'No Theme'}
                    </p>
                  </div>
                  <div
                    className="h-10 w-10 rounded-full border border-white/70 shadow-inner"
                    style={{ backgroundColor: activeMeta?.accentColor || NONE_THEME.accentColor }}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-surface-container px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {hasTemplate ? 'Pairs with Uploaded Template' : 'Best with Plain Invite Flow'}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-surface-container px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Event Date {previewEventDate}
                  </span>
                </div>
                {draftTheme && (
                  <Link
                    href={`/templates/${draftTheme}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand transition-colors hover:text-brand-dim"
                  >
                    Preview in New Window
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </Link>
                )}
              </div>

              {activeMeta && activeMeta.extraFields.length > 0 ? (
                <div className="space-y-5">
                  {activeMeta.extraFields.map((field) => (
                    <div key={field.key}>
                      <label className="mb-2 block text-xs font-label font-bold uppercase tracking-widest text-on-surface-variant">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={String(draftThemeData[field.key] ?? '')}
                        onChange={(event) => handleFieldChange(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        className="h-12 w-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/45 focus:ring-2 focus:ring-brand/20"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-white/70 p-5 text-sm leading-relaxed text-on-surface-variant">
                  {draftTheme
                    ? 'This theme does not require extra inputs. It is ready to apply as-is.'
                    : 'Choosing no theme keeps the public invite page minimal and utility-focused.'}
                </div>
              )}

              {draftTheme && onImageUpload && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-label font-bold uppercase tracking-widest text-on-surface-variant">
                      Theme Images
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-on-surface-variant/80">
                      Upload theme-specific photos for the luxury guest invitation surface.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {imageSlots.map((slot) => {
                      const savingThis = imageSavingField === slot.field;
                      return (
                        <div key={slot.field} className="overflow-hidden rounded-2xl border border-outline-variant/15 bg-white/70">
                          <div className="flex gap-3 p-3">
                            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-container">
                              {slot.src ? (
                                <img
                                  src={slot.src}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-on-surface-variant/55">
                                  <span className="material-symbols-outlined text-2xl">{slot.icon}</span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-on-surface">{slot.label}</p>
                              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{slot.description}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-on-surface px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-on-surface/85 ${savingThis ? 'opacity-60 pointer-events-none' : ''}`}>
                                  <span className="material-symbols-outlined text-sm">{savingThis ? 'hourglass_top' : 'upload'}</span>
                                  {savingThis ? 'Uploading' : slot.src ? 'Replace' : 'Upload'}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    disabled={savingThis}
                                    onChange={async (event) => {
                                      const file = event.target.files?.[0];
                                      event.currentTarget.value = '';
                                      if (file) {
                                        await onImageUpload(slot.field, file);
                                      }
                                    }}
                                  />
                                </label>
                                {slot.src && onImageClear && (
                                  <button
                                    type="button"
                                    onClick={() => onImageClear(slot.field)}
                                    disabled={savingThis}
                                    className="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant transition hover:bg-surface-container-high disabled:opacity-50"
                                  >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={saving || !hasChanges}
                  className="w-full rounded-2xl bg-gradient-to-r from-brand to-tertiary px-5 py-4 text-sm font-bold tracking-wide text-white shadow-xl transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Applying Theme…' : draftTheme ? 'Apply Theme' : 'Save Without Theme'}
                </button>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftTheme(selectedTheme);
                      setDraftThemeData(themeData);
                    }}
                    disabled={saving || !hasChanges}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 py-3 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-base">restart_alt</span>
                    Reset Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={saving || (!draftTheme && !selectedTheme)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 py-3 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-base">format_paint_off</span>
                    Remove Theme
                  </button>
                </div>
                {saved && (
                  <p className="flex items-center justify-center gap-1 text-xs text-green-600">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Theme saved
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-4 rounded-[1.5rem] bg-tertiary-container/20 p-5">
            <span className="material-symbols-outlined text-tertiary">info</span>
            <p className="text-xs leading-relaxed text-on-tertiary-container">
              Themes shape the public invitation page. Uploaded templates still control the generated invitation artwork and QR composition.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
