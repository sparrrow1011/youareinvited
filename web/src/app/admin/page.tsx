'use client';

import { useState, useEffect } from 'react';
import { invitationService, Invitation, InvitationStats } from '@/lib/api';
import { FiPlus, FiEdit2, FiTrash2, FiCheckCircle, FiXCircle, FiDownload } from 'react-icons/fi';
import Link from 'next/link';

export default function AdminDashboard() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    seat_number: '',
    tag: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invitationsData, statsData] = await Promise.all([
        invitationService.getAll(),
        invitationService.getStats(),
      ]);
      setInvitations(invitationsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await invitationService.update(editingId, formData);
      } else {
        await invitationService.create(formData);
      }
      setShowModal(false);
      setFormData({ name: '', seat_number: '', tag: '' });
      setEditingId(null);
      loadData();
    } catch (error) {
      console.error('Error saving invitation:', error);
      alert('Failed to save invitation');
    }
  };

  const handleEdit = (invitation: Invitation) => {
    setFormData({
      name: invitation.name,
      seat_number: invitation.seat_number,
      tag: invitation.tag,
    });
    setEditingId(invitation.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invitation?')) return;
    try {
      await invitationService.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting invitation:', error);
      alert('Failed to delete invitation');
    }
  };

  const handleUndoCheckIn = async (id: string) => {
    if (!confirm('Undo check-in for this guest?')) return;
    try {
      await invitationService.undoCheckIn(id);
      loadData();
    } catch (error) {
      console.error('Error undoing check-in:', error);
      alert('Failed to undo check-in');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Invitation Management</h1>
          <p className="text-gray-600">Create and manage event invitations</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/security" className="btn-primary">
              Switch to Security
            </Link>
            <a href="/logout" className="btn-secondary">
              Logout
            </a>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <h3 className="text-sm font-medium opacity-90">Total Invitations</h3>
              <p className="text-3xl font-bold mt-2">{stats.total_invitations}</p>
            </div>
            <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
              <h3 className="text-sm font-medium opacity-90">Checked In</h3>
              <p className="text-3xl font-bold mt-2">{stats.checked_in}</p>
            </div>
            <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <h3 className="text-sm font-medium opacity-90">Pending</h3>
              <p className="text-3xl font-bold mt-2">{stats.pending}</p>
            </div>
            <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <h3 className="text-sm font-medium opacity-90">Check-in Rate</h3>
              <p className="text-3xl font-bold mt-2">{stats.check_in_rate.toFixed(1)}%</p>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">All Invitations</h2>
          <button
            onClick={() => {
              setFormData({ name: '', seat_number: '', tag: '' });
              setEditingId(null);
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlus /> Create Invitation
          </button>
        </div>

        {/* Invitations Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guest Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tag
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{invitation.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{invitation.seat_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {invitation.tag}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invitation.checked_in ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <FiCheckCircle /> Checked In
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-500">
                          <FiXCircle /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <a
                          href={`/invitation/${invitation.id}`}
                          target="_blank"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </a>
                        <button
                          onClick={() => handleEdit(invitation)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <FiEdit2 />
                        </button>
                        {invitation.checked_in && (
                          <button
                            onClick={() => handleUndoCheckIn(invitation.id)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            Undo
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(invitation.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold mb-4">
              {editingId ? 'Edit Invitation' : 'Create Invitation'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="label">Guest Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="label">Seat Number</label>
                <input
                  type="text"
                  value={formData.seat_number}
                  onChange={(e) => setFormData({ ...formData, seat_number: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="label">Tag/Category</label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  className="input-field"
                  placeholder="e.g., VIP, Family, Friend"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1">
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setFormData({ name: '', seat_number: '', tag: '' });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
