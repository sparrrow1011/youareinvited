'use client';

import { useState, useCallback, useEffect } from 'react';
import { resolveMediaUrl } from '@/lib/api';
import { EventPhoto } from '@/lib/api';

interface PhotoGalleryProps {
  photos: EventPhoto[];
  onDelete?: (photoId: string) => void; // if provided, shows ✕ button per photo
  showUploaderName?: boolean;           // if true, shows uploader name below each thumbnail
}

export default function PhotoGallery({ photos, onDelete, showUploaderName }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prev = useCallback(
    () => setLightboxIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null)),
    [photos.length],
  );
  const next = useCallback(
    () => setLightboxIndex((i) => (i !== null ? (i + 1) % photos.length : null)),
    [photos.length],
  );

  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, closeLightbox, prev, next]);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span
          className="material-symbols-outlined text-5xl text-on-surface/30 mb-3"
          style={{ fontVariationSettings: "'FILL' 0" }}
        >
          photo_library
        </span>
        <p className="text-on-surface/50 text-sm">No photos yet. Be the first to upload!</p>
      </div>
    );
  }

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {photos.map((photo, index) => (
          <div key={photo.id} className="relative group flex flex-col">
            <div className="relative aspect-square">
              <button
                onClick={() => setLightboxIndex(index)}
                className="w-full h-full rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveMediaUrl(photo.image_url)}
                  alt={`Event photo ${index + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </button>

              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(photo.id);
                  }}
                  aria-label={`Delete photo ${index + 1}`}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white
                             flex items-center justify-center
                             opacity-100 sm:opacity-0 sm:group-hover:sm:opacity-100 sm:group-focus-within:opacity-100
                             transition-opacity hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
                </button>
              )}
            </div>

            {showUploaderName && photo.uploaded_by_name && (
              <p className="text-[11px] text-on-surface-variant truncate mt-1 px-0.5">
                {photo.uploaded_by_name}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            aria-label="Close photo viewer"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white
                       flex items-center justify-center hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={closeLightbox}
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
          </button>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              aria-label="Previous photo"
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 text-white
                         flex items-center justify-center hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              onClick={(e) => { e.stopPropagation(); prev(); }}
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">chevron_left</span>
            </button>
          )}

          {/* Image */}
          <div className="max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveMediaUrl(photos[lightboxIndex].image_url)}
              alt={`Event photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <div className="flex items-center justify-center gap-3 mt-2">
              {showUploaderName && photos[lightboxIndex].uploaded_by_name && (
                <p className="text-white/70 text-xs">
                  <span className="text-white/40 mr-1">by</span>
                  {photos[lightboxIndex].uploaded_by_name}
                </p>
              )}
              <p className="text-white/40 text-xs">
                {lightboxIndex + 1} / {photos.length}
              </p>
            </div>
          </div>

          {/* Next */}
          {photos.length > 1 && (
            <button
              aria-label="Next photo"
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 text-white
                         flex items-center justify-center hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              onClick={(e) => { e.stopPropagation(); next(); }}
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">chevron_right</span>
            </button>
          )}
        </div>
      )}
    </>
  );
}
