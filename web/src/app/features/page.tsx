import Link from 'next/link';
import NavBar from '@/components/NavBar';
import PublicSiteFooter from '@/components/PublicSiteFooter';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Digital Invitation Features',
  description:
    'Explore YouAreInvited features for custom invitation templates, guest list management, WhatsApp sharing, QR check-in, and live event analytics.',
  path: '/features',
});

const FEATURE_PILLARS = [
  {
    eyebrow: 'Design And Branding',
    title: 'Invitation design that feels tailored, not templated.',
    description:
      'Upload your own invitation artwork, position the guest name, tag, and QR zones, and let the platform generate polished outputs for every attendee.',
    points: [
      'Upload custom backgrounds and map placement zones visually.',
      'Use organizer branding with optional event-surface display.',
      'Support both custom template invites and styled default themes.',
    ],
  },
  {
    eyebrow: 'Guest Operations',
    title: 'A cleaner guest workflow from import to share.',
    description:
      'Manage seats, guest tags, and invitation records in one flow. Import a guest list from CSV, edit guests individually, and distribute invites without breaking the event rhythm.',
    points: [
      'Bulk import guests with the platform CSV format.',
      'Generate one invitation record per guest with tracked assets.',
      'Use shareable invite links and WhatsApp-ready messaging.',
    ],
  },
  {
    eyebrow: 'Arrival Control',
    title: 'QR-based entry with real-time event visibility.',
    description:
      'Every invitation carries a unique QR path for staff check-in. Hosts can track attendance, monitor arrivals, and keep the venue entrance organized without paper lists.',
    points: [
      'Security PIN flow keeps check-in access staff-only.',
      'Each guest has a dedicated QR verification path.',
      'Live analytics help organizers monitor attendance momentum.',
    ],
  },
] as const;

const FEATURE_CARDS = [
  {
    icon: 'palette',
    title: 'Custom invitation templates',
    description: 'Bring your own invitation art and map each guest detail precisely where it should appear.',
  },
  {
    icon: 'group',
    title: 'Guest list management',
    description: 'Add guests manually or import them in bulk with seat numbers and guest tags included.',
  },
  {
    icon: 'qr_code_2',
    title: 'Unique QR per guest',
    description: 'Every invitation gets its own QR route so venue staff can verify arrivals without confusion.',
  },
  {
    icon: 'share',
    title: 'Share-ready invite flow',
    description: 'Distribute invite links and WhatsApp messages without losing personalization or structure.',
  },
  {
    icon: 'monitoring',
    title: 'Live event analytics',
    description: 'Track invitation progress, check-ins, and event movement in one operational view.',
  },
  {
    icon: 'shield_lock',
    title: 'Protected staff access',
    description: 'Separate the guest experience from the security workflow with PIN-gated check-in access.',
  },
] as const;

