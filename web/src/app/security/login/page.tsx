'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SecurityLoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-700 to-blue-900" />}>
      <SecurityLoginPageContent />
    </Suspense>
  );
}

function SecurityLoginPageContent() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/security';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/security/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setError('Wrong security password');
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
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-700 to-blue-900">
      <div className="card w-full max-w-md bg-white">
        <h1 className="text-2xl font-bold mb-2">Security Check-In Access</h1>
        <p className="text-sm text-gray-600 mb-6">
          Enter `SECURITY_PASSWORD` to unlock check-in pages.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Security Password</label>
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
            {loading ? 'Checking...' : 'Unlock Check-In'}
          </button>
        </form>
      </div>
    </main>
  );
}
