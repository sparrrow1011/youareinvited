import Link from 'next/link';
import NavBar from '@/components/NavBar';
import PublicSiteFooter from '@/components/PublicSiteFooter';
import { GUIDE_CARDS } from '@/app/support/content';

const templateGuide = GUIDE_CARDS.find((guide) => guide.id === 'template-guide');

const DESIGN_PRINCIPLES = [
  {
    title: 'Keep the focal area clean',
    description: 'Leave enough visual breathing room where the guest name, tag, and QR will be placed so the final invitation does not look crowded.',
  },
  {
    title: 'Design for mobile first',
    description: 'Most guests will open the invitation on a phone, so small type, edge-heavy compositions, and low-contrast details tend to fail first.',
  },
  {
    title: 'Plan for dynamic content',
    description: 'Guest names vary in length. Design zones should work for short and long names without breaking the invitation balance.',
  },
] as const;

const AVOID_LIST = [
  'Tiny decorative type where guest details need to sit.',
  'Critical artwork or text too close to the image edges.',
  'Busy backgrounds directly behind the QR code placement area.',
  'Low-resolution uploads that become soft once invites are generated.',
] as const;

export default function TemplateDesignGuidePage() {
  if (!templateGuide) {
    throw new Error('Template guide content is missing.');
  }

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
              <span className="material-symbols-outlined text-sm text-brand">brush</span>
              Template Design Guide
            </div>
            <h1 className="font-headline text-5xl md:text-7xl leading-tight text-on-lp-background">
              Design invitation templates that still look refined after guest data is applied.
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl leading-relaxed text-on-surface-variant">
              A strong invitation background is not only beautiful. It also leaves room for dynamic guest details and a QR code to appear without breaking the composition.
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

        <section className="px-6 md:px-12 pb-10 max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)] gap-8 rounded-[2.75rem] border border-white/50 bg-white/70 p-8 md:p-10 shadow-sm backdrop-blur-xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand mb-3">Design intent</p>
              <h2 className="font-headline text-3xl md:text-4xl text-on-lp-background mb-4">
                Build the background with the final guest experience in mind.
              </h2>
              <p className="text-base md:text-lg leading-relaxed text-on-surface-variant">
                The template is the canvas, but the guest name, tag, and QR code are still part of the composition. The best invitation designs account for those elements from the beginning, not after the artwork is already locked.
              </p>
            </div>

            <div className="rounded-[2rem] bg-surface-container-low p-6 border border-outline-variant/10">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant mb-5">Core setup steps</p>
              <div className="space-y-3">
                {templateGuide.steps.map((step, index) => (
                  <div key={step} className="flex gap-4 rounded-2xl bg-white/70 border border-white/50 px-4 py-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white text-xs font-semibold">
                      {index + 1}
                    </div>
                    <p className="text-sm md:text-base leading-relaxed text-on-surface-variant">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 md:px-12 py-10 max-w-screen-2xl mx-auto">
          <div className="rounded-[2.5rem] border border-white/50 bg-white/70 p-8 md:p-10 shadow-sm backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand mb-3">Best practices</p>
            <h2 className="font-headline text-3xl md:text-4xl text-on-lp-background mb-8">
              The strongest templates are balanced, flexible, and readable after personalization.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {DESIGN_PRINCIPLES.map((item) => (
                <div key={item.title} className="rounded-[1.75rem] bg-surface-container-low border border-outline-variant/10 p-5">
                  <h3 className="font-headline text-2xl text-on-lp-background mb-3">{item.title}</h3>
                  <p className="text-sm md:text-base leading-relaxed text-on-surface-variant">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 md:px-12 py-10 max-w-screen-2xl mx-auto">
          <div className="rounded-[2.5rem] border border-white/50 bg-white/70 p-8 md:p-10 shadow-sm backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand mb-3">Avoid this</p>
            <h2 className="font-headline text-3xl md:text-4xl text-on-lp-background mb-8">
              Most template problems come from crowding the space where dynamic elements need to live.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {AVOID_LIST.map((item) => (
                <div key={item} className="rounded-[1.75rem] bg-surface-container-low border border-outline-variant/10 p-5 flex gap-4">
                  <span className="material-symbols-outlined text-warm mt-0.5">warning</span>
                  <p className="text-sm md:text-base leading-relaxed text-on-surface-variant">{item}</p>
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
                Upload a template that still looks composed after every guest is personalized.
              </h2>
              <p className="text-white/65 text-lg leading-relaxed mb-8">
                Design once with the right spacing and placement logic, then let the platform generate every invite cleanly from the same visual system.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-on-lp-background text-lg font-semibold transition-colors hover:bg-[#f0ece6]"
                >
                  Create Event
                </Link>
                <Link
                  href="/csv-import-guide"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-4 text-white text-lg font-semibold transition-colors hover:bg-white/8"
                >
                  Read CSV Guide
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
