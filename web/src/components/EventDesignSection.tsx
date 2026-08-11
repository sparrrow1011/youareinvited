'use client';

import type { ChangeEvent } from 'react';
import ThemePicker from '@/components/ThemePicker';

type ThemeImageField = 'theme_hero_image' | 'theme_secondary_image';

export interface EventDesignSectionProps {
  hasBackgroundImage: boolean;
  backgroundImageUrl: string | null;
  templateSuccess: string;
  onTemplateFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  isPro: boolean;
  selectedTheme: string;
  themeData: Record<string, unknown>;
  onThemeSave: (theme: string, data: Record<string, unknown>) => Promise<void>;
  onThemeImageUpload: (field: ThemeImageField, file: File) => Promise<void>;
  onThemeImageClear: (field: ThemeImageField) => Promise<void>;
  savingTheme: boolean;
  themeSaved: boolean;
  themeImageSavingField: ThemeImageField | null;
  eventName?: string;
  eventDate?: string;
  themeHeroImage: string | null;
  themeSecondaryImage: string | null;
}

/**
 * Organizer Design tab: custom invitation artwork upload, template zone
 * guidance, and pro theme pairing.
 */
export default function EventDesignSection({
  hasBackgroundImage,
  backgroundImageUrl,
  templateSuccess,
  onTemplateFileChange,
  isPro,
  selectedTheme,
  themeData,
  onThemeSave,
  onThemeImageUpload,
  onThemeImageClear,
  savingTheme,
  themeSaved,
  themeImageSavingField,
  eventName,
  eventDate,
  themeHeroImage,
  themeSecondaryImage,
}: EventDesignSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      <div className="contents">
        <div className="bg-surface-container-lowest rounded-[2rem] p-6 sm:p-8 border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-headline text-xl font-normal">Invite Template</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                Upload a custom layout and mark where the guest name, tag, and QR code should land.
              </p>
            </div>
            <span className="material-symbols-outlined text-brand">brush</span>
          </div>

          {hasBackgroundImage ? (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-surface-container">
                <img
                  src={backgroundImageUrl ?? ''}
                  alt="Template preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-on-lp-background/30 to-transparent" />
              </div>
              <p className="text-xs text-on-surface-variant text-center">Custom template active</p>
              <label className="cursor-pointer w-full flex items-center justify-center gap-2 py-2.5 bg-surface-container rounded-full text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-sm">upload</span>
                Replace Template
                <input type="file" accept="image/*" onChange={onTemplateFileChange} className="hidden" />
              </label>
            </div>
          ) : (
            <div>
              <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-brand-container/20 to-secondary-container/30 flex flex-col items-center justify-center mb-4 border-2 border-dashed border-outline-variant/40">
                <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">image</span>
                <p className="text-xs text-on-surface-variant text-center px-4">
                  Upload your invite design
                </p>
              </div>
              <label className="cursor-pointer w-full flex items-center justify-center gap-2 py-3 bg-brand text-white rounded-full text-sm font-medium hover:bg-brand-dim transition-colors shadow-md shadow-brand/20">
                <span className="material-symbols-outlined text-sm">upload_file</span>
                Upload Graphic
                <input type="file" accept="image/*" onChange={onTemplateFileChange} className="hidden" />
              </label>
              <p className="text-xs text-on-surface-variant text-center mt-3 leading-relaxed">
                We&apos;ll help you mark where the guest name, tag, and QR code go.
              </p>
            </div>
          )}

          {templateSuccess && (
            <p className="text-brand text-xs mt-3 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {templateSuccess}
            </p>
          )}
        </div>

      </div>

      <div className="contents">
        <div className="bg-surface-container-low rounded-[2rem] p-5 sm:p-6 border border-outline-variant/10">
          <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-4">Design Notes</p>
          <div className="space-y-4 text-sm text-on-surface-variant">
            <p>Use a portrait graphic for the cleanest result on guest devices.</p>
            <p>Zone placement controls exactly where the QR code, guest name, and tag appear.</p>
            <p>
              {isPro
                ? 'Your plan includes themed invitation pages in addition to the uploaded invitation artwork.'
                : 'Upgrade to Pro if you want to pair the uploaded template with a themed invitation page.'}
            </p>
          </div>
        </div>
      </div>

      {isPro && (
        <div className="lg:col-span-2">
          <ThemePicker
            selectedTheme={selectedTheme}
            themeData={themeData}
            onSave={onThemeSave}
            onImageUpload={onThemeImageUpload}
            onImageClear={onThemeImageClear}
            saving={savingTheme}
            saved={themeSaved}
            imageSavingField={themeImageSavingField}
            eventName={eventName}
            eventDate={eventDate}
            themeHeroImage={themeHeroImage}
            themeSecondaryImage={themeSecondaryImage}
            hasTemplate={hasBackgroundImage}
          />
        </div>
      )}
    </div>
  );
}
