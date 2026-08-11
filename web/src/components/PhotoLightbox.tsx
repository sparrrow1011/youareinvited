'use client';

import { useCallback, useEffect, useRef } from 'react';
import { resolveMediaUrl } from '@/lib/api';
import type { EventPhoto } from '@/lib/api';
import Dialog from '@/components/Dialog';

interface PhotoLightboxProps {
  photos: EventPhoto[];
  /** Index of the photo to display, or null when closed. */
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  showUploaderName?: boolean;
}

/**
 * Accessible full-screen photo viewer. Built on the shared Dialog shell so
 * it inherits portal rendering, focus trap, focusable-node caching, Escape
 * handling, and context-scoped body scroll lock.
 */
export default function PhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate,
  showUploaderName,
}: PhotoLightboxProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const open = index !== null && photos.length > 0;

  const navigate = useCallback((direction: -1 | 1) => {
    if (index === null || photos.length === 0) return;
    onNavigate((index + direction + photos.length) % photos.length);
  }, [index, photos.length, onNavigate]);

  // Arrow navigation is separate from Dialog's Escape/Tab handling.
  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigate(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigate(1);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, navigate]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      ariaLabel="Photo viewer"
      initialFocusRef={closeButtonRef}
      backdropClassName="bg-black/90 z-50"
      renderPanel={(props) => (
        <div
          ref={props.ref}
          role={props.role}
          aria-modal={props['aria-modal']}
          aria-label={props['aria-label']}
          tabIndex={props.tabIndex}
          className="relative flex h-full w-full items-center justify-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          {props.children}
        </div>
      )}
    >
      {() => {
        if (index === null) return null;
        const photo = photos[index];

        return (
          <>
            {/* Close */}
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close photo viewer"
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white
                         flex items-center justify-center hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              onClick={onClose}
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
            </button>

            {/* Prev */}
            {photos.length > 1 && (
              <button
                type="button"
                aria-label="Previous photo"
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white
                           flex items-center justify-center hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                onClick={() => navigate(-1)}
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">chevron_left</span>
              </button>
            )}

            {/* Image */}
            <div className="max-w-[90vw] max-h-[90vh] flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveMediaUrl(photo.image_url)}
                alt={`Event photo ${index + 1}`}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
              <div className="flex items-center justify-center gap-3 mt-2">
                {showUploaderName && photo.uploaded_by_name && (
                  <p className="text-white/70 text-xs">
                    <span className="text-white/40 mr-1">by</span>
                    {photo.uploaded_by_name}
                  </p>
                )}
                <p className="text-white/40 text-xs">
                  {index + 1} / {photos.length}
                </p>
              </div>
            </div>

            {/* Next */}
            {photos.length > 1 && (
              <button
                type="button"
                aria-label="Next photo"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white
                           flex items-center justify-center hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                onClick={() => navigate(1)}
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">chevron_right</span>
              </button>
            )}
          </>
        );
      }}
    </Dialog>
  );
}
