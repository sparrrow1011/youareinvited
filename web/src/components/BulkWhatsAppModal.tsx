'use client';

import { useState } from 'react';
import { Invitation } from '@/lib/api';

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
    setResult(null);
    setError('');
    onCancel();
  };

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
          <div className="p-6">
            <h2 className="text-xl font-bold text-green-600 mb-2">✓ WhatsApp Links Sent</h2>
            <p className="text-gray-700 mb-4">
              Successfully sent WhatsApp links to <strong>{result.invitation_count}</strong> guest{result.invitation_count !== 1 ? 's' : ''}.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Guests will receive personalized WhatsApp messages with their invitation links.
            </p>
            <button
              onClick={handleClose}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Send WhatsApp Invitations</h2>

          <div className="mb-4">
            <p className="text-gray-700 text-sm mb-3">
              You're about to send WhatsApp links to <strong>{selectedInvitations.length}</strong> guest{selectedInvitations.length !== 1 ? 's' : ''}:
            </p>
            <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
              <ul className="space-y-1">
                {selectedInvitations.slice(0, 5).map((inv) => (
                  <li key={inv.id} className="text-sm text-gray-700">
                    {inv.name} <span className="text-gray-500">({inv.seat_number})</span>
                  </li>
                ))}
                {selectedInvitations.length > 5 && (
                  <li className="text-sm text-gray-500 italic">
                    +{selectedInvitations.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Now'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
