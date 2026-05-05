import Link from 'next/link';
import { notFound } from 'next/navigation';
import NavBar from '@/components/NavBar';
import PublicSiteFooter from '@/components/PublicSiteFooter';
import ThemeRenderer from '@/components/ThemeRenderer';
import { THEMES, getTheme } from '@/themes';
import { getThemeSampleProps } from '@/themes/samples';

export function generateStaticParams() {
  return THEMES.map((theme) => ({ id: theme.id }));
}

export default function TemplatePreviewPage({ params }: { params: { id: string } }) {
  const theme = getTheme(params.id);
  const sampleProps = getThemeSampleProps(params.id);

  if (!theme || !sampleProps) {
    notFound();
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
        <section className="px-6 md:px-12 py-16 max-w-screen-2xl mx-auto">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-container/30 border border-brand-container/40 text-on-brand-container text-sm font-medium">
              <span className="material-symbols-outlined text-sm text-brand">preview</span>
              Public Theme Preview
            </div>
            <h1 className="font-headline text-5xl md:text-7xl leading-tight text-on-lp-background">
              {theme.name}
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl leading-relaxed text-on-surface-variant">
              {theme.description}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/templates"
                className="inline-flex items-center justify-center rounded-full border border-outline-variant/20 bg-white/60 px-8 py-4 text-on-lp-background text-lg font-semibold backdrop-blur-sm transition-colors hover:border-brand/20 hover:text-brand"
              >
                Back to Templates
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-4 text-white text-lg font-semibold shadow-lg transition-colors hover:bg-brand-dim"
              >
                Create Event
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 md:px-12 pb-20 max-w-screen-2xl mx-auto">
          <div className="rounded-[2.5rem] border border-white/50 bg-white/70 p-6 md:p-10 shadow-sm backdrop-blur-xl">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-10 items-start">
              <div className="mx-auto w-full max-w-[390px]">
                <ThemeRenderer themeId={theme.id} props={sampleProps} />
              </div>

              <div className="space-y-6">
                <div className="rounded-[1.75rem] bg-surface-container-low border border-outline-variant/10 p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand mb-3">Sample Event</p>
                  <h2 className="font-headline text-3xl text-on-lp-background">{sampleProps.eventName}</h2>
                  <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
                    <p><span className="font-semibold text-on-surface">Invitee:</span> {sampleProps.inviteeName}</p>
                    <p><span className="font-semibold text-on-surface">Date:</span> {sampleProps.eventDate}</p>
                    {sampleProps.location && <p><span className="font-semibold text-on-surface">Venue:</span> {sampleProps.location}</p>}
                    {sampleProps.time && <p><span className="font-semibold text-on-surface">Time:</span> {sampleProps.time}</p>}
                  </div>
                </div>

                <div className="rounded-[1.75rem] bg-surface-container-low border border-outline-variant/10 p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant mb-3">What this preview shows</p>
                  <div className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
                    <p>This is a public sample of the themed invitation page guests can open from their invite link.</p>
                    <p>Real events can still layer in uploaded template artwork, guest-specific names, seat assignments, tags, and live QR codes.</p>
                  </div>
                </div>

                <div className="rounded-[1.75rem] bg-[#171310] px-6 py-8 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/55 mb-3">Next step</p>
                  <h3 className="font-headline text-3xl leading-tight mb-4">Use this mood on a real event.</h3>
                  <p className="text-white/65 text-sm leading-relaxed mb-6">
                    Create an event, choose this template in the design flow, and personalize it with your own details.
                  </p>
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-on-lp-background text-sm font-semibold transition-colors hover:bg-[#f0ece6]"
                  >
                    Create Event
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PublicSiteFooter className="pt-0 border-t-0" />
      </main>
    </div>
  );
}
