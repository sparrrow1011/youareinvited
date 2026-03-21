'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e]">
      <div className="bg-[#16213e] p-8 rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Sign In</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#a8dadc] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-[#0f3460] text-white border border-[#0f3460] focus:outline-none focus:border-[#e94560]"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-[#a8dadc] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-[#0f3460] text-white border border-[#0f3460] focus:outline-none focus:border-[#e94560]"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-[#e94560] text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#e94560] text-white rounded font-semibold hover:bg-opacity-90 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-sm text-[#a8dadc] mt-4">
          No account?{' '}
          <a href="/signup" className="text-[#e94560] hover:underline">Create one</a>
        </p>
      </div>
    </div>
  );
}
