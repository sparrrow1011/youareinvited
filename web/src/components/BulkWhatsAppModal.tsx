'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Invitation } from '@/lib/api';
import Dialog from '@/components/Dialog';

export interface BulkWhatsAppModalProps {
  isOpen: boolean;
  selectedInvitations: Invitation[];
  onConfirm: () => Promise<{ invitation_count: number; link_preview: string }>;
  onCancel: () => void;
}

export default function BulkWhatsAppModal({
  isOpen,
  selectedInvitations,
  onConfirm,
  onCancel,
}: BulkWhatsAppModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ invitation_count: number; link_preview: string } | null>(null);
  const [error, setError] = useState('');
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const doneButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) return;
    setLoading(false);
    setResult(null);
    setError('');
  }, [isOpen]);

  useEffect(() => {
    if (result) doneButtonRef.current?.focus();
  }, [result]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await onConfirm();
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send WhatsApp links');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setResult(null);
    setError('');
    onCancel();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      initialFocusRef={cancelButtonRef}
      busy={loading}
      backdropClassName="z-50 flex items-center justify-center bg-black/50"
      panelClassName="mx-4 w-full max-w-sm rounded-lg bg-white shadow-xl"
    >
      {(modalProps) => (
        <div className="p-6" aria-describedby={modalProps.describedBy || undefined}>
        {result ? (
          <>
            <h2 id={titleId} className="mb-2 text-xl font-bold text-green-600">✓ WhatsApp Links Sent</h2>
            <p id={descriptionId} className="mb-4 text-gray-700" role="status" aria-live="polite">
              Successfully sent WhatsApp links to <strong>{result.invitation_count}</strong> guest{result.invitation_count !== 1 ? 's' : ''}.
            </p>
            <p className="mb-6 text-sm text-gray-600">
              Guests will receive personalized WhatsApp messages with their invitation links.
            </p>
            <button
              ref={doneButtonRef}
              type="button"
              onClick={handleClose}
              className="w-full rounded-lg bg-blue-600 py-2 text-white transition hover:bg-blue-700"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <h2 id={titleId} className="mb-4 text-xl font-bold text-gray-900">Send WhatsApp Invitations</h2>

            <div className="mb-4">
              <p id={descriptionId} className="mb-3 text-sm text-gray-700">
                You&apos;re about to send WhatsApp links to <strong>{selectedInvitations.length}</strong> guest{selectedInvitations.length !== 1 ? 's' : ''}:
              </p>
              <div className="max-h-40 overflow-y-auto overscroll-contain rounded-lg bg-gray-50 p-3">
                <ul className="space-y-1">
                 {selectedInvitations.slice(0, 5).map((inv) => (
                    <li key={inv.id} className="text-sm text-gray-700">
                      {inv.name} <span className="text-gray-500">({inv.seat_number})</span>
                    </li>
                  ))}
                  {selectedInvitations.length > 5 && (
                    <li className="text-sm italic text-gray-500">
                      +{selectedInvitations.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {error && (
              <div
                className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                aria-describedby={loading ? `${descriptionId}-progress` : undefined}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  'Send Now'
                )}
              </button>
            </div>
            <p id={`${descriptionId}-progress`} className="sr-only" role="status" aria-live="polite">
              {loading ? 'Sending WhatsApp invitation links.' : ''}
            </p>
          </>
        )}
        </div>
      )}
    </Dialog>
  );
}
