'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { eventService, authService, invitationService, Event, InvitationStats, AuthUser, resolveMediaUrl } from '@/lib/api';
import OrganizerWorkspaceHeader from '@/components/OrganizerWorkspaceHeader';
import OrganizerWorkspaceSidebar from '@/components/OrganizerWorkspaceSidebar';
import VerificationBanner from '@/components/VerificationBanner';

const NAV_LINKS = [
  { icon: 'dashboard', label: 'Dashboard', href: '/dashboard', active: true },
  // { icon: 'group', label: 'Guest List', href: '#' },
  { icon: 'brush', label: 'Design Studio', href: '/events/new' },
  { icon: 'card_giftcard', label: 'Registry', href: '#' },
  { icon: 'leaderboard', label: 'Analytics', href: '/analytics' },
];

const EVENT_GRADIENTS = [
  'from-brand-container/40 to-secondary-container/60',
  'from-secondary-container/40 to-tertiary-container/40',
  'from-tertiary-container/30 to-brand-container/30',
  'from-brand-container/30 to-tertiary-container/20',
];

type DashboardNotification = {
  id: string;
  icon: string;
  title: string;
  detail: string;
};

const getPlanLabel = (plan?: AuthUser['plan']) => (
  plan === 'pro' ? 'Pro Organizer' : 'Free Organizer'
);

