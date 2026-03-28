'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import InvitationClient from '@/app/invitation/[id]/InvitationClient';

type InvitationPreviewModalProps = {
  invitationId: string | null;
  invitationName?: string;
  onClose: () => void;
};

export default function InvitationPreviewModal({
  invitationId,
  invitationName,
  onClose,
}: InvitationPreviewModalProps) {
  useEffect(() => {
    if (!invitationId) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [invitationId, onClose]);

  if (!invitationId || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="invitation-preview-modal"
        className="fixed inset-0 z-[105] bg-black/70 p-4 sm:p-6 lg:p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-[#F3F1F0] shadow-2xl"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 border-b border-outline-variant/15 bg-white px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Organizer Preview</p>
              <h2 className="truncate font-headline text-xl text-on-lp-background">
                {invitationName || 'Invitation Preview'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              aria-label="Close invitation preview"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden bg-lp-background">
            <InvitationClient id={invitationId} embedded />
          </div>
        </motion.div>
      </motion.div>,
    </AnimatePresence>,
    document.body,
  );
}
