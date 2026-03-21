'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/api';

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e]">
      <div className="bg-[#16213e] p-8 rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Create Account</h1>
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
              placeholder="Min. 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm text-[#a8dadc] mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-[#a8dadc] mt-4">
          Already have an account?{' '}
          <a href="/login" className="text-[#e94560] hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
