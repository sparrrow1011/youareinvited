'use client';

import { useState } from 'react';
import { authService } from '@/lib/api';

type ResendState = 'idle' | 'loading' | 'sent' | 'cooldown' | 'error';

export default function VerificationBanner() {
  const [resendState, setResendState] = useState<ResendState>('idle');

  const handleResend = async () => {
    setResendState('loading');
    try {
      await authService.resendVerification();
      setResendState('sent');
      setTimeout(() => setResendState('idle'), 5000);
    } catch (err: any) {
      if (err?.response?.status === 429) {
        setResendState('cooldown');
        setTimeout(() => setResendState('idle'), 60000);
      } else {
        setResendState('error');
        setTimeout(() => setResendState('idle'), 5000);
      }
    }
  };

  const resendLabel = {
    idle: 'Resend email',
    loading: 'Sending…',
    sent: 'Sent!',
    cooldown: 'Wait 60s',
    error: 'Failed — retry',
  }[resendState];

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-800">
          <span className="material-symbols-outlined text-amber-500 text-base shrink-0">
            mark_email_unread
          </span>
          <p className="text-sm font-medium">
            Please verify your email address. Check your inbox for a verification link.
          </p>
        </div>
        <button
          onClick={handleResend}
          disabled={resendState === 'loading' || resendState === 'cooldown'}
          className="text-xs font-semibold text-amber-700 border border-amber-300 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-full transition-colors shrink-0"
        >
          {resendLabel}
        </button>
      </div>
    </div>
  );
}
