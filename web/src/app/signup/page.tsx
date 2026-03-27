'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { authService } from '@/lib/api';

const Aurora = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-container/40 blur-[120px]" />
    <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-tertiary-container/30 blur-[100px]" />
    <div className="absolute -bottom-32 left-1/3 w-[480px] h-[480px] rounded-full bg-secondary-container/35 blur-[110px]" />
  </div>
);

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await authService.register(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError('Google sign-up failed. Please try again.');
      return;
    }
    try {
      await authService.google(credentialResponse.credential);
      router.push('/dashboard');
    } catch {
      setError('Google sign-up failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-lp-background flex items-center justify-center px-4 sm:px-6 py-8 sm:py-10">
      <Aurora />

      <div className="w-full max-w-sm">
        <div className="text-center mb-6 sm:mb-8">
          <span className="font-headline italic text-brand text-2xl tracking-tight select-none">
            youareinvited
          </span>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-6 sm:p-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-container/40 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-brand text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
          </div>

          <div className="text-center mb-6">
            <h1 className="font-headline text-2xl text-on-lp-background">Create account</h1>
            <p className="text-on-surface-variant text-sm mt-1">Start managing your events</p>
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
                placeholder="Min. 8 characters"
                className="w-full h-11 rounded-2xl bg-surface-container border border-outline-variant/30 px-4 text-sm text-on-lp-background placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-outline-variant/20" />
            <span className="text-xs text-on-surface-variant/60 font-medium">or</span>
            <div className="flex-1 h-px bg-outline-variant/20" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-up failed. Please try again.')}
              shape="pill"
              theme="outline"
              size="large"
              text="signup_with"
            />
          </div>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-brand font-semibold hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
