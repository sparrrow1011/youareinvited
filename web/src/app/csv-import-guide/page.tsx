import Link from 'next/link';
import NavBar from '@/components/NavBar';
import PublicSiteFooter from '@/components/PublicSiteFooter';
import { GUIDE_CARDS } from '@/app/support/content';

const csvGuide = GUIDE_CARDS.find((guide) => guide.id === 'csv-guide');

const REQUIRED_COLUMNS = ['name', 'seat_number', 'tag'] as const;

const COMMON_MISTAKES = [
  'Changing the column names or order from the provided template.',
  'Leaving blank rows inside the sheet before exporting the CSV file.',
  'Saving as spreadsheet formats like XLSX instead of standard CSV.',
  'Using different field names such as seat or category instead of seat_number and tag.',
] as const;

export default function CsvImportGuidePage() {
  if (!csvGuide) {
    throw new Error('CSV guide content is missing.');
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
              <span className="material-symbols-outlined text-sm text-brand">upload_file</span>
              CSV Import Guide
            </div>
            <h1 className="font-headline text-5xl md:text-7xl leading-tight text-on-lp-background">
              Import a guest list cleanly, with the right structure from the start.
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl leading-relaxed text-on-surface-variant">
              The CSV import flow is the fastest way to move a real guest list into an event. Use the right template once, keep the columns exact, and the platform does the rest.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/guest-import-template.csv"
                className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-4 text-white text-lg font-semibold shadow-lg transition-colors hover:bg-brand-dim"
              >
                Download CSV Template
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center justify-center rounded-full border border-outline-variant/20 bg-white/60 px-8 py-4 text-on-lp-background text-lg font-semibold backdrop-blur-sm transition-colors hover:border-brand/20 hover:text-brand"
              >
                Visit Support
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 md:px-12 pb-10 max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)] gap-8 rounded-[2.75rem] border border-white/50 bg-white/70 p-8 md:p-10 shadow-sm backdrop-blur-xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand mb-3">Required structure</p>
              <h2 className="font-headline text-3xl md:text-4xl text-on-lp-background mb-4">
                Keep the template simple and the import will stay reliable.
              </h2>
              <p className="text-base md:text-lg leading-relaxed text-on-surface-variant">
                The import expects one guest per row and the exact field names used by the platform. This is not the place for custom columns or spreadsheet formatting experiments.
              </p>
            </div>

            <div className="rounded-[2rem] bg-surface-container-low p-6 border border-outline-variant/10">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant mb-5">Required columns</p>
              <div className="space-y-3">
                {REQUIRED_COLUMNS.map((column) => (
                  <div key={column} className="flex items-center justify-between rounded-2xl bg-white/70 border border-white/50 px-4 py-3">
                    <span className="font-mono text-sm text-on-lp-background">{column}</span>
                    <span className="material-symbols-outlined text-brand text-base">check_circle</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 md:px-12 py-10 max-w-screen-2xl mx-auto">
          <div className="rounded-[2.5rem] border border-white/50 bg-white/70 p-8 md:p-10 shadow-sm backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand mb-3">Step by step</p>
            <h2 className="font-headline text-3xl md:text-4xl text-on-lp-background mb-8">
              Follow the import flow exactly once, then repeat it with confidence.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {csvGuide.steps.map((step, index) => (
                <div key={step} className="rounded-[1.75rem] bg-surface-container-low border border-outline-variant/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-3">Step {index + 1}</p>
                  <p className="text-sm md:text-base leading-relaxed text-on-surface-variant">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 md:px-12 py-10 max-w-screen-2xl mx-auto">
          <div className="rounded-[2.5rem] border border-white/50 bg-white/70 p-8 md:p-10 shadow-sm backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand mb-3">Avoid these</p>
            <h2 className="font-headline text-3xl md:text-4xl text-on-lp-background mb-8">
              Most CSV failures come from formatting changes, not from the import tool itself.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {COMMON_MISTAKES.map((item) => (
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
                Download the template and move your real guest list into the platform.
              </h2>
              <p className="text-white/65 text-lg leading-relaxed mb-8">
                Once the CSV is clean, the rest of the guest flow gets much easier: invitations, sharing, and check-in all build on the same import.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/guest-import-template.csv"
                  className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-on-lp-background text-lg font-semibold transition-colors hover:bg-[#f0ece6]"
                >
                  Download Template
                </Link>
                <Link
                  href="/faq"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-4 text-white text-lg font-semibold transition-colors hover:bg-white/8"
                >
                  Read FAQ
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
