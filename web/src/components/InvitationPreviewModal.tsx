'use client';

import { useId, useRef } from 'react';
import { motion } from 'framer-motion';
import InvitationClient from '@/app/invitation/[id]/InvitationClient';
import Dialog from '@/components/Dialog';

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
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open={Boolean(invitationId)}
      onClose={onClose}
      labelledBy={titleId}
      initialFocusRef={closeButtonRef}
      backdropClassName="z-[105] bg-black/70 p-4 sm:p-6 lg:p-8"
      panelClassName="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-[#F3F1F0] shadow-2xl"
      renderBackdrop={(props, panel) => (
        <motion.div
          className={props.className}
          onMouseDown={props.onMouseDown}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {panel}
        </motion.div>
      )}
      renderPanel={(props) => (
        <motion.div
          ref={props.ref}
          role={props.role}
          aria-modal={props['aria-modal']}
          aria-labelledby={props['aria-labelledby']}
          aria-describedby={props['aria-describedby']}
          aria-label={props['aria-label']}
          tabIndex={props.tabIndex}
          className={props.className}
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {props.children}
        </motion.div>
      )}
    >
      {() => (
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-outline-variant/15 bg-white px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Organizer Preview</p>
              <h2 id={titleId} className="truncate font-headline text-xl text-on-lp-background">
                {invitationName || 'Invitation Preview'}
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              aria-label="Close invitation preview"
            >
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden bg-lp-background">
            {invitationId && <InvitationClient id={invitationId} embedded />}
          </div>
        </div>
      )}
    </Dialog>
  );
}
