'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { eventService, invitationService, authService, api, Event, Invitation, InvitationStats, AuthUser } from '@/lib/api';
import OrganizerWorkspaceHeader from '@/components/OrganizerWorkspaceHeader';
import OrganizerWorkspaceSidebar from '@/components/OrganizerWorkspaceSidebar';
import ZoneEditor, { Zones } from '@/components/ZoneEditor';
import VerificationBanner from '@/components/VerificationBanner';
import { resolveMediaUrl } from '@/lib/api';
import ThemePicker from '@/components/ThemePicker';
import InvitationPreviewModal from '@/components/InvitationPreviewModal';
import BulkWhatsAppModal from '@/components/BulkWhatsAppModal';

const NAV_LINKS = [
  { icon: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { icon: 'group', label: 'Guest List', href: '#', active: true },
  // { icon: 'brush', label: 'Design Studio', href: '#' },
  // { icon: 'card_giftcard', label: 'Registry', href: '#' },
  { icon: 'leaderboard', label: 'Analytics', href: '/analytics' },
];

const EVENT_TABS = [
  {
    id: 'guests',
    label: 'Guests',
    icon: 'group',
    description: 'Guest list, imports, and invitation previews.',
  },
  {
    id: 'design',
    label: 'Design',
    icon: 'brush',
    description: 'Template uploads, zones, and guest-facing styling.',
  },
  {
    id: 'sharing',
    label: 'Sharing',
    icon: 'share',
    description: 'Security access, WhatsApp copy, and event logistics.',
  },
] as const;

type EventTab = (typeof EVENT_TABS)[number]['id'];

const getPlanLabel = (plan?: AuthUser['plan']) => (
  plan === 'pro' ? 'Pro Organizer' : 'Free Organizer'
);

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', seat_number: '', tag: '', phone_number: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewingInvitation, setPreviewingInvitation] = useState<Pick<Invitation, 'id' | 'name'> | null>(null);
  const [error, setError] = useState('');
  const [savingGuest, setSavingGuest] = useState(false);

  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ name: string; seat_number: string; tag: string }[]>([]);
  const [csvRowCount, setCsvRowCount] = useState(0);
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

  const [waTemplate, setWaTemplate] = useState('');
  const [savingWaTemplate, setSavingWaTemplate] = useState(false);
  const [waTemplateSaved, setWaTemplateSaved] = useState(false);

  const [selectedTheme, setSelectedTheme] = useState('');
  const [themeData, setThemeData] = useState<Record<string, unknown>>({});
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<EventTab>('guests');

  const [selectedInvitationIds, setSelectedInvitationIds] = useState<Set<string>>(new Set());
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false);
  const [bulkSendLoading, setBulkSendLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const loadData = async () => {
    try {
      const [me, ev, invs] = await Promise.all([
        authService.me(),
        eventService.getById(id),
        invitationService.getAll(),
      ]);
      setUser(me);
      setEvent(ev);
      setSecurityPinSet(Boolean(ev.has_security_pin));
      setWaTemplate(ev.whatsapp_message_template ?? '');
      setSelectedTheme(ev.theme ?? '');
      setThemeData(ev.theme_data ?? {});
      const eventInvs = invs.filter((inv) => inv.event === id);
      setInvitations(eventInvs);
      setSelectedInvitationIds((prev) => new Set(
        Array.from(prev).filter((invId) => eventInvs.some((inv) => inv.id === invId))
      ));
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
    setSavingGuest(true);
    try {
      if (editingId) {
        await invitationService.update(editingId, formData);
      } else {
        await invitationService.create({ ...formData, event: id } as any);
      }
      setShowForm(false);
      setFormData({ name: '', seat_number: '', tag: '', phone_number: '' });
      setEditingId(null);
      await loadData();
    } catch {
      setError('Failed to save invitation.');
    } finally {
      setSavingGuest(false);
    }
  };

  const handleDelete = async (invId: string) => {
    if (!confirm('Delete this invitation?')) return;
    await invitationService.delete(invId);
    await loadData();
  };

  const handleBulkDelete = async () => {
    const count = selectedInvitationIds.size;
    if (!event || count === 0) return;
    if (!confirm(`Delete ${count} selected guest${count !== 1 ? 's' : ''}? This cannot be undone.`)) return;

    setBulkDeleteLoading(true);
    try {
      await invitationService.bulkDelete(event.id, Array.from(selectedInvitationIds));
      setSelectedInvitationIds(new Set());
      await loadData();
    } catch {
      setError('Failed to delete selected guests.');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleUndoCheckIn = async (invId: string) => {
    await invitationService.undoCheckIn(invId);
    await loadData();
  };

  const handleSelectInvitation = (invId: string) => {
    setSelectedInvitationIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(invId)) {
        updated.delete(invId);
      } else {
        updated.add(invId);
      }
      return updated;
    });
  };

  const handleSelectAll = () => {
    if (selectedInvitationIds.size === invitations.length) {
      setSelectedInvitationIds(new Set());
    } else {
      setSelectedInvitationIds(new Set(invitations.map((inv) => inv.id)));
    }
  };

  const handleBulkSendWhatsApp = async () => {
    if (!event || selectedInvitationIds.size === 0) {
      throw new Error('No event or invitations selected');
    }

    setBulkSendLoading(true);
    try {
      const result = await invitationService.bulkSendWhatsApp(
        event.id,
        Array.from(selectedInvitationIds)
      );
      // Close modal after 2 seconds and reload data
      setTimeout(() => {
        setShowBulkWhatsAppModal(false);
        setSelectedInvitationIds(new Set());
        loadData();
      }, 2000);
      return {
        invitation_count: selectedInvitationIds.size,
        link_preview: ''
      };
    } catch (err) {
      throw err;
    } finally {
      setBulkSendLoading(false);
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvResult(null);
    setCsvRowCount(0);
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
      setCsvRowCount(rows.length);
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
      setCsvRowCount(0);
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

  const handleSaveWaTemplate = async () => {
    if (!event) return;
    setSavingWaTemplate(true);
    setWaTemplateSaved(false);
    try {
      await api.patch(`/events/${event.id}/`, { whatsapp_message_template: waTemplate });
      setWaTemplateSaved(true);
    } catch {
      // keep current value
    } finally {
      setSavingWaTemplate(false);
    }
  };

  const handleSaveTheme = async (theme: string, data: Record<string, unknown>) => {
    setSelectedTheme(theme);
    setThemeData(data);
    setSavingTheme(true);
    setThemeSaved(false);
    try {
      await eventService.update(id, { theme, theme_data: data });
      setThemeSaved(true);
      window.setTimeout(() => setThemeSaved(false), 2000);
    } catch {
      setError('Failed to save theme.');
    } finally {
      setSavingTheme(false);
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData({ name: '', seat_number: '', tag: '', phone_number: '' });
    setShowForm(true);
  };

  const openEditForm = (inv: Invitation) => {
    setEditingId(inv.id);
    setFormData({
      name: inv.name,
      seat_number: inv.seat_number ?? '',
      tag: inv.tag ?? '',
      phone_number: inv.phone_number ?? '',
    });
    setShowForm(true);
  };

  const openInvitationPreview = (inv: Invitation) => {
    setPreviewingInvitation({ id: inv.id, name: inv.name });
  };

  const displayName = user?.display_name || 'Organizer';
  const avatarInitial = user?.avatar_initial || displayName.charAt(0).toUpperCase() || 'O';
  const planLabel = getPlanLabel(user?.plan);
  const workspaceBrandName = user?.brand_name?.trim() || '';
  const workspaceIdentityName = workspaceBrandName || displayName;
  const workspaceIdentityMeta = workspaceBrandName
    ? `${displayName} · ${planLabel}`
    : planLabel;
  const workspaceBrandLogoUrl = resolveMediaUrl(user?.brand_logo_url);
  const activeEventTab = EVENT_TABS.find((tab) => tab.id === activeTab) ?? EVENT_TABS[0];

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

      <OrganizerWorkspaceSidebar
        identityName={workspaceIdentityName}
        identityMeta={workspaceIdentityMeta}
        avatarInitial={avatarInitial}
        brandLogoUrl={workspaceBrandLogoUrl}
        navLinks={NAV_LINKS}
        primaryAction={(
          <button
            onClick={openAddForm}
            className="w-full bg-brand text-white py-3 rounded-full font-medium shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm"
          >
            + Add Guest
          </button>
        )}
        secondaryActions={[
          { icon: 'settings', label: 'Settings', href: '/settings' },
          { icon: 'help', label: 'Support', href: '/support' },
          { icon: 'arrow_back', label: 'Dashboard', href: '/dashboard' },
        ]}
      />

      {/* ── Main ── */}
      <main className="ml-0 lg:ml-64 min-h-screen relative z-10">
        <OrganizerWorkspaceHeader>
          <div className="px-4 sm:px-6 lg:px-12 py-4 flex flex-col gap-4 lg:h-20 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <button onClick={() => router.push('/dashboard')} className="shrink-0 text-on-surface-variant hover:text-brand transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-on-surface-variant text-xs sm:text-sm overflow-x-auto whitespace-nowrap">
                <Link href="/dashboard" className="hover:text-brand transition-colors">Dashboard</Link>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="text-on-surface font-medium truncate">{event?.name}</span>
              </div>
              <p className="lg:hidden text-xs text-on-surface-variant mt-1">
                {activeEventTab.description}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {activeTab === 'guests' && (
              <>
                <button
                  onClick={openAddForm}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-brand text-white rounded-full text-xs sm:text-sm font-medium hover:bg-brand-dim transition-colors shadow-md shadow-brand/20"
                >
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  Add Guest
                </button>
                <a
                  href="/guest-import-template.csv"
                  download="guest-import-template.csv"
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-surface-container rounded-full text-xs sm:text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors border border-outline-variant/20"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  CSV Template
                </a>
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-surface-container rounded-full text-xs sm:text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors border border-outline-variant/20">
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  Import CSV
                  <input type="file" accept=".csv" onChange={handleCsvFileChange} className="hidden" />
                </label>
              </>
            )}
            {activeTab === 'design' && (
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-brand text-white rounded-full text-xs sm:text-sm font-medium hover:bg-brand-dim transition-colors shadow-md shadow-brand/20">
                <span className="material-symbols-outlined text-sm">{event?.background_image ? 'upload' : 'upload_file'}</span>
                {event?.background_image ? 'Replace Template' : 'Upload Graphic'}
                <input type="file" accept="image/*" onChange={handleTemplateFileChange} className="hidden" />
              </label>
            )}
            {activeTab === 'sharing' && (
              <button
                onClick={handleCopyStaffLink}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-surface-container rounded-full text-xs sm:text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors border border-outline-variant/20"
              >
                <span className="material-symbols-outlined text-sm">link</span>
                Copy Staff Link
              </button>
            )}
          </div>
          </div>
        </OrganizerWorkspaceHeader>

        {user && !user.email_verified && <VerificationBanner />}

        <section className="px-4 sm:px-6 lg:px-12 py-8 lg:py-10 max-w-7xl mx-auto pb-24">
          {/* Event header */}
          <div className="mb-8 lg:mb-10">
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="font-headline text-3xl sm:text-4xl font-light tracking-tight text-on-surface mb-2">
                  {event?.name}
                </h1>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
                  <span className="flex items-center gap-1.5 text-on-surface-variant text-sm">
                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                    {event?.date}
                  </span>
                  {event?.description && (
                    <span className="text-on-surface-variant text-sm">{event.description}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats bento */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-10 lg:mb-12">
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

          <div className="mb-8 lg:mb-10">
            <div className="inline-flex flex-wrap gap-2 rounded-[2rem] border border-white/50 bg-white/70 p-2 shadow-sm backdrop-blur-xl">
              {EVENT_TABS.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${isActive
                        ? 'bg-brand text-white shadow-md shadow-brand/20'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[18px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-on-surface-variant mt-4">{activeEventTab.description}</p>
          </div>

          {activeTab === 'guests' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <h2 className="font-headline text-2xl font-normal">Guest List</h2>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Add, import, edit, and preview invitations for this event.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-on-surface-variant">{invitations.length} guest{invitations.length !== 1 ? 's' : ''}</span>
                  <button
                    onClick={openAddForm}
                    className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand/20 transition-colors hover:bg-brand-dim"
                  >
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    Add Guest
                  </button>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-[2rem] overflow-hidden border border-outline-variant/10 shadow-sm">
                {invitations.length === 0 ? (
                  <div className="py-16 sm:py-20 px-6 text-center">
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
                  <>
                    <div className="md:hidden divide-y divide-outline-variant/10">
                      {invitations.map((inv) => (
                        <div key={inv.id} className="p-5 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selectedInvitationIds.has(inv.id)}
                                onChange={() => handleSelectInvitation(inv.id)}
                                className="mt-1 rounded"
                                aria-label={`Select ${inv.name}`}
                              />
                              <div className="min-w-0">
                                <p className="font-medium text-on-surface truncate">{inv.name}</p>
                                <p className="text-xs text-on-surface-variant mt-1">
                                  {inv.seat_number ? `Seat ${inv.seat_number}` : 'No seat assigned'}
                                </p>
                              </div>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${inv.checked_in
                                ? 'bg-brand-container/40 text-on-brand-container'
                                : 'bg-surface-container text-on-surface-variant'
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${inv.checked_in ? 'bg-brand' : 'bg-outline-variant'}`} />
                              {inv.checked_in ? 'Checked In' : 'Pending'}
                            </span>
                          </div>

                          {inv.tag && (
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container">
                                {inv.tag}
                              </span>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openInvitationPreview(inv)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container text-xs font-medium text-on-surface-variant"
                            >
                              <span className="material-symbols-outlined text-sm">visibility</span>
                              View
                            </button>
                            <button
                              onClick={() => openEditForm(inv)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container text-xs font-medium text-on-surface-variant"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              Edit
                            </button>
                            {inv.checked_in && (
                              <button
                                onClick={() => handleUndoCheckIn(inv.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-secondary-container/40 text-xs font-medium text-on-surface"
                              >
                                <span className="material-symbols-outlined text-sm">undo</span>
                                Undo
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(inv.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-tertiary-container/20 text-xs font-medium text-tertiary"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedInvitationIds.size > 0 && (
                      <div className="m-4 p-3 bg-surface-container rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <span className="text-sm text-on-surface">
                          {selectedInvitationIds.size} guest{selectedInvitationIds.size !== 1 ? 's' : ''} selected
                        </span>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => setShowBulkWhatsAppModal(true)}
                            disabled={bulkSendLoading || bulkDeleteLoading}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dim disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[18px]">send</span>
                            Send WhatsApp
                          </button>
                          <button
                            onClick={handleBulkDelete}
                            disabled={bulkDeleteLoading || bulkSendLoading}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-tertiary-container/30 px-4 py-2 text-sm font-medium text-tertiary transition hover:bg-tertiary-container/50 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            {bulkDeleteLoading ? 'Deleting...' : 'Delete Selected'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full min-w-[760px] text-sm">
                        <thead>
                          <tr className="border-b border-outline-variant/10 bg-surface-container-low">
                            <th className="px-4 py-3 text-left">
                              <input
                                type="checkbox"
                                checked={selectedInvitationIds.size === invitations.length && invitations.length > 0}
                                onChange={handleSelectAll}
                                className="rounded"
                              />
                            </th>
                            {['Name', 'Seat', 'Tag', 'Status', 'Actions'].map((h) => (
                              <th key={h} className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                          {invitations.map((inv) => (
                            <tr key={inv.id} className="hover:bg-surface-container-low/50 transition-colors group">
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedInvitationIds.has(inv.id)}
                                  onChange={() => handleSelectInvitation(inv.id)}
                                  className="rounded"
                                />
                              </td>
                              <td className="px-6 py-4 font-medium text-on-surface">{inv.name}</td>
                              <td className="px-6 py-4 text-on-surface-variant">{inv.seat_number}</td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container">
                                  {inv.tag}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${inv.checked_in
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
                                    onClick={() => openInvitationPreview(inv)}
                                    className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-brand"
                                    title="Preview invitation"
                                  >
                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                  </button>
                                  <button
                                    onClick={() => openEditForm(inv)}
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
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'design' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div className="contents">
                <div className="bg-surface-container-lowest rounded-[2rem] p-6 sm:p-8 border border-outline-variant/10 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-headline text-xl font-normal">Invite Template</h3>
                      <p className="text-sm text-on-surface-variant mt-1">
                        Upload a custom layout and mark where the guest name, tag, and QR code should land.
                      </p>
                    </div>
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

              </div>

              <div className="contents">
                <div className="bg-surface-container-low rounded-[2rem] p-5 sm:p-6 border border-outline-variant/10">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-4">Design Notes</p>
                  <div className="space-y-4 text-sm text-on-surface-variant">
                    <p>Use a portrait graphic for the cleanest result on guest devices.</p>
                    <p>Zone placement controls exactly where the QR code, guest name, and tag appear.</p>
                    <p>
                      {user?.plan === 'pro'
                        ? 'Your plan includes themed invitation pages in addition to the uploaded invitation artwork.'
                        : 'Upgrade to Pro if you want to pair the uploaded template with a themed invitation page.'}
                    </p>
                  </div>
                </div>
              </div>

              {user?.plan === 'pro' && (
                <div className="lg:col-span-2">
                  <ThemePicker
                    selectedTheme={selectedTheme}
                    themeData={themeData}
                    onSave={handleSaveTheme}
                    saving={savingTheme}
                    saved={themeSaved}
                    eventName={event?.name}
                    eventDate={event?.date}
                    hasTemplate={Boolean(event?.background_image)}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'sharing' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div className="contents">
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
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

                <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-[#25D366]/20 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#25D366]">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </div>
                    <p className="text-xs font-label font-semibold text-on-surface uppercase tracking-widest">WhatsApp Message</p>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                    Customise the message sent when sharing via WhatsApp. Use{' '}
                    <code className="bg-surface-container px-1 py-0.5 rounded font-mono text-brand">{'{{brand_name}}'}</code>{', '}
                    <code className="bg-surface-container px-1 py-0.5 rounded font-mono text-brand">{'{{name}}'}</code>{', '}
                    <code className="bg-surface-container px-1 py-0.5 rounded font-mono text-brand">{'{{seat_number}}'}</code>{', '}
                    <code className="bg-surface-container px-1 py-0.5 rounded font-mono text-brand">{'{{tag}}'}</code>{', '}
                    <code className="bg-surface-container px-1 py-0.5 rounded font-mono text-brand">{'{{link}}'}</code>{' '}as placeholders.
                  </p>
                  <textarea
                    value={waTemplate}
                    onChange={e => { setWaTemplate(e.target.value); setWaTemplateSaved(false); }}
                    rows={5}
                    placeholder={`{{brand_name}} invited you! 🎉\n\nName: {{name}}\nSeat: {{seat_number}}\n\nView your invitation: {{link}}`}
                    className="w-full rounded-2xl bg-surface-container border border-outline-variant/30 px-4 py-3 text-sm text-on-lp-background placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all resize-none font-mono"
                  />
                  <button
                    onClick={handleSaveWaTemplate}
                    disabled={savingWaTemplate}
                    className="w-full h-10 mt-3 rounded-full bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1ebe5c] disabled:opacity-50 transition-all"
                  >
                    {savingWaTemplate ? 'Saving…' : 'Save Message'}
                  </button>
                  {waTemplateSaved && (
                    <p className="text-xs text-green-600 text-center mt-2 flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      Saved
                    </p>
                  )}
                </div>
              </div>

              <div className="contents">
                <div className="bg-surface-container-low rounded-[2rem] p-5 sm:p-6 border border-outline-variant/10">
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

                <div className="bg-surface-container-low rounded-[2rem] p-5 sm:p-6 border border-outline-variant/10">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-4">Sharing Flow</p>
                  <div className="space-y-4 text-sm text-on-surface-variant">
                    <p>1. Share the public invitation link with guests.</p>
                    <p>2. Share the staff link and PIN only with security.</p>
                    <p>3. Update the WhatsApp message so your invite copy matches this event.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ── Add / Edit Guest Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-on-lp-background/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-5 sm:p-8 w-full max-w-md shadow-2xl border border-white/60">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-2xl font-light">{editingId ? 'Edit Guest' : 'Add Guest'}</h2>
              <button onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {[
                { label: 'Full Name', key: 'name', placeholder: 'e.g. Sarah Al-Rashid', required: true, type: 'text' },
                { label: 'Seat Number', key: 'seat_number', placeholder: 'e.g. A-12', required: false, type: 'text' },
                { label: 'Tag', key: 'tag', placeholder: 'e.g. VIP, Family, Friend', required: false, type: 'text' },
                { label: 'Phone Number', key: 'phone_number', placeholder: 'e.g. 8060681740', required: false, type: 'tel' },
              ].map(({ label, key, placeholder, required, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">{label}</label>
                  <input
                    value={(formData as any)[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    required={required}
                    type={type}
                    disabled={savingGuest}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-2xl bg-surface-container border border-outline-variant/20 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/40 transition-all text-sm"
                  />
                </div>
              ))}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingGuest}
                  className="flex-1 py-3 bg-brand text-white rounded-full font-semibold text-sm hover:bg-brand-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-brand/20"
                >
                  {savingGuest ? (editingId ? 'Saving…' : 'Adding…') : (editingId ? 'Save Changes' : 'Add Guest')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={savingGuest}
                  className="flex-1 py-3 bg-surface-container rounded-full text-sm font-medium text-on-surface hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
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
          <div className="bg-surface-container-lowest rounded-3xl p-5 sm:p-8 w-full max-w-lg shadow-2xl border border-white/60">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-2xl font-light">Import Guests</h2>
              <button
                onClick={() => { setShowCsvModal(false); setCsvFile(null); setCsvPreview([]); setCsvResult(null); setCsvRowCount(0); }}
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
                  CSV must have columns: <code className="bg-surface-container-high px-1.5 py-0.5 rounded-md font-mono">name</code>, <code className="bg-surface-container-high px-1.5 py-0.5 rounded-md font-mono">seat_number</code>, <code className="bg-surface-container-high px-1.5 py-0.5 rounded-md font-mono">tag</code>. Optional: <code className="bg-surface-container-high px-1.5 py-0.5 rounded-md font-mono">phone_number</code>
                </div>

                {csvFile && (
                  <div className="flex items-center justify-between rounded-2xl bg-surface-container-low px-4 py-3 text-sm">
                    <span className="truncate text-on-surface">{csvFile.name}</span>
                    <span className="shrink-0 text-on-surface-variant">
                      {csvRowCount} guest{csvRowCount !== 1 ? 's' : ''} ready
                    </span>
                  </div>
                )}

                {csvPreview.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">Preview — first {csvPreview.length} rows</p>
                    <div className="rounded-2xl overflow-hidden border border-outline-variant/20 overflow-x-auto">
                      <table className="w-full min-w-[360px] text-xs">
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

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleCsvImport}
                    disabled={!csvFile || csvImporting}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 bg-brand text-white rounded-full font-semibold text-sm hover:bg-brand-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {csvImporting && <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>}
                    {csvImporting
                      ? `Importing ${csvRowCount} guest${csvRowCount !== 1 ? 's' : ''}...`
                      : 'Import All'}
                  </button>
                  <button
                    onClick={() => { setShowCsvModal(false); setCsvFile(null); setCsvPreview([]); setCsvRowCount(0); }}
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
        <div className="fixed inset-0 bg-on-lp-background/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto p-4 sm:p-8">
          <div className="bg-surface-container-lowest rounded-3xl p-5 sm:p-8 w-full max-w-4xl shadow-2xl border border-white/60">
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

      <InvitationPreviewModal
        invitationId={previewingInvitation?.id ?? null}
        invitationName={previewingInvitation?.name}
        onClose={() => setPreviewingInvitation(null)}
      />

      <BulkWhatsAppModal
        isOpen={showBulkWhatsAppModal}
        selectedInvitations={invitations.filter((inv) => selectedInvitationIds.has(inv.id))}
        onConfirm={handleBulkSendWhatsApp}
        onCancel={() => setShowBulkWhatsAppModal(false)}
      />

      {/* FAB */}
      {activeTab === 'guests' && (
        <button
          onClick={openAddForm}
          className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 bg-on-lp-background text-lp-background w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50"
        >
          <span className="material-symbols-outlined">person_add</span>
        </button>
      )}
    </div>
  );
}
