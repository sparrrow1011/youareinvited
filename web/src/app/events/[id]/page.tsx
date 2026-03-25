'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { eventService, invitationService, api, Event, Invitation, InvitationStats } from '@/lib/api';
import ZoneEditor, { Zones } from '@/components/ZoneEditor';
import { resolveMediaUrl } from '@/lib/api';

const NAV_LINKS = [
  { icon: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { icon: 'group', label: 'Guest List', href: '#', active: true },
  { icon: 'brush', label: 'Design Studio', href: '#' },
  { icon: 'card_giftcard', label: 'Registry', href: '#' },
  { icon: 'leaderboard', label: 'Analytics', href: '#' },
];

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

  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ name: string; seat_number: string; tag: string }[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ created: number; errors: string[] } | null>(null);

  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSuccess, setTemplateSuccess] = useState('');

  const [securityPinSet, setSecurityPinSet] = useState(false);
  const [securityPin, setSecurityPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [pinSaveStatus, setPinSaveStatus] = useState<'idle' | 'saved' | 'cleared' | 'error'>('idle');

  const loadData = async () => {
    try {
      const [ev, invs] = await Promise.all([
        eventService.getById(id),
        invitationService.getAll(),
      ]);
      setEvent(ev);
      setSecurityPinSet(Boolean(ev.has_security_pin));
      const eventInvs = invs.filter((inv) => inv.event === id);
      setInvitations(eventInvs);
      const total = eventInvs.length;
      const checkedIn = eventInvs.filter((inv) => inv.checked_in).length;
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

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const ni = headers.indexOf('name');
      const si = headers.indexOf('seat_number');
      const ti = headers.indexOf('tag');
      if (ni === -1 || si === -1 || ti === -1) return;
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(',');
        return { name: cols[ni]?.trim() ?? '', seat_number: cols[si]?.trim() ?? '', tag: cols[ti]?.trim() ?? '' };
      }).filter((r) => r.name);
      setCsvPreview(rows.slice(0, 5));
    };
    reader.readAsText(file);
    setShowCsvModal(true);
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;
    setCsvImporting(true);
    try {
      const result = await invitationService.bulkImport(id, csvFile);
      setCsvResult(result);
      setCsvFile(null);
      setCsvPreview([]);
      await loadData();
    } catch {
      setError('CSV import failed.');
    } finally {
      setCsvImporting(false);
    }
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
      const fd = new FormData();
      fd.append('background_image', templateFile);
      fd.append('qr_zone', JSON.stringify(zones.qr_zone));
      fd.append('name_zone', JSON.stringify(zones.name_zone));
      fd.append('tag_zone', JSON.stringify(zones.tag_zone));
      await api.patch(`/events/${id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTemplateSuccess('Template saved! New e-invites will use your design.');
      setShowZoneEditor(false);
      await loadData();
    } catch {
      setError('Failed to save template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSavePin = async () => {
    if (!event || securityPin.length < 4) return;
    setSavingPin(true);
    setPinSaveStatus('idle');
    try {
      await eventService.setSecurityPin(event.id, securityPin);
      setSecurityPinSet(true);
      setSecurityPin('');
      setPinSaveStatus('saved');
    } catch {
      setPinSaveStatus('error');
    } finally {
      setSavingPin(false);
    }
  };

  const handleClearPin = async () => {
    if (!event) return;
    setSavingPin(true);
    setPinSaveStatus('idle');
    try {
      await eventService.setSecurityPin(event.id, null);
      setSecurityPinSet(false);
      setPinSaveStatus('cleared');
    } catch {
      setPinSaveStatus('error');
    } finally {
      setSavingPin(false);
    }
  };

  const handleCopyStaffLink = () => {
    const url = `${window.location.origin}/security/event/${event?.id}`;
    navigator.clipboard.writeText(url);
    setPinSaveStatus('idle'); // just reuse for feedback if needed
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData({ name: '', seat_number: '', tag: '' });
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <p className="text-on-surface-variant text-sm">Loading event…</p>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center">
        <p className="text-tertiary">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-lp-background font-body text-on-surface min-h-screen">
      {/* Aurora background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-brand/10 blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-tertiary/10 blur-[150px]" />
      </div>

      {/* ── Sidebar ── */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-low flex flex-col py-8 z-40">
        <div className="px-8 mb-10">
          <Link href="/" className="text-xl font-headline italic text-tertiary">YouAreInvited</Link>
        </div>
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 bg-white/50 p-3 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-warm" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            </div>
            <div>
              <p className="text-sm font-medium tracking-tight text-on-surface">The Curator</p>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Premium Organizer</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV_LINKS.map(({ icon, label, href, active }) => (
            <Link
              key={label}
              href={href}
              className={`py-3 pl-8 flex items-center gap-3 transition-all ${
                active
                  ? 'text-brand font-bold bg-white rounded-r-full'
                  : 'text-on-surface-variant hover:translate-x-1 hover:text-brand'
              }`}
            >
              <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>{icon}</span>
              <span className="text-sm font-medium tracking-tight">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-6 pt-4">
          <button
            onClick={openAddForm}
            className="w-full bg-brand text-white py-3 rounded-full font-medium shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm"
          >
            + Add Guest
          </button>
        </div>
        <div className="mt-6 space-y-1 border-t border-outline-variant/10 pt-4">
          <a href="#" className="text-on-surface-variant py-2 pl-8 hover:translate-x-1 transition-transform flex items-center gap-3 hover:text-brand">
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-medium tracking-tight">Settings</span>
          </a>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full text-left text-on-surface-variant py-2 pl-8 hover:translate-x-1 transition-transform flex items-center gap-3 hover:text-brand"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="text-sm font-medium tracking-tight">Dashboard</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ml-64 min-h-screen relative z-10">
        {/* Top bar */}
        <header className="h-20 px-12 flex items-center justify-between sticky top-0 z-30 bg-lp-background/60 backdrop-blur-md border-b border-outline-variant/10">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="text-on-surface-variant hover:text-brand transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex items-center gap-2 text-on-surface-variant text-sm">
              <Link href="/dashboard" className="hover:text-brand transition-colors">Dashboard</Link>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-on-surface font-medium">{event?.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/guest-import-template.csv"
              download="guest-import-template.csv"
              className="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-full text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors border border-outline-variant/20"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Template
            </a>
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-surface-container rounded-full text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors border border-outline-variant/20">
              <span className="material-symbols-outlined text-sm">upload_file</span>
              Import CSV
              <input type="file" accept=".csv" onChange={handleCsvFileChange} className="hidden" />
            </label>
            <button
              onClick={openAddForm}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-full text-sm font-medium hover:bg-brand-dim transition-colors shadow-md"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Add Guest
            </button>
          </div>
        </header>

        <section className="px-12 py-10 max-w-7xl mx-auto">
          {/* Event header */}
          <div className="mb-10">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-headline text-4xl font-light tracking-tight text-on-surface mb-2">
                  {event?.name}
                </h1>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-on-surface-variant text-sm">
                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                    {event?.date}
                  </span>
                  {event?.description && (
                    <>
                      <span className="text-outline-variant">·</span>
                      <span className="text-on-surface-variant text-sm">{event.description}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats bento */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              {[
                { label: 'Total Guests', value: stats.total_invitations, icon: 'group', color: 'brand' },
                { label: 'Checked In', value: stats.checked_in, icon: 'how_to_reg', color: 'warm' },
                { label: 'Pending', value: stats.pending, icon: 'schedule', color: 'tertiary' },
                { label: 'Check-in Rate', value: `${Math.round(stats.check_in_rate)}%`, icon: 'analytics', color: 'brand' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/40 shadow-sm relative overflow-hidden group">
                  <div className={`absolute -right-4 -top-4 w-20 h-20 bg-${color}/5 rounded-full blur-2xl group-hover:bg-${color}/10 transition-colors`} />
                  <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-4">{label}</p>
                  <div className="flex items-end justify-between">
                    <span className="font-headline text-3xl font-bold">{value}</span>
                    <span className={`material-symbols-outlined text-${color} text-lg`}>{icon}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Main grid: guests + template */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Guest list */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-headline text-2xl font-normal">Guest List</h2>
                <span className="text-xs text-on-surface-variant">{invitations.length} guest{invitations.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="bg-surface-container-lowest rounded-[2rem] overflow-hidden border border-outline-variant/10 shadow-sm">
                {invitations.length === 0 ? (
                  <div className="py-20 text-center">
                    <span className="material-symbols-outlined text-4xl text-outline-variant mb-4 block">group_add</span>
                    <p className="text-on-surface-variant text-sm mb-4">No guests yet.</p>
                    <button
                      onClick={openAddForm}
                      className="px-6 py-2.5 bg-brand text-white rounded-full text-sm font-medium"
                    >
                      Add First Guest
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant/10 bg-surface-container-low">
                        {['Name', 'Seat', 'Tag', 'Status', 'Actions'].map((h) => (
                          <th key={h} className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {invitations.map((inv) => (
                        <tr key={inv.id} className="hover:bg-surface-container-low/50 transition-colors group">
                          <td className="px-6 py-4 font-medium text-on-surface">{inv.name}</td>
                          <td className="px-6 py-4 text-on-surface-variant">{inv.seat_number}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container">
                              {inv.tag}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              inv.checked_in
                                ? 'bg-brand-container/40 text-on-brand-container'
                                : 'bg-surface-container text-on-surface-variant'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${inv.checked_in ? 'bg-brand' : 'bg-outline-variant'}`} />
                              {inv.checked_in ? 'Checked In' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => router.push(`/invitation/${inv.id}`)}
                                className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-brand"
                                title="View invitation"
                              >
                                <span className="material-symbols-outlined text-sm">visibility</span>
                              </button>
                              <button
                                onClick={() => { setEditingId(inv.id); setFormData({ name: inv.name, seat_number: inv.seat_number, tag: inv.tag }); setShowForm(true); }}
                                className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-brand"
                                title="Edit"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span>
                              </button>
                              {inv.checked_in && (
                                <button
                                  onClick={() => handleUndoCheckIn(inv.id)}
                                  className="p-1.5 rounded-lg hover:bg-secondary-container transition-colors text-on-surface-variant hover:text-warm"
                                  title="Undo check-in"
                                >
                                  <span className="material-symbols-outlined text-sm">undo</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(inv.id)}
                                className="p-1.5 rounded-lg hover:bg-tertiary-container/30 transition-colors text-on-surface-variant hover:text-tertiary"
                                title="Delete"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right: Template + info */}
            <div className="space-y-6">
              {/* Invite Template card */}
              <div className="bg-surface-container-lowest rounded-[2rem] p-8 border border-outline-variant/10 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-headline text-xl font-normal">Invite Template</h3>
                  <span className="material-symbols-outlined text-brand">brush</span>
                </div>

                {event?.background_image ? (
                  <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-surface-container">
                      <img
                        src={resolveMediaUrl(event.background_image)}
                        alt="Template preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-on-lp-background/30 to-transparent" />
                    </div>
                    <p className="text-xs text-on-surface-variant text-center">Custom template active</p>
                    <label className="cursor-pointer w-full flex items-center justify-center gap-2 py-2.5 bg-surface-container rounded-full text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors">
                      <span className="material-symbols-outlined text-sm">upload</span>
                      Replace Template
                      <input type="file" accept="image/*" onChange={handleTemplateFileChange} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <div>
                    <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-brand-container/20 to-secondary-container/30 flex flex-col items-center justify-center mb-4 border-2 border-dashed border-outline-variant/40">
                      <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">image</span>
                      <p className="text-xs text-on-surface-variant text-center px-4">
                        Upload your invite design
                      </p>
                    </div>
                    <label className="cursor-pointer w-full flex items-center justify-center gap-2 py-3 bg-brand text-white rounded-full text-sm font-medium hover:bg-brand-dim transition-colors shadow-md shadow-brand/20">
                      <span className="material-symbols-outlined text-sm">upload_file</span>
                      Upload Graphic
                      <input type="file" accept="image/*" onChange={handleTemplateFileChange} className="hidden" />
                    </label>
                    <p className="text-xs text-on-surface-variant text-center mt-3 leading-relaxed">
                      We&apos;ll help you mark where the guest name, tag, and QR code go.
                    </p>
                  </div>
                )}

                {templateSuccess && (
                  <p className="text-brand text-xs mt-3 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {templateSuccess}
                  </p>
                )}
              </div>

              {/* Security card */}
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-brand-container/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-brand text-base" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                  </div>
                  <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest">Security PIN</p>
                </div>

                {securityPinSet ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                      <span className="material-symbols-outlined text-green-600 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                      <div>
                        <p className="text-sm font-semibold text-green-700">PIN Active</p>
                        <p className="text-xs text-green-600">••••</p>
                      </div>
                    </div>
                    <button
                      onClick={handleClearPin}
                      disabled={savingPin}
                      className="w-full h-10 rounded-full border border-outline-variant/30 text-sm text-on-surface-variant hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-all"
                    >
                      {savingPin ? 'Clearing…' : 'Clear PIN'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={securityPin}
                      onChange={e => setSecurityPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="4–6 digit PIN"
                      className="w-full h-10 rounded-2xl bg-surface-container border border-outline-variant/30 px-4 text-center text-base font-semibold tracking-widest text-on-lp-background focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all"
                      disabled={savingPin}
                    />
                    <button
                      onClick={handleSavePin}
                      disabled={savingPin || securityPin.length < 4}
                      className="w-full h-10 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-50 transition-all"
                    >
                      {savingPin ? 'Saving…' : 'Save PIN'}
                    </button>
                  </div>
                )}

                {pinSaveStatus === 'saved' && (
                  <p className="text-xs text-green-600 text-center mt-3 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    PIN saved
                  </p>
                )}
                {pinSaveStatus === 'cleared' && (
                  <p className="text-xs text-on-surface-variant text-center mt-3">PIN cleared</p>
                )}
                {pinSaveStatus === 'error' && (
                  <p className="text-xs text-red-600 text-center mt-3">Something went wrong</p>
                )}

                <div className="mt-5 pt-4 border-t border-outline-variant/20">
                  <p className="text-xs text-on-surface-variant mb-3">Share this link + PIN with your security team</p>
                  <button
                    onClick={handleCopyStaffLink}
                    className="w-full h-10 rounded-full border border-brand/30 text-brand text-sm font-semibold hover:bg-brand-container/20 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">link</span>
                    Copy Staff Link
                  </button>
                </div>
              </div>

              {/* Event info card */}
              <div className="bg-surface-container-low rounded-[2rem] p-6 border border-outline-variant/10">
                <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-4">Event Details</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-brand text-sm">calendar_today</span>
                    <span className="text-on-surface">{event?.date}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-brand text-sm">group</span>
                    <span className="text-on-surface">{stats?.total_invitations ?? 0} guests</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-brand text-sm">how_to_reg</span>
                    <span className="text-on-surface">{stats?.checked_in ?? 0} checked in</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Add / Edit Guest Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-on-lp-background/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/60">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-2xl font-light">{editingId ? 'Edit Guest' : 'Add Guest'}</h2>
              <button onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {[
                { label: 'Full Name', key: 'name', placeholder: 'e.g. Sarah Al-Rashid' },
                { label: 'Seat Number', key: 'seat_number', placeholder: 'e.g. A-12' },
                { label: 'Tag', key: 'tag', placeholder: 'e.g. VIP, Family, Friend' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">{label}</label>
                  <input
                    value={(formData as any)[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    required
                    placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-2xl bg-surface-container border border-outline-variant/20 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/40 transition-all text-sm"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-3 bg-brand text-white rounded-full font-semibold text-sm hover:bg-brand-dim transition-colors shadow-md shadow-brand/20">
                  {editingId ? 'Save Changes' : 'Add Guest'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 bg-surface-container rounded-full text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CSV Import Modal ── */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-on-lp-background/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-white/60">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-2xl font-light">Import Guests</h2>
              <button
                onClick={() => { setShowCsvModal(false); setCsvFile(null); setCsvPreview([]); setCsvResult(null); }}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {csvResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-brand-container/20 rounded-2xl">
                  <span className="material-symbols-outlined text-brand" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <p className="text-brand font-semibold text-sm">{csvResult.created} guests imported successfully</p>
                </div>
                {csvResult.errors.length > 0 && (
                  <div className="p-4 bg-secondary-container/30 rounded-2xl text-sm text-on-secondary-container space-y-1">
                    {csvResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
                <button
                  onClick={() => { setShowCsvModal(false); setCsvResult(null); }}
                  className="w-full py-3 bg-brand text-white rounded-full font-semibold text-sm hover:bg-brand-dim transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-4 bg-surface-container rounded-2xl text-xs text-on-surface-variant">
                  CSV must have columns: <code className="bg-surface-container-high px-1.5 py-0.5 rounded-md font-mono">name</code>, <code className="bg-surface-container-high px-1.5 py-0.5 rounded-md font-mono">seat_number</code>, <code className="bg-surface-container-high px-1.5 py-0.5 rounded-md font-mono">tag</code>
                </div>

                {csvPreview.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">Preview — first {csvPreview.length} rows</p>
                    <div className="rounded-2xl overflow-hidden border border-outline-variant/20">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-surface-container">
                            {['Name', 'Seat', 'Tag'].map((h) => (
                              <th key={h} className="text-left px-4 py-3 text-on-surface-variant font-semibold uppercase tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                          {csvPreview.map((row, i) => (
                            <tr key={i}>
                              <td className="px-4 py-3 text-on-surface">{row.name}</td>
                              <td className="px-4 py-3 text-on-surface-variant">{row.seat_number}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">{row.tag}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleCsvImport}
                    disabled={!csvFile || csvImporting}
                    className="flex-1 py-3 bg-brand text-white rounded-full font-semibold text-sm hover:bg-brand-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {csvImporting ? 'Importing…' : 'Import All'}
                  </button>
                  <button
                    onClick={() => { setShowCsvModal(false); setCsvFile(null); setCsvPreview([]); }}
                    className="flex-1 py-3 bg-surface-container rounded-full text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Zone Editor Modal ── */}
      {showZoneEditor && templatePreviewUrl && (
        <div className="fixed inset-0 bg-on-lp-background/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto p-8">
          <div className="bg-surface-container-lowest rounded-3xl p-8 w-full max-w-4xl shadow-2xl border border-white/60">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-2xl font-light">Mark Template Zones</h2>
              <button onClick={() => setShowZoneEditor(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
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
            {savingTemplate && (
              <p className="text-brand text-sm mt-3 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                Saving template…
              </p>
            )}
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={openAddForm}
        className="fixed bottom-8 right-8 bg-on-lp-background text-lp-background w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50"
      >
        <span className="material-symbols-outlined">person_add</span>
      </button>
    </div>
  );
}
