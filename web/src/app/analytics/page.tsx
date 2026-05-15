'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthUser,
  InvitationAnalytics,
  authService,
  invitationService,
  resolveMediaUrl,
} from '@/lib/api';
import OrganizerWorkspaceHeader from '@/components/OrganizerWorkspaceHeader';
import OrganizerWorkspaceSidebar from '@/components/OrganizerWorkspaceSidebar';
import VerificationBanner from '@/components/VerificationBanner';

const NAV_LINKS = [
  { icon: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  // { icon: 'group', label: 'Guest List', href: '#' },
  { icon: 'leaderboard', label: 'Analytics', href: '/analytics', active: true },
];

const getPlanLabel = (plan?: AuthUser['plan']) => (
  plan === 'pro' ? 'Pro Organizer' : 'Free Organizer'
);

const formatPercent = (value: number) => `${Math.round(value)}%`;

const formatEventDate = (value: string) => {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

type MetricCardProps = {
  label: string;
  value: string | number;
  accent: string;
  icon: string;
  detail: string;
};

function MetricCard({ label, value, accent, icon, detail }: MetricCardProps) {
  return (
    <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/40 shadow-sm relative overflow-hidden">
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full blur-2xl ${accent}`} />
      <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-4">{label}</p>
      <div className="flex items-end justify-between gap-4">
        <span className="font-headline text-3xl font-bold text-on-surface">{value}</span>
        <span className="material-symbols-outlined text-brand">{icon}</span>
      </div>
      <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">{detail}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [analytics, setAnalytics] = useState<InvitationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      authService.me(),
      invitationService.getAnalytics(),
    ])
      .then(([me, overview]) => {
        setUser(me);
        setAnalytics(overview);
      })
      .catch(() => setError('Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    router.push('/login');
  };

  const handleExport = async () => {
    setExporting(true);
    setError('');

    try {
      const blob = await invitationService.exportAnalytics();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'youareinvited-analytics-report.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export analytics.');
    } finally {
      setExporting(false);
    }
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

  const topTagMax = useMemo(() => (
    analytics?.tag_breakdown.length
      ? Math.max(...analytics.tag_breakdown.map((item) => item.count))
      : 1
  ), [analytics?.tag_breakdown]);

  const peakHourMax = useMemo(() => (
    analytics?.peak_check_in_times.length
      ? Math.max(...analytics.peak_check_in_times.map((item) => item.count))
      : 1
  ), [analytics?.peak_check_in_times]);

  if (loading) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <p className="text-sm text-on-surface-variant">Loading analytics…</p>
        </div>
      </div>
    );
  }

  if (!analytics || !user) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-tertiary text-sm">{error || 'Unable to load analytics.'}</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 mt-4 text-brand font-semibold">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const hasInvitations = analytics.totals.invitations_sent > 0;

  return (
    <div className="bg-lp-background font-body text-on-surface min-h-screen">
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
            onClick={handleExport}
            disabled={exporting}
            className="w-full bg-brand text-white py-3 rounded-full font-medium shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm disabled:opacity-60"
          >
            {exporting ? 'Exporting…' : 'Export Report'}
          </button>
        )}
        secondaryActions={[
          { icon: 'settings', label: 'Settings', href: '/settings' },
          { icon: 'help', label: 'Support', href: '/support' },
          { icon: 'logout', label: 'Log out', onClick: handleLogout },
        ]}
      />

      <main className="ml-0 lg:ml-64 min-h-screen relative z-10">
        <OrganizerWorkspaceHeader navLinks={NAV_LINKS}>
          <div className="px-4 sm:px-6 lg:px-12 py-4 lg:h-20 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between lg:hidden">
              <Link href="/" className="text-lg font-headline italic text-tertiary">
                YouAreInvited
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="px-4 py-2 rounded-full bg-brand text-white text-xs font-semibold shadow-lg shadow-brand/20 disabled:opacity-60"
                >
                  {exporting ? 'Exporting…' : 'Export'}
                </button>
                <Link href="/settings" className="p-2 rounded-full bg-surface-container-low text-on-surface-variant" aria-label="Settings">
                  <span className="material-symbols-outlined text-base">settings</span>
                </Link>
                <Link href="/support" className="p-2 rounded-full bg-surface-container-low text-on-surface-variant" aria-label="Support">
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
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-brand font-semibold">Organizer Analytics</p>
              <h1 className="font-headline text-2xl sm:text-3xl text-on-surface mt-1">Invites, opens, shares, and arrivals</h1>
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-base">download</span>
                {exporting ? 'Exporting…' : 'Export CSV'}
              </button>
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
          <div className="mb-8 lg:mb-10">
            <h2 className="font-headline text-3xl sm:text-4xl font-light tracking-tight text-on-surface mb-2">
              {firstName}, here&apos;s how guests are moving through your events.
            </h2>
            <p className="text-sm sm:text-base text-on-surface-variant max-w-3xl">
              Track invitation volume, actual opens, sharing behavior, arrivals, and which events are converting best from invite to check-in.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-tertiary/15 bg-tertiary-container/20 px-4 py-3 text-sm text-tertiary">
              {error}
            </div>
          )}

          {analytics.warning && (
            <div className="mb-6 rounded-2xl border border-tertiary/15 bg-tertiary-container/20 px-4 py-3 text-sm text-tertiary">
              {analytics.warning}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-10 lg:mb-12">
            <MetricCard
              label="Invitations Sent"
              value={analytics.totals.invitations_sent}
              accent="bg-brand/10"
              icon="mail"
              detail={`${analytics.totals.total_events} active event${analytics.totals.total_events === 1 ? '' : 's'} in the current workspace.`}
            />
            <MetricCard
              label="Invitation Opens"
              value={analytics.totals.invitation_opens}
              accent="bg-secondary/10"
              icon="visibility"
              detail={`${analytics.totals.viewed_invitations} unique invitation${analytics.totals.viewed_invitations === 1 ? '' : 's'} have been viewed.`}
            />
            <MetricCard
              label="Shares"
              value={analytics.totals.total_shares}
              accent="bg-tertiary/10"
              icon="share"
              detail={`${analytics.totals.whatsapp_shares} WhatsApp and ${analytics.totals.link_shares} link shares recorded.`}
            />
            <MetricCard
              label="Check-In Rate"
              value={formatPercent(analytics.totals.check_in_rate)}
              accent="bg-warm/10"
              icon="how_to_reg"
              detail={`${analytics.totals.checked_in} checked in and ${analytics.totals.pending} still pending.`}
            />
          </div>

          {!hasInvitations ? (
            <div className="rounded-[2rem] border border-white/50 bg-white/70 backdrop-blur-xl p-8 sm:p-10 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-container/30 text-brand">
                <span className="material-symbols-outlined text-3xl">analytics</span>
              </div>
              <h3 className="font-headline text-2xl text-on-surface mb-3">No invitation analytics yet</h3>
              <p className="text-sm text-on-surface-variant max-w-xl mx-auto mb-6">
                Add guests to your events and share invitation links first. Analytics start filling in as people open invites, share them, and get checked in at the venue.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/events/new" className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white">
                  <span className="material-symbols-outlined text-base">event_available</span>
                  Create Event
                </Link>
                <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-white/70 px-5 py-3 text-sm font-semibold text-on-surface">
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Back to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6 lg:gap-8 mb-10 lg:mb-12">
                <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/50 p-6 sm:p-8 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Conversion Funnel</p>
                  <h3 className="font-headline text-2xl text-on-lp-background mb-6">Created to arrived</h3>

                  <div className="space-y-4">
                    {[
                      { label: 'Invitations created', value: analytics.funnel.created, rate: 100 },
                      { label: 'Invitations viewed', value: analytics.funnel.viewed, rate: analytics.totals.view_rate },
                      { label: 'Guests arrived', value: analytics.funnel.arrived, rate: analytics.totals.check_in_rate },
                    ].map((step) => (
                      <div key={step.label} className="rounded-3xl border border-outline-variant/10 bg-surface-container-low p-4">
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <p className="text-sm font-semibold text-on-lp-background">{step.label}</p>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-on-lp-background">{step.value}</p>
                            <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">{formatPercent(step.rate)}</p>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-white/80 overflow-hidden">
                          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(step.rate, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/50 p-6 sm:p-8 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Guest Status</p>
                    <h3 className="font-headline text-2xl text-on-lp-background mb-5">Pending vs checked-in guests</h3>
                    <div className="space-y-4">
                      {[
                        {
                          label: 'Checked in',
                          value: analytics.guest_status.checked_in,
                          total: analytics.totals.invitations_sent,
                          bar: 'bg-brand',
                        },
                        {
                          label: 'Pending',
                          value: analytics.guest_status.pending,
                          total: analytics.totals.invitations_sent,
                          bar: 'bg-tertiary',
                        },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <p className="text-sm font-semibold text-on-lp-background">{item.label}</p>
                            <p className="text-sm text-on-surface-variant">{item.value}</p>
                          </div>
                          <div className="h-2 rounded-full bg-surface-container overflow-hidden">
                            <div className={`h-full rounded-full ${item.bar}`} style={{ width: `${item.total ? (item.value / item.total) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/50 p-6 sm:p-8 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Peak Check-In Times</p>
                    <h3 className="font-headline text-2xl text-on-lp-background mb-5">Busiest arrival windows</h3>
                    <div className="space-y-3">
                      {analytics.peak_check_in_times.length > 0 ? analytics.peak_check_in_times.map((slot) => (
                        <div key={slot.hour} className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-4">
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <p className="text-sm font-semibold text-on-lp-background">{slot.label}</p>
                            <p className="text-sm text-on-surface-variant">{slot.count} arrivals</p>
                          </div>
                          <div className="h-2 rounded-full bg-white/80 overflow-hidden">
                            <div className="h-full rounded-full bg-tertiary" style={{ width: `${peakHourMax ? (slot.count / peakHourMax) * 100 : 0}%` }} />
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-4 text-sm text-on-surface-variant">
                          Check-in activity will appear here once guests start arriving.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8 mb-10 lg:mb-12">
                <section className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/50 p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Event Comparison</p>
                      <h3 className="font-headline text-2xl text-on-lp-background">Which events are converting best</h3>
                    </div>
                    <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">{analytics.event_comparison.length} event{analytics.event_comparison.length === 1 ? '' : 's'}</p>
                  </div>

                  <div className="md:hidden space-y-3">
                    {analytics.event_comparison.map((row) => (
                      <div key={row.event_id} className="rounded-3xl border border-outline-variant/10 bg-surface-container-low p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-on-lp-background">{row.event_name}</p>
                            <p className="text-xs text-on-surface-variant mt-1">{formatEventDate(row.event_date)}</p>
                          </div>
                          <Link href={`/events/${row.event_id}`} className="text-brand">
                            <span className="material-symbols-outlined text-base">north_east</span>
                          </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">Sent</p>
                            <p className="text-sm font-semibold text-on-lp-background">{row.invitations_sent}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">Opened</p>
                            <p className="text-sm font-semibold text-on-lp-background">{row.viewed_invitations}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">Shares</p>
                            <p className="text-sm font-semibold text-on-lp-background">{row.total_shares}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">Arrived</p>
                            <p className="text-sm font-semibold text-on-lp-background">{row.checked_in}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <div className="rounded-2xl bg-white/70 px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">View rate</p>
                            <p className="text-sm font-semibold text-on-lp-background">{formatPercent(row.view_rate)}</p>
                          </div>
                          <div className="rounded-2xl bg-white/70 px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">Check-in rate</p>
                            <p className="text-sm font-semibold text-on-lp-background">{formatPercent(row.check_in_rate)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto rounded-3xl border border-outline-variant/10">
                    <table className="w-full min-w-[860px] text-sm">
                      <thead className="bg-surface-container-low">
                        <tr className="border-b border-outline-variant/10">
                          {['Event', 'Sent', 'Opened', 'Opens', 'Shares', 'Arrived', 'View Rate', 'Check-In Rate'].map((heading) => (
                            <th key={heading} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10 bg-white/50">
                        {analytics.event_comparison.map((row) => (
                          <tr key={row.event_id}>
                            <td className="px-5 py-4">
                              <div>
                                <Link href={`/events/${row.event_id}`} className="font-semibold text-on-lp-background hover:text-brand transition-colors">
                                  {row.event_name}
                                </Link>
                                <p className="text-xs text-on-surface-variant mt-1">{formatEventDate(row.event_date)}</p>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-on-surface">{row.invitations_sent}</td>
                            <td className="px-5 py-4 text-on-surface">{row.viewed_invitations}</td>
                            <td className="px-5 py-4 text-on-surface">{row.invitation_opens}</td>
                            <td className="px-5 py-4 text-on-surface">{row.total_shares}</td>
                            <td className="px-5 py-4 text-on-surface">{row.checked_in}</td>
                            <td className="px-5 py-4 text-on-surface">{formatPercent(row.view_rate)}</td>
                            <td className="px-5 py-4 text-on-surface">{formatPercent(row.check_in_rate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/50 p-6 sm:p-8 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Guest Categories</p>
                  <h3 className="font-headline text-2xl text-on-lp-background mb-5">Tag and category breakdown</h3>

                  <div className="space-y-3">
                    {analytics.tag_breakdown.length > 0 ? analytics.tag_breakdown.map((tag) => (
                      <div key={tag.tag} className="rounded-3xl border border-outline-variant/10 bg-surface-container-low p-4">
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <div>
                            <p className="text-sm font-semibold text-on-lp-background">{tag.tag}</p>
                            <p className="text-xs text-on-surface-variant mt-1">
                              {tag.checked_in} checked in · {tag.pending} pending
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-on-lp-background">{tag.count}</p>
                            <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">{formatPercent(tag.check_in_rate)}</p>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-white/80 overflow-hidden">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${topTagMax ? (tag.count / topTagMax) * 100 : 0}%` }} />
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-4 text-sm text-on-surface-variant">
                        Category analytics will appear once your invitations include guest tags.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
