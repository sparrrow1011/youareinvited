import Link from 'next/link';
import NavBar from '@/components/NavBar';
import PublicSiteFooter from '@/components/PublicSiteFooter';
import ThemeCardPreview from '@/components/ThemeCardPreview';
import { THEMES } from '@/themes';
import { getThemeSampleData, getThemeSampleProps } from '@/themes/samples';

export default function TemplatesPage() {
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
              <span className="material-symbols-outlined text-sm text-brand">auto_awesome_mosaic</span>
              Template Gallery
            </div>
            <h1 className="font-headline text-5xl md:text-7xl leading-tight text-on-lp-background">
              Browse the invitation styles your guests can experience.
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl leading-relaxed text-on-surface-variant">
              Preview the public invite themes in a standalone window, compare moods, and decide which visual language best fits the occasion.
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

        <section className="px-6 md:px-12 py-6 max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {THEMES.map((theme, index) => {
              const sampleProps = getThemeSampleProps(theme.id);
              const previewEventName = sampleProps?.eventName ?? theme.name;
              const previewThemeData = getThemeSampleData(theme.id);

              return (
                <article
                  key={theme.id}
                  className={`rounded-[2rem] border border-white/50 bg-white/70 shadow-sm backdrop-blur-xl overflow-hidden ${index % 2 === 1 ? 'lg:translate-y-8' : ''
                    }`}
                >
                  <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)] h-full">
                    <div className="relative min-h-[460px] border-b border-outline-variant/10 xl:border-b-0 xl:border-r">
                      <ThemeCardPreview
                        themeId={theme.id}
                        themeName={theme.name}
                        accentColor={theme.accentColor}
                        previewEventName={previewEventName}
                        previewThemeData={previewThemeData}
                      />
                    </div>

                    <div className="p-8 md:p-10 flex flex-col">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand mb-3">Theme Sample</p>
                        <h2 className="font-headline text-3xl md:text-4xl text-on-lp-background">{theme.name}</h2>
                        <p className="mt-4 text-base leading-relaxed text-on-surface-variant">{theme.description}</p>
                      </div>

                      <div className="mt-8 space-y-4">
                        <div className="rounded-[1.5rem] bg-surface-container-low border border-outline-variant/10 p-5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant mb-3">Sample Setup</p>
                          <div className="space-y-2 text-sm text-on-surface-variant">
                            <p><span className="font-semibold text-on-surface">Event:</span> {sampleProps?.eventName}</p>
                            <p><span className="font-semibold text-on-surface">Date:</span> {sampleProps?.eventDate}</p>
                            {sampleProps?.location && <p><span className="font-semibold text-on-surface">Venue:</span> {sampleProps.location}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-8 flex flex-col sm:flex-row gap-3">
                        <Link
                          href={`/templates/${theme.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-on-lp-background px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand"
                        >
                          Preview in New Window
                          <span className="material-symbols-outlined text-base">open_in_new</span>
                        </Link>
                        <Link
                          href="/signup"
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant/20 bg-transparent px-6 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:border-brand/20 hover:text-brand"
                        >
                          Use This Style
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="px-6 md:px-12 py-20 max-w-screen-2xl mx-auto">
          <div className="relative overflow-hidden rounded-[3rem] bg-[#171310] px-8 py-16 md:px-12 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(214,178,132,0.24),rgba(214,178,132,0.08)_22%,rgba(23,19,16,0)_52%)]" />
            <div className="absolute inset-0 opacity-[0.06] bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.18)_0px,rgba(255,255,255,0.18)_1px,transparent_1px,transparent_3px)]" />
            <div className="relative z-10 max-w-3xl mx-auto">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55 mb-3">Design Studio</p>
              <h2 className="font-headline text-4xl md:text-6xl text-white leading-tight mb-5">
                Choose a mood, then make it yours.
              </h2>
              <p className="text-white/65 text-lg leading-relaxed mb-8">
                Start with one of the styled invite themes, then layer in your event details, guest flow, and QR-based access.
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
