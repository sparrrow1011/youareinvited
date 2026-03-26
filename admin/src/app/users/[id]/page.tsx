'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ConfirmModal from '@/components/ConfirmModal';
import { usersApi, AdminUser, UserEvent } from '@/lib/api';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editPlan, setEditPlan] = useState<'free' | 'pro'>('free');
  const [editWatermark, setEditWatermark] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const userId = parseInt(id, 10);
    Promise.all([
      usersApi.getAll().then((users) => users.find((u) => u.id === userId) ?? null),
      usersApi.getEvents(userId),
    ])
      .then(([u, ev]) => {
        if (u) {
          setUser(u);
          setEditPlan(u.plan);
          setEditWatermark(u.watermark_override);
        }
        setEvents(ev);
      })
      .catch(() => setError('Could not load this user. Check the admin backend URL and staff authentication.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await usersApi.update(user.id, { plan: editPlan, watermark_override: editWatermark });
    setUser((prev) => (prev ? { ...prev, plan: editPlan, watermark_override: editWatermark } : prev));
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!user || confirmEmail !== user.email) return;
    await usersApi.delete(user.id);
    router.push('/users');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex bg-primary">
        <Sidebar />
        <p className="ml-64 p-8 text-light">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex bg-primary">
        <Sidebar />
        <p className="ml-64 p-8 text-accent">User not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-primary">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 max-w-4xl">

        <div className="mb-6">
          <p className="text-white text-xl font-bold">{user.email}</p>
          <p className="text-light text-sm mt-1">
            Joined {new Date(user.created_at).toLocaleDateString()}
          </p>
          <span
            className={`inline-block mt-2 px-3 py-1 rounded text-xs font-bold ${
              user.plan === 'pro' ? 'bg-accent text-white' : 'text-light'
            }`}
            style={user.plan === 'free' ? { background: '#0f3460' } : {}}
          >
            {user.plan.toUpperCase()}
          </span>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Edit section */}
        <div className="bg-secondary rounded-xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Edit Account</h2>

          <div className="flex gap-4 items-center mb-4">
            <label className="text-light text-sm w-36">Plan</label>
            <select
              value={editPlan}
              onChange={(e) => setEditPlan(e.target.value as 'free' | 'pro')}
              className="bg-primary border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
              style={{ borderColor: '#0f3460' }}
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>

          <div className="flex gap-4 items-center mb-6">
            <label className="text-light text-sm w-36">Watermark off</label>
            <button
              onClick={() => setEditWatermark(!editWatermark)}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                editWatermark ? 'bg-accent' : ''
              }`}
              style={!editWatermark ? { background: '#0f3460' } : {}}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  editWatermark ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-accent text-white font-bold px-6 py-2 rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Events table */}
        <div className="bg-secondary rounded-xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Events ({events.length})</h2>
          {events.length === 0 ? (
            <p className="text-light text-sm">No events yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: '#0f3460' }}>
                  {['Name', 'Date', 'Invitations', 'Template'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-light font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className="border-b" style={{ borderColor: '#0f3460' }}>
                    <td className="px-3 py-2 text-white">{ev.name}</td>
                    <td className="px-3 py-2 text-light">{ev.date}</td>
                    <td className="px-3 py-2 text-light">{ev.invitation_count}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs ${ev.has_template ? 'text-green-400' : 'text-light'}`}>
                        {ev.has_template ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Danger zone */}
        <div
          className="bg-secondary rounded-xl p-6"
          style={{ borderWidth: 1, borderStyle: 'solid', borderColor: '#7f1d1d' }}
        >
          <h2 className="text-accent font-semibold mb-2">Danger Zone</h2>
          <p className="text-light text-sm mb-4">
            Type <span className="text-white font-mono">{user.email}</span> to enable deletion.
            This permanently removes the account and all associated events and invitations.
          </p>
          <input
            type="text"
            placeholder={user.email}
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            className="mb-3 w-full bg-primary border text-white rounded-lg px-4 py-2 focus:outline-none transition-colors"
            style={{ borderColor: '#7f1d1d' }}
          />
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={confirmEmail !== user.email}
            className="bg-red-700 text-white font-bold px-6 py-2 rounded-lg hover:bg-red-600 disabled:opacity-40 transition-all"
          >
            Delete Account
          </button>
        </div>
      </main>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Final Confirmation"
        message={`Permanently delete ${user.email} and all their events and invitations?`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
