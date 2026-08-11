'use client';

import { useCallback, useState } from 'react';
import { resolveMediaUrl } from '@/lib/api';
import type { EventPhoto } from '@/lib/api';
import PhotoLightbox from '@/components/PhotoLightbox';

interface PhotoGalleryProps {
  photos: EventPhoto[];
  onDelete?: (photoId: string) => void; // if provided, shows ✕ button per photo
  showUploaderName?: boolean;           // if true, shows uploader name below each thumbnail
}

export default function PhotoGallery({ photos, onDelete, showUploaderName }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

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
      <PhotoLightbox
        photos={photos}
        index={lightboxIndex}
        onClose={closeLightbox}
        onNavigate={setLightboxIndex}
        showUploaderName={showUploaderName}
      />
    </>
  );
}
