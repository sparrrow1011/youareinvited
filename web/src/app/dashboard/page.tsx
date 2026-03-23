'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { eventService, authService, invitationService, Event, InvitationStats } from '@/lib/api';

const NAV_LINKS = [
  { icon: 'dashboard', label: 'Dashboard', href: '/dashboard', active: true },
  { icon: 'group', label: 'Guest List', href: '#' },
  { icon: 'brush', label: 'Design Studio', href: '/events/new' },
  { icon: 'card_giftcard', label: 'Registry', href: '#' },
  { icon: 'leaderboard', label: 'Analytics', href: '#' },
];

const EVENT_GRADIENTS = [
  'from-brand-container/40 to-secondary-container/60',
  'from-secondary-container/40 to-tertiary-container/40',
  'from-tertiary-container/30 to-brand-container/30',
  'from-brand-container/30 to-tertiary-container/20',
];

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      eventService.getAll(),
      invitationService.getStats(),
    ])
      .then(([evs, st]) => { setEvents(evs); setStats(st); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    router.push('/login');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event and all its invitations?')) return;
    await eventService.delete(id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="bg-lp-background font-body text-on-surface min-h-screen">
      {/* Aurora background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-brand/10 blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-tertiary/10 blur-[150px]" />
      </div>

      {/* ── Sidebar ── */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-low flex flex-col py-8 z-40">
        {/* Logo */}
        <div className="px-8 mb-10">
          <Link href="/" className="text-xl font-headline italic text-tertiary">
            YouAreInvited
          </Link>
        </div>

        {/* User profile */}
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 bg-white/50 p-3 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
              <span
                className="material-symbols-outlined text-warm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                person
              </span>
            </div>
            <div>
              <p className="text-sm font-medium tracking-tight text-on-surface">The Curator</p>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Premium Organizer</p>
            </div>
          </div>
        </div>

        {/* Nav */}
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
              <span
                className="material-symbols-outlined"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {icon}
              </span>
              <span className="text-sm font-medium tracking-tight">{label}</span>
            </Link>
          ))}
        </nav>

        {/* New Event CTA */}
        <div className="px-6 pt-4">
          <button
            onClick={() => router.push('/events/new')}
            className="w-full bg-brand text-white py-3 rounded-full font-medium shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm"
          >
            + New Event
          </button>
        </div>

        {/* Bottom links */}
        <div className="mt-6 space-y-1 border-t border-outline-variant/10 pt-4">
          <a href="#" className="text-on-surface-variant py-2 pl-8 hover:translate-x-1 transition-transform flex items-center gap-3 hover:text-brand">
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-medium tracking-tight">Settings</span>
          </a>
          <a href="#" className="text-on-surface-variant py-2 pl-8 hover:translate-x-1 transition-transform flex items-center gap-3 hover:text-brand">
            <span className="material-symbols-outlined">help</span>
            <span className="text-sm font-medium tracking-tight">Support</span>
          </a>
          <button
            onClick={handleLogout}
            className="w-full text-left text-on-surface-variant py-2 pl-8 hover:translate-x-1 transition-transform flex items-center gap-3 hover:text-brand"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm font-medium tracking-tight">Log out</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ml-64 min-h-screen relative z-10">
        {/* Top bar */}
        <header className="h-20 px-12 flex items-center justify-between sticky top-0 z-30 bg-lp-background/60 backdrop-blur-md border-b border-outline-variant/10">
          <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-full w-96 border border-outline-variant/10">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">search</span>
            <input
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-on-surface-variant/60"
              placeholder="Search events or guests..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-on-surface-variant hover:text-brand transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-tertiary rounded-full" />
            </button>
            <div className="h-8 w-px bg-outline-variant/20" />
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-container to-secondary-container border-2 border-brand/20 group-hover:border-brand transition-all" />
              <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
            </div>
          </div>
        </header>

        <section className="px-12 py-10 max-w-7xl mx-auto">
          {/* Greeting */}
          <div className="mb-12">
            <h2 className="font-headline text-4xl font-light tracking-tight text-on-surface mb-2">
              Welcome back, <span className="italic font-normal">Curator.</span>
            </h2>
            <p className="text-on-surface-variant">Your digital gala is flourishing. Here is your overview.</p>
          </div>

          {/* Stats bento */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
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

          {/* Two-col: events + feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Events list */}
            <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline text-2xl font-normal">My Events</h3>
                <button
                  onClick={() => router.push('/events/new')}
                  className="text-sm font-medium text-brand hover:underline underline-offset-4"
                >
                  + New Event
                </button>
              </div>

              {loading && (
                <p className="text-on-surface-variant text-sm">Loading events…</p>
              )}

              {!loading && events.length === 0 && (
                <div className="text-center py-16 bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10">
                  <p className="text-on-surface-variant mb-4">No events yet.</p>
                  <button
                    onClick={() => router.push('/events/new')}
                    className="px-6 py-3 bg-brand text-white rounded-full font-semibold text-sm"
                  >
                    Create Your First Event
                  </button>
                </div>
              )}

              {events.map((event, idx) => (
                <div
                  key={event.id}
                  className="group relative bg-surface-container-lowest rounded-[2rem] overflow-hidden shadow-[0_12px_40px_rgba(47,51,54,0.03)] transition-all hover:shadow-[0_20px_60px_rgba(47,51,54,0.06)]"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Gradient image placeholder */}
                    <div
                      className={`md:w-2/5 h-48 md:h-auto min-h-[160px] bg-gradient-to-br ${EVENT_GRADIENTS[idx % EVENT_GRADIENTS.length]}`}
                    />
                    <div className="md:w-3/5 p-8 flex flex-col justify-between">
                      <div>
                        <div className="mb-4">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-brand bg-brand-container/30 px-3 py-1 rounded-full">
                            {event.date}
                          </span>
                        </div>
                        <h4 className="font-headline text-2xl mb-2 text-on-surface">{event.name}</h4>
                        {event.description && (
                          <p className="text-on-surface-variant text-sm leading-relaxed">{event.description}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-6 border-t border-outline-variant/10 mt-6">
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="text-xs text-on-surface-variant hover:text-tertiary transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => router.push(`/events/${event.id}`)}
                          className="flex items-center text-brand font-bold text-sm group-hover:translate-x-1 transition-transform"
                        >
                          Manage Event <span className="material-symbols-outlined ml-1">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Curator's Feed */}
            <div className="lg:col-span-1">
              <div className="bg-surface-container-low rounded-[2rem] p-8 border border-white/40">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-headline text-xl">Curator&apos;s Feed</h3>
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

                <div className="mt-16 pt-8 border-t border-outline-variant/20">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-4">Quick Insights</p>
                  <div className="space-y-4">
                    <div className="bg-white/40 p-4 rounded-2xl flex items-center justify-between">
                      <span className="text-xs font-medium">Total Guests</span>
                      <span className="text-brand font-bold">{stats?.total_invitations ?? 0}</span>
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
        className="fixed bottom-8 right-8 bg-on-lp-background text-lp-background w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50"
      >
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
  );
}
