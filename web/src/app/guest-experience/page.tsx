import Link from 'next/link';
import NavBar from '@/components/NavBar';
import PublicSiteFooter from '@/components/PublicSiteFooter';

const EXPERIENCE_STEPS = [
  {
    title: 'Receive a personal invitation',
    description:
      'Each guest gets a dedicated invite link with their own name, seat, tag, and event details already composed into the experience.',
  },
  {
    title: 'Open it on any device',
    description:
      'The invitation page is designed for mobile-first viewing, so guests can open, review, and present it without friction.',
  },
  {
    title: 'Arrive with confidence',
    description:
      'The same invite carries the QR path that supports venue verification, making arrival smoother for both guests and staff.',
  },
] as const;

const EXPERIENCE_VALUES = [
  {
    icon: 'contact_mail',
    title: 'Personalized by default',
    description: 'Names, seats, and guest tags are not afterthoughts. They are built directly into the invite experience.',
  },
  {
    icon: 'smartphone',
    title: 'Designed for mobile behavior',
    description: 'Guests can open the link, review their details, and use the QR without downloading an app.',
  },
  {
    icon: 'ios_share',
    title: 'Easy to forward and share',
    description: 'Invite links and WhatsApp-ready messaging help organizers distribute invites quickly without losing polish.',
  },
  {
    icon: 'photo_library',
    title: 'A lasting event memory',
    description: 'The invitation remains a preserved digital artifact, not just a disposable message before the event.',
  },
] as const;

const GUEST_MOMENTS = [
  'Personal invitation page with event-ready formatting',
  'Seat and guest tag visible without manual follow-up',
  'QR access ready for venue verification flow',
  'Shareable link experience that still feels premium',
] as const;

export default function GuestExperiencePage() {
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
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] gap-10 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-container/30 border border-brand-container/40 text-on-brand-container text-sm font-medium">
                <span className="material-symbols-outlined text-sm text-brand">celebration</span>
                Guest Experience
              </div>
              <h1 className="font-headline text-5xl md:text-7xl leading-tight text-on-lp-background">
                The invitation should already feel like part of the event.
              </h1>
              <p className="max-w-2xl text-lg md:text-xl leading-relaxed text-on-surface-variant">
                Guests do not just receive a link. They receive a polished, personal invitation experience that carries through from first open to venue arrival.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-4 text-white text-lg font-semibold shadow-lg transition-colors hover:bg-brand-dim"
                >
                  Create Your Event
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center justify-center rounded-full border border-outline-variant/20 bg-white/60 px-8 py-4 text-on-lp-background text-lg font-semibold backdrop-blur-sm transition-colors hover:border-brand/20 hover:text-brand"
                >
                  See the Workflow
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl relative z-10 bg-gradient-to-br from-brand-container/40 to-secondary-container/60">
                <img src="/img/lady_standing.jpg" alt="Guest invitation experience" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-8 -right-8 w-56 h-72 rounded-[2.5rem] bg-secondary-container -z-10 hidden md:block" />
              <div className="absolute -top-8 -left-8 w-56 h-56 rounded-full bg-brand-container/30 blur-3xl -z-10" />
            </div>
          </div>
        </section>

        <section className="px-6 md:px-12 pb-10 max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {EXPERIENCE_VALUES.map((item) => (
              <div
                key={item.title}
                className="rounded-[2rem] border border-white/50 bg-white/70 p-6 shadow-sm backdrop-blur-xl"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-container/35">
                  <span className="material-symbols-outlined text-brand">{item.icon}</span>
                </div>
                <h2 className="font-headline text-2xl text-on-lp-background mb-3">{item.title}</h2>
                <p className="text-sm leading-relaxed text-on-surface-variant">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 md:px-12 py-16 max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)] gap-8 rounded-[2.75rem] border border-white/50 bg-white/70 p-8 md:p-10 shadow-sm backdrop-blur-xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand mb-3">What guests feel</p>
              <h2 className="font-headline text-3xl md:text-4xl text-on-lp-background mb-4">
                Clear, elegant, and ready before they even arrive.
              </h2>
              <p className="text-base md:text-lg leading-relaxed text-on-surface-variant">
                A strong guest experience reduces confusion, improves attendance flow, and makes the event feel intentional from the very first interaction.
              </p>
            </div>

            <div className="rounded-[2rem] bg-surface-container-low p-6 border border-outline-variant/10">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant mb-5">Included in the experience</p>
              <ul className="space-y-4">
                {GUEST_MOMENTS.map((item) => (
                  <li key={item} className="flex gap-3 text-sm md:text-base text-on-surface-variant leading-relaxed">
                    <span className="material-symbols-outlined text-brand text-lg leading-5">check_circle</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="px-6 md:px-12 py-10 max-w-screen-2xl mx-auto">
          <div className="rounded-[2.5rem] border border-white/50 bg-white/70 p-8 md:p-10 shadow-sm backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand mb-3">Guest journey</p>
            <h2 className="font-headline text-3xl md:text-4xl text-on-lp-background mb-8">
              A better event starts with a better first interaction.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {EXPERIENCE_STEPS.map((step, index) => (
                <div key={step.title} className="rounded-[1.75rem] bg-surface-container-low border border-outline-variant/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-3">Step {index + 1}</p>
                  <h3 className="font-headline text-2xl text-on-lp-background mb-3">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-on-surface-variant">{step.description}</p>
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
                Give your guests an invite flow that already feels premium.
              </h2>
              <p className="text-white/65 text-lg leading-relaxed mb-8">
                Start your event, personalize the invitation experience, and make the first click feel like part of the occasion.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-on-lp-background text-lg font-semibold transition-colors hover:bg-[#f0ece6]"
                >
                  Create Event
                </Link>
                <Link
                  href="/features"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-4 text-white text-lg font-semibold transition-colors hover:bg-white/8"
                >
                  Explore Features
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
