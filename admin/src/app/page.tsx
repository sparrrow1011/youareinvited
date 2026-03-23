'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const ThreeHero = dynamic(() => import('@/components/ThreeHero'), { ssr: false });

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError('Invalid password.');
      }
    } catch {
      setError('Connection error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <ThreeHero />
      </div>

      <div className="relative z-10 bg-secondary rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <p className="text-accent font-bold tracking-widest text-xs uppercase mb-1">
          YouAreInvited
        </p>
        <h1 className="text-2xl font-bold text-white mb-6">Platform Admin</h1>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-light text-sm mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-primary border text-white rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition-colors"
              style={{ borderColor: '#0f3460' }}
              required
              autoFocus
            />
          </div>

          {error && <p className="text-accent text-sm mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white font-bold py-3 rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
