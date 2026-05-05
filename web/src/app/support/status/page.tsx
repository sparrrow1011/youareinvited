import Link from 'next/link';
import PublicSiteFooter from '@/components/PublicSiteFooter';

const STATUS_ITEMS = [
  {
    name: 'Organizer Web App',
    status: 'Operational',
    tone: 'brand',
    note: 'Dashboard, event editing, and invitation pages are available.',
  },
  {
    name: 'Authentication & API',
    status: 'Operational',
    tone: 'brand',
    note: 'Login, event loading, and guest actions are responding normally.',
  },
  {
    name: 'QR / Check-In Flow',
    status: 'Operational',
    tone: 'brand',
    note: 'Security PIN, QR routing, and guest check-in are available.',
  },
  {
    name: 'Media Generation',
    status: 'Monitoring',
    tone: 'warm',
    note: 'Template uploads and generated invite assets are being watched closely.',
  },
];

const INCIDENTS = [
  {
    title: 'No active incidents reported',
    detail: 'This board is updated manually by our team whenever there is an important service change.',
  },
  {
    title: 'Deployment checks recommended',
    detail: 'Before a live event, test one sample invitation, confirm the QR flow, and make sure your staff check-in access is ready.',
  },
];

const statusToneClasses: Record<string, string> = {
  brand: 'bg-brand-container/30 text-brand',
  warm: 'bg-secondary-container/40 text-on-surface',
};

export default function SupportStatusPage() {
  return (
    <div className="min-h-screen bg-lp-background text-on-surface font-body">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-24 -left-20 w-[520px] h-[520px] rounded-full bg-brand/10 blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[480px] h-[480px] rounded-full bg-tertiary/10 blur-[120px]" />
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand mb-2">System Status</p>
            <h1 className="font-headline text-4xl sm:text-5xl text-on-lp-background">Organizer platform status</h1>
            <p className="text-sm sm:text-base text-on-surface-variant mt-4 max-w-2xl">
              A quick manual status overview for organizers before sending invites or opening event-day check-in.
            </p>
          </div>

          <Link
            href="/support"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/70 border border-white/60 text-sm font-semibold text-on-surface shadow-sm"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Support
          </Link>
        </div>

        <div className="rounded-[2rem] bg-on-lp-background text-white p-6 sm:p-8 mb-8">
          <p className="text-xs uppercase tracking-[0.24em] text-white/60 mb-3">Current Summary</p>
          <h2 className="font-headline text-3xl mb-2">All core organizer services are available.</h2>
          <p className="text-sm text-white/70 max-w-2xl">
            Treat this as a simple readiness board for upcoming events. If you need extra help before a live event, contact support.
          </p>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {STATUS_ITEMS.map((item) => (
            <div key={item.name} className="rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white/50 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-lg font-semibold text-on-lp-background">{item.name}</p>
                  <p className="text-sm text-on-surface-variant mt-2">{item.note}</p>
                </div>
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${statusToneClasses[item.tone]}`}>
                  <span className="w-2 h-2 rounded-full bg-current" />
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] bg-surface-container-low border border-white/40 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand mb-2">Notes</p>
          <h2 className="font-headline text-3xl text-on-lp-background mb-6">Recent updates</h2>

          <div className="space-y-4">
            {INCIDENTS.map((incident) => (
              <div key={incident.title} className="rounded-3xl bg-white/70 border border-white/50 p-5">
                <p className="font-semibold text-on-lp-background">{incident.title}</p>
                <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{incident.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <PublicSiteFooter className="pt-12 border-t-0" />
      </main>
    </div>
  );
}