const USE_CASES = [
  'Birthdays and milestone celebrations',
  'Weddings and private ceremonies',
  'Corporate dinners and VIP gatherings',
  'Venue-managed guest check-in operations',
] as const;

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-lp-background text-on-surface font-body overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-20 -left-20 h-[520px] w-[520px] rounded-full bg-brand/10 blur-[140px]" />
        <div className="absolute top-1/4 -right-20 h-[420px] w-[420px] rounded-full bg-tertiary/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-secondary-container/20 blur-[120px]" />
      </div>

      <NavBar />

      <main className="relative z-10 pt-28">
        <section className="px-6 md:px-12 py-20 max-w-screen-2xl mx-auto">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-container/30 border border-brand-container/40 text-on-brand-container text-sm font-medium">
              <span className="material-symbols-outlined text-sm text-brand">auto_awesome</span>
              Product Features
            </div>
            <h1 className="font-headline text-5xl md:text-7xl leading-tight text-on-lp-background">
              Everything needed to design, send, verify, and track one seamless event flow.
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl leading-relaxed text-on-surface-variant">
              YouAreInvited is built for organizers who want the invitation moment, the guest experience, and the arrival operation to feel like one polished system.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-4 text-white text-lg font-semibold shadow-lg transition-colors hover:bg-brand-dim"
              >
                Create Your Event
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center justify-center rounded-full border border-outline-variant/20 bg-white/60 px-8 py-4 text-on-lp-background text-lg font-semibold backdrop-blur-sm transition-colors hover:border-brand/20 hover:text-brand"
              >
                Explore Support
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 md:px-12 pb-10 max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {FEATURE_CARDS.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[2rem] border border-white/50 bg-white/70 p-6 shadow-sm backdrop-blur-xl"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-container/35">
                  <span className="material-symbols-outlined text-brand">{feature.icon}</span>
                </div>
                <h2 className="font-headline text-2xl text-on-lp-background mb-3">{feature.title}</h2>
                <p className="text-sm leading-relaxed text-on-surface-variant">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 md:px-12 py-16 max-w-screen-2xl mx-auto">
          <div className="space-y-8">
            {FEATURE_PILLARS.map((pillar, index) => (
              <div
                key={pillar.title}
                className={`grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)] gap-8 rounded-[2.5rem] border border-white/50 bg-white/70 p-8 md:p-10 shadow-sm backdrop-blur-xl ${
                  index % 2 === 1 ? 'xl:grid-cols-[minmax(280px,0.75fr)_minmax(0,1fr)]' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'xl:order-2' : ''}>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand mb-3">{pillar.eyebrow}</p>
                  <h2 className="font-headline text-3xl md:text-4xl text-on-lp-background mb-4">{pillar.title}</h2>
                  <p className="text-base md:text-lg leading-relaxed text-on-surface-variant">{pillar.description}</p>
                </div>

                <div className={index % 2 === 1 ? 'xl:order-1' : ''}>
                  <div className="rounded-[2rem] bg-surface-container-low p-6 h-full border border-outline-variant/10">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant mb-5">Included in this flow</p>
                    <ul className="space-y-4">
                      {pillar.points.map((point) => (
                        <li key={point} className="flex gap-3 text-sm md:text-base text-on-surface-variant leading-relaxed">
                          <span className="material-symbols-outlined text-brand text-lg leading-5">check_circle</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 md:px-12 py-10 max-w-screen-2xl mx-auto">
          <div className="rounded-[2.5rem] border border-white/50 bg-white/70 p-8 md:p-10 shadow-sm backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand mb-3">Best fit</p>
            <h2 className="font-headline text-3xl md:text-4xl text-on-lp-background mb-6">
              Built for events where presentation and control both matter.
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {USE_CASES.map((useCase) => (
                <div key={useCase} className="rounded-[1.5rem] bg-surface-container-low border border-outline-variant/10 px-5 py-5 text-sm text-on-surface-variant">
                  {useCase}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 md:px-12 py-20 max-w-screen-2xl mx-auto">
          <div className="relative overflow-hidden rounded-[3rem] bg-[#171310] px-8 py-16 md:px-12 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(214,178,132,0.24),rgba(214,178,132,0.08)_22%,rgba(23,19,16,0)_52%)]" />
            <div className="absolute inset-0 opacity-[0.06] bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.18)_0px,rgba(255,255,255,0.18)_1px,transparent_1px,transparent_3px)]" />
            <div className="relative z-10 max-w-3xl mx-auto">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55 mb-3">Start now</p>
              <h2 className="font-headline text-4xl md:text-6xl text-white leading-tight mb-5">
                Turn your event workflow into one polished experience.
              </h2>
              <p className="text-white/65 text-lg leading-relaxed mb-8">
                Start with the invitation, carry the same polish through guest sharing, and arrive at the venue with a check-in flow that still feels premium.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-on-lp-background text-lg font-semibold transition-colors hover:bg-[#f0ece6]"
                >
                  Create Event
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-4 text-white text-lg font-semibold transition-colors hover:bg-white/8"
                >
                  Back Home
                </Link>
              </div>
            </div>
          </div>
        </section>

        <PublicSiteFooter className="pt-0 border-t-0" />
      </main>
    </div>
  );
}