const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const formatThemeLabel = (theme?: string) => {
  if (!theme || theme === 'none') return 'Unstyled';
  return theme
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatEventDate = (date?: string) => {
  if (!date) return 'Date TBD';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return EVENT_DATE_FORMATTER.format(parsed);
};

const getEventStatus = (date?: string) => {
  if (!date) {
    return {
      label: 'Draft',
      icon: 'edit_square',
      badgeClass: 'bg-white/85 text-on-surface',
      dotClass: 'bg-outline',
    };
  }

  const eventDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(eventDate.getTime())) {
    return {
      label: 'Scheduled',
      icon: 'event',
      badgeClass: 'bg-white/85 text-on-surface',
      dotClass: 'bg-outline',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (eventDate.getTime() === today.getTime()) {
    return {
      label: 'Today',
      icon: 'bolt',
      badgeClass: 'bg-white/90 text-brand',
      dotClass: 'bg-brand',
    };
  }

  if (eventDate > today) {
    return {
      label: 'Upcoming',
      icon: 'north_east',
      badgeClass: 'bg-white/85 text-on-surface',
      dotClass: 'bg-brand',
    };
  }

  return {
    label: 'Past',
    icon: 'history',
    badgeClass: 'bg-white/85 text-on-surface',
    dotClass: 'bg-tertiary',
  };
};

const getEventCategoryLabel = (event: Event) => {
  if (event.background_image) return 'Custom Template';
  if (event.theme && event.theme !== 'none') return `${formatThemeLabel(event.theme)} Theme`;
  if (event.has_security_pin) return 'Protected Event';
  return 'Event Draft';
};

const getEventDetailLine = (event: Event) => {
  if (event.background_image) {
    return { icon: 'photo', text: 'Template uploaded and ready for guest rendering' };
  }

  if (event.theme && event.theme !== 'none') {
    return { icon: 'palette', text: `${formatThemeLabel(event.theme)} styling is active` };
  }

  return { icon: 'auto_fix_high', text: 'Ready for design, guest import, and QR setup' };
};

const getEventPills = (event: Event) => {
  const pills = [
    event.has_security_pin ? 'Security On' : 'Security Open',
    event.whatsapp_message_template ? 'WhatsApp Ready' : 'Share Template Default',
  ];

  if (event.background_image) {
    pills.unshift('Template Ready');
  } else if (event.theme && event.theme !== 'none') {
    pills.unshift(`${formatThemeLabel(event.theme)} Theme`);
  } else {
    pills.unshift('No Template Yet');
  }

  return pills;
};

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    Promise.all([
      authService.me(),
      eventService.getAll(),
      invitationService.getStats(),
    ])
      .then(([me, evs, st]) => {
        setUser(me);
        setEvents(evs);
        setStats(st);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!notificationPanelRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [notificationsOpen]);

  const handleLogout = async () => {
    await authService.logout();
    router.push('/login');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event and all its invitations?')) return;
    await eventService.delete(id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const displayName = user?.display_name || 'Organizer';
  const firstName = displayName.split(/\s+/)[0] || displayName;
  const avatarInitial = user?.avatar_initial || displayName.charAt(0).toUpperCase() || 'O';
  const planLabel = getPlanLabel(user?.plan);
  const workspaceBrandName = user?.brand_name?.trim() || '';
  const workspaceIdentityName = workspaceBrandName || displayName;
  const workspaceIdentityMeta = workspaceBrandName
    ? `${displayName} · ${planLabel}`
    : planLabel;
  const workspaceBrandLogoUrl = resolveMediaUrl(user?.brand_logo_url);
  const canCreateEvent = !!user?.email_verified;

  const notifications: DashboardNotification[] = loading ? [] : [
    events.length === 0
      ? {
        id: 'first-event',
        icon: 'celebration',
        title: 'Create your first event',
        detail: 'Set up an event to start inviting guests and tracking check-ins.',
      }
      : {
        id: 'active-events',
        icon: 'event_note',
        title: `${events.length} active event${events.length === 1 ? '' : 's'}`,
        detail: 'Open an event to manage templates, guests, and check-in access.',
      },
    (stats?.pending ?? 0) > 0
      ? {
        id: 'pending-guests',
        icon: 'schedule',
        title: `${stats?.pending ?? 0} guest${stats?.pending === 1 ? '' : 's'} pending`,
        detail: 'Keep monitoring arrivals or share reminder links with guests.',
      }
      : {
        id: 'all-clear',
        icon: 'task_alt',
        title: 'No pending arrivals',
        detail: 'Everyone is checked in or you have not added any guests yet.',
      },
    (stats?.checked_in ?? 0) > 0
      ? {
        id: 'check-in-rate',
        icon: 'how_to_reg',
        title: `${stats?.checked_in ?? 0} guest${stats?.checked_in === 1 ? '' : 's'} checked in`,
        detail: `Current check-in rate is ${Math.round(stats?.check_in_rate ?? 0)}%.`,
      }
      : {
        id: 'share-invites',
        icon: 'share',
        title: 'Share your invites',
        detail: 'Guests can only access their QR codes after you send the invitation links.',
      },
  ];

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
            onClick={() => router.push('/events/new')}
            disabled={!user?.email_verified}
            className="w-full bg-brand text-white py-3 rounded-full font-medium shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
          >
            + New Event
          </button>
        )}
        secondaryActions={[
          { icon: 'settings', label: 'Settings', href: '/settings' },
          { icon: 'help', label: 'Support', href: '/support' },
          { icon: 'logout', label: 'Log out', onClick: handleLogout },
        ]}
      />

      {/* ── Main ── */}
      <main className="ml-0 lg:ml-64 min-h-screen relative z-10">
        <OrganizerWorkspaceHeader navLinks={NAV_LINKS}>
          <div className="px-4 sm:px-6 lg:px-12 py-4 lg:h-20 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between lg:hidden">
              <Link href="/" className="text-lg font-headline italic text-tertiary">
                YouAreInvited
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/events/new')}
                  disabled={!user?.email_verified}
                  className="px-4 py-2 rounded-full bg-brand text-white text-xs font-semibold shadow-lg shadow-brand/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  New Event
                </button>
                <Link
                  href="/settings"
                  className="p-2 rounded-full bg-surface-container-low text-on-surface-variant"
                  aria-label="Settings"
                >
                  <span className="material-symbols-outlined text-base">settings</span>
                </Link>
                <Link
                  href="/support"
                  className="p-2 rounded-full bg-surface-container-low text-on-surface-variant"
                  aria-label="Support"
                >
                  <span className="material-symbols-outlined text-base">support_agent</span>
                </Link>
                {workspaceBrandLogoUrl ? (
                  <img
                    src={workspaceBrandLogoUrl}
                    alt={`${workspaceIdentityName} logo`}
                    className="w-9 h-9 rounded-2xl object-cover border border-white/60 bg-white"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">
                    {avatarInitial}
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full bg-surface-container-low text-on-surface-variant"
                  aria-label="Log out"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-full w-full lg:w-96 border border-outline-variant/10">
              <span className="material-symbols-outlined text-on-surface-variant text-sm">search</span>
              <input
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-on-surface-variant/60"
                placeholder="Search events or guests..."
                type="text"
              />
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <div className="relative" ref={notificationPanelRef}>
                <button
                  onClick={() => setNotificationsOpen((open) => !open)}
                  className="relative p-2 text-on-surface-variant hover:text-brand transition-colors"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {notifications.length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-tertiary rounded-full" />
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-full mt-3 w-80 rounded-3xl border border-white/60 bg-white/90 backdrop-blur-xl shadow-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-on-surface">Notifications</p>
                        <p className="text-xs text-on-surface-variant">Latest organizer updates</p>
                      </div>
                      <span className="text-xs font-semibold text-brand">{notifications.length}</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="px-5 py-4 border-b border-outline-variant/10 last:border-b-0">
                          <div className="flex gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-brand-container/30 text-brand flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-base">{notification.icon}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-on-surface">{notification.title}</p>
                              <p className="text-xs text-on-surface-variant leading-relaxed mt-1">{notification.detail}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="h-8 w-px bg-outline-variant/20" />
              <div className="flex items-center gap-3 rounded-full bg-white/70 px-2 py-2 border border-white/50">
                {workspaceBrandLogoUrl ? (
                  <img
                    src={workspaceBrandLogoUrl}
                    alt={`${workspaceIdentityName} logo`}
                    className="w-10 h-10 rounded-2xl object-cover border border-white/60 bg-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">
                    {avatarInitial}
                  </div>
                )}
                <div className="pr-2">
                  <p className="text-sm font-medium text-on-surface leading-tight">{workspaceIdentityName}</p>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{workspaceIdentityMeta}</p>
                </div>
              </div>
            </div>
          </div>
        </OrganizerWorkspaceHeader>

        {user && !user.email_verified && <VerificationBanner />}

        <section className="px-4 sm:px-6 lg:px-12 py-8 lg:py-10 max-w-7xl mx-auto pb-24">
          {/* Greeting */}
          <div className="mb-10 lg:mb-12">
            <h2 className="font-headline text-3xl sm:text-4xl font-light tracking-tight text-on-surface mb-2">
              Welcome back, <span className="italic font-normal">{firstName}.</span>
            </h2>
            <p className="text-sm sm:text-base text-on-surface-variant">Your digital gala is flourishing. Here is your overview.</p>
          </div>

          {/* Stats bento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-12 lg:mb-16">
            <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/40 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-brand/5 rounded-full blur-2xl group-hover:bg-brand/10 transition-colors" />
              <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-4">Total Events</p>
              <div className="flex items-end justify-between">
                <span className="font-headline text-3xl font-bold">{loading ? '—' : events.length}</span>
                <span className="text-brand text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">event_note</span>
                </span>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/40 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-warm/5 rounded-full blur-2xl group-hover:bg-warm/10 transition-colors" />
              <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-4">Total Guests</p>
              <div className="flex items-end justify-between">
                <span className="font-headline text-3xl font-bold">{loading ? '—' : (stats?.total_invitations ?? 0)}</span>
                <span className="text-warm text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">group</span>
                </span>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/40 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-tertiary/5 rounded-full blur-2xl group-hover:bg-tertiary/10 transition-colors" />
              <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-4">Check-in Rate</p>
              <div className="flex items-end justify-between">
                <span className="font-headline text-3xl font-bold">
                  {loading ? '—' : `${Math.round(stats?.check_in_rate ?? 0)}%`}
                </span>
                <div className="h-1.5 w-16 bg-surface-container rounded-full mb-1">
                  <div
                    className="h-full bg-tertiary rounded-full transition-all"
                    style={{ width: `${stats?.check_in_rate ?? 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/40 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-brand-container/30 rounded-full blur-2xl group-hover:bg-brand-container/40 transition-colors" />
              <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-4">Checked In</p>
              <div className="flex items-end justify-between">
                <span className="font-headline text-3xl font-bold">{loading ? '—' : (stats?.checked_in ?? 0)}</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />
                  <span className="text-[10px] text-brand font-bold uppercase">Live</span>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-12 lg:space-y-14">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h3 className="font-headline text-2xl sm:text-3xl font-normal text-on-surface">My Events</h3>
                <p className="text-sm text-on-surface-variant mt-2">
                  Design, manage, and monitor each event from a single editorial-style workspace.
                </p>
              </div>
              <button
                onClick={() => router.push('/events/new')}
                disabled={!canCreateEvent}
                className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline underline-offset-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">add</span>
                New Event
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
              <div className="group relative overflow-hidden rounded-[2rem] p-[1px] bg-gradient-to-br from-brand-container via-tertiary-container to-secondary-container shadow-xl min-h-[420px] flex flex-col">
                <div className="bg-white/90 backdrop-blur-md rounded-[calc(2rem-1px)] flex-1 flex flex-col items-center justify-center text-center p-10 sm:p-12">
                  <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center mb-6 transition-colors group-hover:bg-brand/20">
                    <span className="material-symbols-outlined text-4xl text-brand">add</span>
                  </div>
                  <h4 className="font-headline text-2xl mb-2 text-on-surface">Design New Event</h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs mb-8">
                    Begin a new celebration and step straight into the design studio.
                  </p>
                  <button
                    onClick={() => router.push('/events/new')}
                    disabled={!canCreateEvent}
                    className="bg-brand text-white px-10 py-3 rounded-full font-semibold shadow-md transition-all hover:bg-brand-dim disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Create Event
                  </button>
                </div>
              </div>

              {loading && Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={`event-skeleton-${index}`}
                  className="rounded-[2rem] overflow-hidden bg-surface-container-lowest border border-outline-variant/10 shadow-[0_12px_40px_rgba(47,51,54,0.04)] min-h-[420px] animate-pulse"
                >
                  <div className="h-64 bg-surface-container" />
                  <div className="p-8 space-y-4">
                    <div className="h-3 w-24 rounded-full bg-surface-container-high" />
                    <div className="h-8 w-2/3 rounded-full bg-surface-container-high" />
                    <div className="h-4 w-5/6 rounded-full bg-surface-container-high" />
                    <div className="h-4 w-2/3 rounded-full bg-surface-container-high" />
                  </div>
                </div>
              ))}

              {!loading && events.length === 0 && (
                <div className="md:col-span-1 xl:col-span-2 rounded-[2rem] border border-dashed border-outline-variant/20 bg-white/55 backdrop-blur-xl min-h-[420px] p-10 sm:p-12 flex flex-col justify-center">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand mb-4">First Event</p>
                  <h4 className="font-headline text-3xl text-on-surface mb-3">Your dashboard is ready for its first celebration.</h4>
                  <p className="text-sm text-on-surface-variant max-w-lg leading-relaxed">
                    Create an event to start designing invitations, importing guests, and unlocking QR check-in for the day itself.
                  </p>
                </div>
              )}

              {!loading && events.map((event, idx) => {
                const status = getEventStatus(event.date);
                const detailLine = getEventDetailLine(event);
                const eventPills = getEventPills(event);
                const imageUrl = resolveMediaUrl(event.background_image);

                return (
                  <article
                    key={event.id}
                    className="group relative bg-surface-container-lowest rounded-[2rem] overflow-hidden shadow-[0_12px_40px_rgba(47,51,54,0.04)] hover:shadow-2xl transition-all duration-500 flex flex-col min-h-[420px]"
                  >
                    <div className="h-40 overflow-hidden relative bg-surface-container">
                      {imageUrl ? (
                        <>
                          <img
                            src={imageUrl}
                            alt={`${event.name} template preview`}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-on-lp-background/25 via-on-lp-background/5 to-transparent" />
                        </>
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${EVENT_GRADIENTS[idx % EVENT_GRADIENTS.length]}`} />
                      )}

                      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface">
                          {getEventCategoryLabel(event)}
                        </span>
                      </div>

                      <div className={`absolute top-4 right-4 ${status.badgeClass} backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2`}>
                        <span className={`w-2 h-2 rounded-full ${status.dotClass}`} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{status.label}</span>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary mb-1">
                            {formatEventDate(event.date)}
                          </p>
                          <h4 className="font-headline text-2xl text-on-surface line-clamp-2">{event.name}</h4>
                        </div>
                        <button
                          onClick={() => router.push(`/events/${event.id}`)}
                          disabled={!canCreateEvent}
                          aria-label={`Open ${event.name}`}
                          className="w-10 h-10 rounded-full border border-outline-variant/20 bg-white/75 text-on-surface-variant flex items-center justify-center transition-colors hover:text-brand hover:border-brand/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                          <span className="material-symbols-outlined text-base">arrow_outward</span>
                        </button>
                      </div>

                      <div className="space-y-2 text-on-surface-variant text-sm mb-5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">{status.icon}</span>
                          <span>{status.label === 'Past' ? 'Event completed' : `Scheduled for ${formatEventDate(event.date)}`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">{detailLine.icon}</span>
                          <span className="line-clamp-1">{detailLine.text}</span>
                        </div>
                      </div>

                      {/* <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3">
                        {event.description || 'Guest management, invitation design, and check-in flow are ready to customize from this event studio.'}
                      </p> */}

                      <div className="mt-auto pt-6 border-t border-outline-variant/10">
                        <div className="flex flex-wrap gap-2">
                          {eventPills.map((pill) => (
                            <span
                              key={`${event.id}-${pill}`}
                              className="inline-flex items-center rounded-full bg-surface-container px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
                            >
                              {pill}
                            </span>
                          ))}
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-4">
                          <button
                            onClick={() => handleDelete(event.id)}
                            disabled={!canCreateEvent}
                            className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant hover:text-tertiary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => router.push(`/events/${event.id}`)}
                            disabled={!canCreateEvent}
                            className="inline-flex items-center gap-2 text-sm font-bold text-brand transition-transform group-hover:translate-x-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0"
                          >
                            Manage Event
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] gap-8 lg:gap-10">
              <div className="bg-surface-container-low rounded-[2rem] p-8 border border-white/40">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-headline text-xl">{firstName}&apos;s Feed</h3>
                  <span className="material-symbols-outlined text-tertiary">bolt</span>
                </div>

                <div className="space-y-8">
                  <div className="flex gap-4 relative">
                    <div className="absolute left-4 top-10 bottom-[-2rem] w-px bg-outline-variant/30" />
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm z-10">
                      <span className="material-symbols-outlined text-sm text-brand" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <div>
                      <p className="text-sm text-on-surface font-medium">Events Active</p>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        You have <span className="text-on-surface font-semibold">{events.length}</span> event{events.length !== 1 ? 's' : ''} running.
                      </p>
                      <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-tighter mt-1 block">Just now</span>
                    </div>
                  </div>

                  <div className="flex gap-4 relative">
                    <div className="absolute left-4 top-10 bottom-[-2rem] w-px bg-outline-variant/30" />
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm z-10">
                      <span className="material-symbols-outlined text-sm text-warm" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
                    </div>
                    <div>
                      <p className="text-sm text-on-surface font-medium">Guest Count</p>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {stats?.total_invitations ?? 0} total invitations across all events.
                      </p>
                      <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-tighter mt-1 block">Today</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm z-10">
                      <span className="material-symbols-outlined text-sm text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_scanner</span>
                    </div>
                    <div>
                      <p className="text-sm text-on-surface font-medium">Check-ins</p>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {stats?.checked_in ?? 0} checked in · {stats?.pending ?? 0} pending.
                      </p>
                      <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-tighter mt-1 block">Live</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/40 p-6 sm:p-8 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-5">Quick Insights</p>
                  <div className="space-y-4">
                    <div className="bg-white/40 p-4 rounded-2xl flex items-center justify-between">
                      <span className="text-xs font-medium">Total Guests</span>
                      <span className="text-brand font-bold">{stats?.total_invitations ?? 0}</span>
                    </div>
                    <div className="bg-white/40 p-4 rounded-2xl flex items-center justify-between">
                      <span className="text-xs font-medium">Checked In</span>
                      <span className="text-tertiary font-bold">{stats?.checked_in ?? 0}</span>
                    </div>
                    <div className="bg-white/40 p-4 rounded-2xl flex items-center justify-between">
                      <span className="text-xs font-medium">Check-in Rate</span>
                      <span className="text-warm font-bold">{Math.round(stats?.check_in_rate ?? 0)}%</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FAB */}
      <button
        onClick={() => router.push('/events/new')}
        disabled={!user?.email_verified}
        className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 bg-on-lp-background text-lp-background w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
      >
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
  );
}
