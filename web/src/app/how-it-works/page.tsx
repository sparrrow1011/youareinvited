import Link from 'next/link';
import HeroScroll from '@/components/HeroScroll';
import NavBar from '@/components/NavBar';
import PublicSiteFooter from '@/components/PublicSiteFooter';

const WORKFLOW_BENEFITS = [
  {
    title: 'One flow, not five disconnected tools',
    description:
      'The invitation, guest list, QR access, check-in path, and dashboard all stay tied to the same event structure.',
  },
  {
    title: 'Built for hosts and event teams',
    description:
      'Organizers stay in control, guests receive a polished invite experience, and venue staff get a practical check-in flow.',
  },
  {
    title: 'Designed to feel premium from the first click',
    description:
      'The system is not just operational. It is designed so the invitation moment already reflects the quality of the event itself.',
  },
] as const;

export default function HowItWorksPage() {
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
              <span className="material-symbols-outlined text-sm text-brand">flowchart</span>
              Workflow Overview
            </div>
            <h1 className="font-headline text-5xl md:text-7xl leading-tight text-on-lp-background">
              See how the platform moves from event setup to guest arrival without breaking the experience.
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl leading-relaxed text-on-surface-variant">
              YouAreInvited is built so the creative side of the invitation and the operational side of guest management stay connected from start to finish.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-4 text-white text-lg font-semibold shadow-lg transition-colors hover:bg-brand-dim"
              >
                Create Your Event
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center justify-center rounded-full border border-outline-variant/20 bg-white/60 px-8 py-4 text-on-lp-background text-lg font-semibold backdrop-blur-sm transition-colors hover:border-brand/20 hover:text-brand"
              >
                Explore Features
              </Link>
            </div>
          </div>
        </section>

        <HeroScroll />

        <section className="px-6 md:px-12 py-10 max-w-screen-2xl mx-auto">
          <div className="rounded-[2.5rem] border border-white/50 bg-white/70 p-8 md:p-10 shadow-sm backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand mb-3">Why this flow works</p>
            <h2 className="font-headline text-3xl md:text-4xl text-on-lp-background mb-8">
              The invitation experience and the event operation should feel like one system.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {WORKFLOW_BENEFITS.map((benefit) => (
                <div key={benefit.title} className="rounded-[1.75rem] bg-surface-container-low border border-outline-variant/10 p-5">
                  <h3 className="font-headline text-2xl text-on-lp-background mb-3">{benefit.title}</h3>
                  <p className="text-sm leading-relaxed text-on-surface-variant">{benefit.description}</p>
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55 mb-3">Next step</p>
              <h2 className="font-headline text-4xl md:text-6xl text-white leading-tight mb-5">
                Put the workflow to work on a real event.
              </h2>
              <p className="text-white/65 text-lg leading-relaxed mb-8">
                Start your event, build the invitation flow, and test the full guest journey before event day.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-on-lp-background text-lg font-semibold transition-colors hover:bg-[#f0ece6]"
                >
                  Create Event
                </Link>
                <Link
                  href="/support"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-4 text-white text-lg font-semibold transition-colors hover:bg-white/8"
                >
                  Visit Support
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
