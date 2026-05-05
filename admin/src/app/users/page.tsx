'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import ConfirmModal from '@/components/ConfirmModal';
import { usersApi, AdminUser } from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    usersApi.getAll()
      .then(setUsers)
      .catch(() => setError('Could not load users. Please sign in again or contact support if this keeps happening.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handlePlanToggle = async (user: AdminUser) => {
    const newPlan = user.plan === 'free' ? 'pro' : 'free';
    await usersApi.update(user.id, { plan: newPlan });
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, plan: newPlan } : u)));
  };

  const handleWatermarkToggle = async (user: AdminUser) => {
    const newVal = !user.watermark_override;
    await usersApi.update(user.id, { watermark_override: newVal });
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, watermark_override: newVal } : u)),
    );
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await usersApi.delete(deleteTarget.id);
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen flex bg-primary">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Users</h1>

        <input
          type="text"
          placeholder="Search by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 bg-secondary border text-white rounded-lg px-4 py-2 w-full max-w-sm focus:outline-none focus:border-accent transition-colors"
          style={{ borderColor: '#0f3460' }}
        />

        {loading ? (
          <p className="text-light">Loading…</p>
        ) : (
          <div className="bg-secondary rounded-xl overflow-hidden">
            {error && (
              <div className="border-b px-4 py-3 text-sm text-red-200" style={{ borderColor: '#0f3460', background: 'rgba(239, 68, 68, 0.08)' }}>
                {error}
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: '#0f3460' }}>
                  {['Email', 'Plan', 'Watermark off', 'Events', 'Invitations', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-light font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b hover:bg-primary transition-colors"
                    style={{ borderColor: '#0f3460' }}
                  >
                    <td className="px-4 py-3 text-white">{user.email}</td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => handlePlanToggle(user)}
                        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                          user.plan === 'pro' ? 'bg-accent text-white' : 'text-light'
                        }`}
                        style={user.plan === 'free' ? { background: '#0f3460' } : {}}
                      >
                        {user.plan.toUpperCase()}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleWatermarkToggle(user)}
                        className={`relative w-10 h-6 rounded-full transition-colors ${
                          user.watermark_override ? 'bg-accent' : ''
                        }`}
                        style={!user.watermark_override ? { background: '#0f3460' } : {}}
                        aria-label="Toggle watermark override"
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            user.watermark_override ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>

                    <td className="px-4 py-3 text-light">{user.event_count}</td>
                    <td className="px-4 py-3 text-light">{user.invitation_count}</td>
                    <td className="px-4 py-3 text-light">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`/users/${user.id}`}
                          className="text-accent hover:underline text-xs"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="text-red-400 hover:underline text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-light">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Account"
        message={`Delete ${deleteTarget?.email} and all their data? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
