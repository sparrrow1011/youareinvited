'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { eventService, invitationService, api, Event, Invitation, InvitationStats } from '@/lib/api';
import ZoneEditor, { Zones } from '@/components/ZoneEditor';

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', seat_number: '', tag: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSuccess, setTemplateSuccess] = useState('');

  const loadData = async () => {
    try {
      const [ev, invs] = await Promise.all([
        eventService.getById(id),
        invitationService.getAll(),
      ]);
      setEvent(ev);
      // Filter invitations to this event only
      const eventInvs = invs.filter((inv: any) => inv.event === id);
      setInvitations(eventInvs);
      // Compute per-event stats from the filtered list
      const total = eventInvs.length;
      const checkedIn = eventInvs.filter((inv: any) => inv.checked_in).length;
      setStats({
        total_invitations: total,
        checked_in: checkedIn,
        pending: total - checkedIn,
        check_in_rate: total > 0 ? (checkedIn / total) * 100 : 0,
      });
    } catch {
      setError('Failed to load event.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await invitationService.update(editingId, formData);
      } else {
        await invitationService.create({ ...formData, event: id } as any);
      }
      setShowForm(false);
      setFormData({ name: '', seat_number: '', tag: '' });
      setEditingId(null);
      await loadData();
    } catch {
      setError('Failed to save invitation.');
    }
  };

  const handleDelete = async (invId: string) => {
    if (!confirm('Delete this invitation?')) return;
    await invitationService.delete(invId);
    await loadData();
  };

  const handleUndoCheckIn = async (invId: string) => {
    await invitationService.undoCheckIn(invId);
    await loadData();
  };

  const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTemplateFile(file);
    setTemplatePreviewUrl(URL.createObjectURL(file));
    setShowZoneEditor(true);
  };

  const handleZoneSave = async (zones: Zones) => {
    if (!templateFile) return;
    setSavingTemplate(true);
    setTemplateSuccess('');
    try {
      const formData = new FormData();
      formData.append('background_image', templateFile);
      formData.append('qr_zone', JSON.stringify(zones.qr_zone));
      formData.append('name_zone', JSON.stringify(zones.name_zone));
      formData.append('tag_zone', JSON.stringify(zones.tag_zone));

      await api.patch(`/events/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTemplateSuccess('Template saved! New e-invites will use your design.');
      setShowZoneEditor(false);
      await loadData();
    } catch {
      setError('Failed to save template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#1a1a2e] text-white p-8">Loading…</div>;
  if (error) return <div className="min-h-screen bg-[#1a1a2e] text-[#e94560] p-8">{error}</div>;

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.push('/dashboard')} className="text-[#a8dadc] mb-4 hover:underline text-sm">
          ← Dashboard
        </button>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold">{event?.name}</h1>
            <p className="text-[#a8dadc] text-sm mt-1">{event?.date}</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', seat_number: '', tag: '' }); }}
            className="px-4 py-2 bg-[#e94560] rounded font-semibold hover:bg-opacity-90"
          >
            + Add Guest
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total', value: stats.total_invitations },
              { label: 'Checked In', value: stats.checked_in },
              { label: 'Pending', value: stats.pending },
              { label: 'Rate', value: `${stats.check_in_rate.toFixed(0)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#16213e] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#e94560]">{value}</div>
                <div className="text-[#a8dadc] text-sm">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit form modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-[#16213e] p-6 rounded-lg w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Guest' : 'Add Guest'}</h2>
              <form onSubmit={handleSave} className="space-y-3">
                {[
                  { label: 'Name', key: 'name', placeholder: 'John Doe' },
                  { label: 'Seat Number', key: 'seat_number', placeholder: 'A1' },
                  { label: 'Tag', key: 'tag', placeholder: 'VIP, Family, Friend…' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm text-[#a8dadc] mb-1">{label}</label>
                    <input
                      value={(formData as any)[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      required
                      placeholder={placeholder}
                      className="w-full px-3 py-2 rounded bg-[#0f3460] text-white border border-[#0f3460] focus:outline-none"
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 py-2 bg-[#e94560] rounded font-semibold">
                    Save
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 bg-[#0f3460] rounded">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Template section */}
        <div className="bg-[#16213e] rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Invite Template</h2>
          {event?.background_image ? (
            <div className="flex items-center gap-4">
              <img
                src={event.background_image}
                alt="Template preview"
                className="w-24 h-32 object-cover rounded border border-[#0f3460]"
              />
              <div>
                <p className="text-[#a8dadc] text-sm mb-2">Custom template active</p>
                <label className="cursor-pointer px-3 py-1 bg-[#0f3460] rounded text-sm hover:bg-opacity-80">
                  Replace Template
                  <input type="file" accept="image/*" onChange={handleTemplateFileChange} className="hidden" />
                </label>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[#a8dadc] text-sm mb-3">
                Upload your own invite design. We&apos;ll help you mark where the guest name, tag, and QR code go.
              </p>
              <label className="cursor-pointer px-4 py-2 bg-[#0f3460] rounded text-sm hover:bg-opacity-80">
                Upload Invite Graphic
                <input type="file" accept="image/*" onChange={handleTemplateFileChange} className="hidden" />
              </label>
            </div>
          )}
          {templateSuccess && <p className="text-green-400 text-sm mt-3">{templateSuccess}</p>}
        </div>

        {/* Zone editor modal */}
        {showZoneEditor && templatePreviewUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-start justify-center z-50 overflow-y-auto p-8">
            <div className="bg-[#16213e] p-6 rounded-lg w-full max-w-4xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Mark Template Zones</h2>
                <button onClick={() => setShowZoneEditor(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <ZoneEditor
                imageUrl={templatePreviewUrl}
                initialZones={{
                  qr_zone: event?.qr_zone as any,
                  name_zone: event?.name_zone as any,
                  tag_zone: event?.tag_zone as any,
                }}
                onSave={handleZoneSave}
              />
              {savingTemplate && <p className="text-[#a8dadc] text-sm mt-3">Saving…</p>}
            </div>
          </div>
        )}

        {/* Invitations table */}
        <div className="bg-[#16213e] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#0f3460]">
                {['Name', 'Seat', 'Tag', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left p-4 text-[#a8dadc]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b border-[#0f3460] hover:bg-[#0f3460] transition-colors">
                  <td className="p-4">{inv.name}</td>
                  <td className="p-4">{inv.seat_number}</td>
                  <td className="p-4">{inv.tag}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      inv.checked_in ? 'bg-green-800 text-green-200' : 'bg-yellow-800 text-yellow-200'
                    }`}>
                      {inv.checked_in ? 'Checked In' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => router.push(`/invitation/${inv.id}`)}
                      className="px-2 py-1 bg-[#0f3460] rounded text-xs hover:bg-opacity-80"
                    >
                      View
                    </button>
                    <button
                      onClick={() => { setEditingId(inv.id); setFormData({ name: inv.name, seat_number: inv.seat_number, tag: inv.tag }); setShowForm(true); }}
                      className="px-2 py-1 bg-[#0f3460] rounded text-xs hover:bg-opacity-80"
                    >
                      Edit
                    </button>
                    {inv.checked_in && (
                      <button
                        onClick={() => handleUndoCheckIn(inv.id)}
                        className="px-2 py-1 bg-yellow-900 rounded text-xs hover:bg-opacity-80"
                      >
                        Undo
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="px-2 py-1 bg-red-900 rounded text-xs hover:bg-opacity-80"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#a8dadc]">
                    No guests yet. Click &quot;+ Add Guest&quot; to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
