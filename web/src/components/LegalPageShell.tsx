import Link from 'next/link';
import LegalFooterLinks from '@/components/LegalFooterLinks';
import PublicSiteFooter from '@/components/PublicSiteFooter';

type LegalSection = {
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections?: readonly LegalSection[];
  children?: React.ReactNode;
};

export default function LegalPageShell({
  eyebrow,
  title,
  description,
  lastUpdated,
  sections = [],
  children,
}: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-lp-background text-on-surface font-body">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-20 -left-20 w-[520px] h-[520px] rounded-full bg-brand/10 blur-[140px]" />
        <div className="absolute top-1/3 -right-16 w-[420px] h-[420px] rounded-full bg-tertiary/10 blur-[120px]" />
        <div className="absolute -bottom-24 left-1/3 w-[460px] h-[460px] rounded-full bg-secondary-container/20 blur-[130px]" />
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/70 border border-white/60 text-sm font-semibold text-on-surface shadow-sm"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back Home
          </Link>

          <Link
            href="/support"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-on-lp-background text-white text-sm font-semibold shadow-sm"
          >
            <span className="material-symbols-outlined text-base">support_agent</span>
            Contact Support
          </Link>
        </div>

        <section className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/50 p-6 sm:p-8 lg:p-10 shadow-sm mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand mb-3">{eyebrow}</p>
          <h1 className="font-headline text-4xl sm:text-5xl leading-tight text-on-lp-background">{title}</h1>
          <p className="text-sm sm:text-base text-on-surface-variant mt-4 max-w-3xl leading-relaxed">{description}</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">event</span>
            Last updated {lastUpdated}
          </div>
        </section>

        <div className="space-y-5">
          {sections.map((section) => (
            <section
              key={section.title}
              className="bg-white/65 backdrop-blur-xl rounded-[1.75rem] border border-white/45 p-6 sm:p-8 shadow-sm"
            >
              <h2 className="font-headline text-2xl text-on-lp-background mb-4">{section.title}</h2>
              <div className="space-y-4">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
                    {paragraph}
                  </p>
                ))}
              </div>
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-5 space-y-3 text-sm sm:text-base text-on-surface-variant">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 leading-relaxed">
                      <span className="material-symbols-outlined text-brand text-lg leading-5">check_circle</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {children}
        </div>

        <footer className="mt-10 pb-6 text-center">
          <p className="text-xs text-on-surface-variant mb-3">
            Questions about these policies? Reach out at{' '}
            <a className="font-semibold text-brand hover:text-brand-dim transition-colors" href="mailto:support@youare-invited.com">
              support@youare-invited.com
            </a>
            .
          </p>
          <LegalFooterLinks className="text-xs text-on-surface-variant font-medium" />
        </footer>

        <PublicSiteFooter className="pt-6 border-t-0 px-0" />
      </main>
    </div>
  );
}
