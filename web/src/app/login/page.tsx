'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiLock, FiShield, FiUsers } from 'react-icons/fi';

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setError('Wrong password');
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setError('Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white px-4 py-12">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-center">
        <section>
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm mb-5">
            <FiLock />
            Protected System
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
            Welcome to the Invitation Console
          </h1>
          <p className="text-blue-100 mb-8">
            Sign in to access Admin tools, Security check-in, and guest invitation records.
          </p>

          <div className="grid gap-4">
            <div className="bg-white/10 rounded-xl p-4 flex items-center gap-3">
              <FiUsers className="text-2xl" />
              <span>Manage invitations and RSVP data</span>
            </div>
            <div className="bg-white/10 rounded-xl p-4 flex items-center gap-3">
              <FiShield className="text-2xl" />
              <span>Run live security check-in at the entrance</span>
            </div>
          </div>
        </section>

        <section className="bg-white text-gray-900 rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold mb-2">Login</h2>
          <p className="text-sm text-gray-600 mb-6">Enter your site password to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <div className="mt-5 text-sm">
            <Link href="/logout" className="text-gray-500 underline">
              Clear current session
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
