'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService, api } from '@/lib/api';
import { setToken } from '@/lib/auth';

type State = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>('loading');
  const [resendState, setResendState] = useState<'idle' | 'sent' | 'error'>('idle');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('error');
      return;
    }

    api.get(`/auth/verify-email/?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setToken(res.data.access);
        setState('success');
        setTimeout(() => router.push('/dashboard'), 1500);
      })
      .catch(() => setState('error'));
  }, [searchParams, router]);

  const handleResend = async () => {
    try {
      await authService.resendVerification();
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  };

  if (state === 'loading') {
    return (
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-on-surface-variant text-sm">Verifying your email…</p>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-container/40 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-brand text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <h1 className="font-headline text-2xl text-on-lp-background mb-2">Email verified!</h1>
        <p className="text-on-surface-variant text-sm">Redirecting you to the dashboard…</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
        <span className="material-symbols-outlined text-red-500 text-3xl">link_off</span>
      </div>
      <h1 className="font-headline text-2xl text-on-lp-background mb-2">Link expired or invalid</h1>
      <p className="text-on-surface-variant text-sm mb-6">
        This verification link has expired or is invalid.
      </p>
      {resendState === 'idle' && (
        <button
          onClick={handleResend}
          className="px-6 py-3 bg-brand text-white rounded-full font-semibold text-sm hover:bg-brand/90 transition-colors"
        >
          Send a new verification email
        </button>
      )}
      {resendState === 'sent' && (
        <p className="text-brand text-sm font-medium">Check your inbox for a new link.</p>
      )}
      {resendState === 'error' && (
        <p className="text-red-600 text-sm">Could not send email. Please sign in and try again.</p>
      )}
      <p className="text-on-surface-variant text-sm mt-4">
        <a href="/login" className="text-brand font-semibold hover:underline">Back to sign in</a>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-lp-background flex items-center justify-center px-4 sm:px-6 py-8 sm:py-10">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-container/40 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-tertiary-container/30 blur-[100px]" />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-headline italic text-brand text-2xl tracking-tight select-none">
            youareinvited
          </span>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-8">
          <Suspense fallback={
            <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin mx-auto" />
          }>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
