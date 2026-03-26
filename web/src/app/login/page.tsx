'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/api';

const DEFAULT_NEXT_PATH = '/dashboard';
const ALLOWED_NEXT_PATTERNS = [
  /^\/dashboard(?:\/|$|\?)/,
  /^\/events(?:\/|$|\?)/,
];

const resolveNextPath = (next: string | null): string => {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return DEFAULT_NEXT_PATH;
  }
  return ALLOWED_NEXT_PATTERNS.some((pattern) => pattern.test(next))
    ? next
    : DEFAULT_NEXT_PATH;
};

const Aurora = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-container/40 blur-[120px]" />
    <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-tertiary-container/30 blur-[100px]" />
    <div className="absolute -bottom-32 left-1/3 w-[480px] h-[480px] rounded-full bg-secondary-container/35 blur-[110px]" />
  </div>
);

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = resolveNextPath(searchParams.get('next'));
  const reason = searchParams.get('reason');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(
    reason === 'session-expired' ? 'Your session expired. Sign in again.' : ''
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.login(email, password);
      router.push(next);
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="w-full max-w-sm">
        {/* Wordmark */}
      <div className="text-center mb-6 sm:mb-8">
        <span className="font-headline italic text-brand text-2xl tracking-tight select-none">
          youareinvited
        </span>
      </div>

      {/* Card */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-6 sm:p-8">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-brand-container/40 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-brand text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
        </div>

        <div className="text-center mb-6">
          <h1 className="font-headline text-2xl text-on-lp-background">Welcome back</h1>
          <p className="text-on-surface-variant text-sm mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full h-11 rounded-2xl bg-surface-container border border-outline-variant/30 px-4 text-sm text-on-lp-background placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full h-11 rounded-2xl bg-surface-container border border-outline-variant/30 px-4 text-sm text-on-lp-background placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <span className="material-symbols-outlined text-red-400 text-base mt-0.5 shrink-0">warning</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-brand text-white font-semibold text-sm hover:bg-brand/90 active:bg-brand/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>login</span>
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-on-surface-variant mt-6">
          No account?{' '}
          <a href="/signup" className="text-brand font-semibold hover:underline">Create one</a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-lp-background flex items-center justify-center px-4 sm:px-6 py-8 sm:py-10">
      <Aurora />
      <Suspense fallback={
        <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
