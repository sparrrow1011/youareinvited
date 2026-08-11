'use client';

import type { Event, EventPhoto } from '@/lib/api';
import PhotoGallery from '@/components/PhotoGallery';
import ProFeatureBanner from '@/components/ProFeatureBanner';
import Dialog from '@/components/Dialog';

export interface EventPhotosSectionProps {
  event: Event;
  photos: EventPhoto[];
  loading: boolean;
  error: string;
  showVenueQr: boolean;
  venueQrBlobUrl: string | null;
  onToggleVenueQr: (open: boolean) => void;
  onDeletePhoto: (photoId: string) => Promise<void>;
  downloadAllUrl: string;
}

/**
 * Organizer Photos tab: gallery listing, loading/error states, bulk
 * download, and the venue QR overlay.
 */
export default function EventPhotosSection({
  event,
  photos,
  loading,
  error,
  showVenueQr,
  venueQrBlobUrl,
  onToggleVenueQr,
  onDeletePhoto,
  downloadAllUrl,
}: EventPhotosSectionProps) {
  return (
    <div className="space-y-6">
      {!event.features?.gallery && (
        <ProFeatureBanner featureName="Event Photo Gallery" />
      )}
      {/* Header row */}
      <div className={`flex flex-wrap items-center gap-3${!event.features?.gallery ? ' opacity-50 pointer-events-none' : ''}`}>
        <h2 className="text-lg font-bold text-on-surface flex-1">
          Photo Gallery
          {photos.length > 0 && (
            <span className="ml-2 text-sm font-normal text-on-surface/50">
              {photos.length} photo{photos.length !== 1 ? 's' : ''}
            </span>
          )}
        </h2>

        {/* Venue QR button */}
        <button
          onClick={() => onToggleVenueQr(true)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-full border border-outline/30
                     text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">qr_code</span>
          Venue QR
        </button>

        {/* Download all */}
        {photos.length > 0 && (
          <a
            href={downloadAllUrl}
            download
            className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-brand text-white
                       text-sm font-medium hover:bg-brand/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download All
          </a>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-surface-container animate-pulse" />
          ))}
        </div>
      ) : (
        <PhotoGallery
          photos={photos}
          onDelete={onDeletePhoto}
        />
      )}

      {/* Venue QR modal */}
      {showVenueQr && (
      <Dialog
        open={showVenueQr}
        onClose={() => onToggleVenueQr(false)}
        labelledBy="venue-qr-dialog-title"
        describedBy="venue-qr-dialog-description"
        backdropClassName="z-50 flex items-center justify-center bg-black/50 p-4"
        panelClassName="w-full max-w-xs rounded-3xl bg-surface-container-lowest p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="venue-qr-dialog-title" className="font-bold text-on-surface">Venue QR Code</h3>
          <button
            type="button"
            onClick={() => onToggleVenueQr(false)}
            aria-label="Close venue QR dialog"
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
          </button>
        </div>
        <p id="venue-qr-dialog-description" className="text-xs text-on-surface/60 mb-4">
          Display this at your venue. Guests scan it with their camera app, then use their
          personal invite QR to verify check-in.
        </p>
        {venueQrBlobUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={venueQrBlobUrl}
              alt="Venue QR code"
              className="w-full rounded-2xl"
            />
            <a
              href={venueQrBlobUrl}
              download={`${event.name}-photo-qr.png`}
              className="mt-3 w-full h-10 rounded-full border border-outline/30 text-sm font-medium
                         text-on-surface flex items-center justify-center gap-1.5 hover:bg-surface-container
                         transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span>
              Save QR Image
            </a>
          </>
        ) : (
          <div
            className="w-full aspect-square rounded-2xl bg-surface-container animate-pulse"
            role="status"
            aria-live="polite"
            aria-label="Loading venue QR code"
          />
        )}
      </Dialog>
      )}
    </div>
  );
}
